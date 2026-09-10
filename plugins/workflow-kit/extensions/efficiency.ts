import { Type } from "typebox";
import { loadSessionMessagesReadOnly, type ExtensionAPI, type ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import type { SubagentLifecyclePayload } from "@oh-my-pi/pi-coding-agent/task";
import { TASK_SUBAGENT_LIFECYCLE_CHANNEL } from "@oh-my-pi/pi-coding-agent/task";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { WorkflowViewer } from "./workflow-tui";
import type { WorkflowTuiTranscript } from "./workflow-tui-model";
import {
  CAPSULE_MARKER,
  DEFAULT_GATE_CONFIG,
  EvidenceCache,
  PROTOCOL_ENTRY,
  WorkflowGate,
  createAutomaticSpawnRequests,
  createContextCapsule,
  parseWorkflowEvent,
  renderContextCapsule,
  type AgentLifecycleEvent,
  type ContextCapsule,
  type SpawnRequest,
  type WorkflowEvent,
} from "./protocol";
import {
  createLedger,
  formatLedger,
  recordCache,
  recordEvent,
  recordToolEnd,
  recordToolStart,
  recordUsage,
  type EfficiencyLedger,
} from "./ledger";

const STATUS_KEY = "workflow-efficiency";
const POLICY_MARKER = "<!-- workflow-efficiency:v1 -->";
const POLICY = `${POLICY_MARKER}
Prioridade desta sessão: minimize o tempo até uma entrega correta e verificada e o consumo total de tokens, incluindo ferramentas, subagents e retrabalho.
Reutilize contexto válido; prefira leituras direcionadas, respostas compactas e o menor número útil de agentes. Paralelize apenas trabalho independente autorizado.
Não repita exploração ou verificações ainda válidas. Entre agentes, reporte resultado, evidência, bloqueio e próximo passo, sem recapitulações.
Nunca omita requisitos, segurança, riscos, evidências ou validação obrigatória para economizar. Respeite as instruções superiores e o escopo do usuário.
Antes de delegar, carregue fast-subagent-protocol.`;

type ContextMessage = { role?: string; content?: unknown };
type ContextEvent = { messages: readonly ContextMessage[] };

interface RuntimeState {
  pending: boolean;
  events: WorkflowEvent[];
  gate: WorkflowGate;
  cache: EvidenceCache;
  ledger: EfficiencyLedger;
  capsule?: ContextCapsule;
}

interface AutomaticSpawn {
  request: SpawnRequest;
  toolCallId: string;
  index: number;
  childId?: string;
  committed: boolean;
  finished: boolean;
}
function trustedChildSessionFile(ctx: ExtensionContext, sessionFile: string): string | undefined {
  const parentFile = ctx.sessionManager.getSessionFile();
  if (!parentFile?.endsWith(".jsonl") || !sessionFile.endsWith(".jsonl")) return undefined;
  const artifactsDir = resolve(parentFile.slice(0, -".jsonl".length));
  const candidate = resolve(sessionFile);
  const childPath = relative(artifactsDir, candidate);
  if (!childPath || isAbsolute(childPath) || childPath.startsWith(`..${sep}`)) return undefined;
  return candidate;
}

async function loadWorkflowTranscripts(ctx: ExtensionContext, events: readonly WorkflowEvent[]): Promise<WorkflowTuiTranscript[]> {
  const files = new Map<string, { workstream: string; agent: string }>();
  for (const event of events) {
    if (event.type !== "agent.lifecycle" || !event.sessionFile) continue;
    const sessionFile = trustedChildSessionFile(ctx, event.sessionFile);
    if (sessionFile && !files.has(sessionFile)) files.set(sessionFile, { workstream: event.workstream, agent: event.agent });
  }
  return Promise.all([...files.entries()].map(async ([sessionFile, owner]) => {
    try {
      const messages = await loadSessionMessagesReadOnly(sessionFile);
      return { ...owner, sessionFile, detail: JSON.stringify(messages, null, 2) ?? "[]" };
    } catch (error) {
      return { ...owner, sessionFile, detail: "", error: error instanceof Error ? error.message : String(error) };
    }
  }));
}


function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function lifecyclePayload(value: unknown): SubagentLifecyclePayload | undefined {
  const item = objectValue(value);
  if (
    !item ||
    typeof item.id !== "string" ||
    typeof item.agent !== "string" ||
    typeof item.agentSource !== "string" ||
    !["started", "completed", "failed", "aborted"].includes(String(item.status)) ||
    !Number.isInteger(item.index) ||
    (item.index as number) < 0
  ) return undefined;
  return item as unknown as SubagentLifecyclePayload;
}
function lifecycleEvent(spawn: AutomaticSpawn, payload: SubagentLifecyclePayload, id = payload.id, failureReason?: string): AgentLifecycleEvent {
  const error = failureReason ?? (payload.status === "failed" ? "subagent failed" : payload.status === "aborted" ? "subagent aborted" : undefined);
  return {
    v: 1,
    type: "agent.lifecycle",
    id: `automatic-${id}-${payload.status}`,
    run: spawn.request.run,
    from: "omp",
    workstream: spawn.request.workstream,
    status: payload.status,
    agent: payload.agent,
    agentSource: payload.agentSource,
    task: spawn.request.goal,
    index: payload.index,
    ...(payload.parentToolCallId ? { parentToolCallId: payload.parentToolCallId } : {}),
    ...(payload.sessionFile ? { sessionFile: payload.sessionFile } : {}),
    ...(error ? { error } : {}),
    at: new Date().toISOString(),
  };
}

function taskResultItems(value: unknown): Array<{ index: number; failed: boolean; error?: string }> {
  const root = objectValue(value);
  const details = objectValue(root?.details);
  const results = details?.results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((raw, position) => {
    const item = objectValue(raw);
    if (!item) return [];
    const index = Number.isInteger(item.index) && (item.index as number) >= 0 ? item.index as number : position;
    const error = typeof item.error === "string" && item.error.trim() ? item.error.trim() : typeof item.stderr === "string" && item.stderr.trim() ? item.stderr.trim() : undefined;
    const failed = item.aborted === true || (typeof item.exitCode === "number" && item.exitCode !== 0) || Boolean(error);
    return [{ index, failed, ...(error ? { error } : {}) }];
  });
}

function taskIsRunning(value: unknown): boolean {
  const root = objectValue(value);
  const details = objectValue(root?.details);
  const asyncState = objectValue(details?.async)?.state;
  return asyncState === "running";
}

function markerInMessages(messages: readonly ContextMessage[], marker: string): boolean {
  return messages.some((message) => {
    if (typeof message.content === "string") return message.content.includes(marker);
    if (!Array.isArray(message.content)) return false;
    return message.content.some((block) => {
      if (typeof block !== "object" || block === null || !("text" in block)) return false;
      return typeof block.text === "string" && block.text.includes(marker);
    });
  });
}

function setEfficiencyStatus(ctx: ExtensionContext, state: "pending" | "active", ledger: EfficiencyLedger): void {
  const label = state === "active" ? "ON" : "...";
  const detail = formatLedger(ledger);
  try {
    const theme = ctx.ui.theme;
    const indicator = theme.fg(state === "active" ? "accent" : "dim", state === "active" ? "●" : "○");
    const title = theme.fg("muted", "eficiência: ");
    ctx.ui.setStatus(STATUS_KEY, `${indicator} ⚡ ${title}${label} · ${detail}`);
    return;
  } catch {
    // UI themes can be unavailable during startup.
  }
  ctx.ui.setStatus(STATUS_KEY, `${state === "active" ? "●" : "○"} ⚡ eficiência: ${label} · ${detail}`);
}

function resetState(state: RuntimeState): void {
  state.events = [];
  state.gate = new WorkflowGate(DEFAULT_GATE_CONFIG);
  state.cache = new EvidenceCache();
  state.ledger = createLedger();
  state.capsule = undefined;
}

function restoreState(ctx: ExtensionContext, state: RuntimeState): void {
  resetState(state);
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === PROTOCOL_ENTRY) {
      const parsed = parseWorkflowEvent(entry.data);
      if (parsed.event) {
        state.events.push(parsed.event);
        state.gate.replay([parsed.event]);
        state.cache.remember(parsed.event);
        recordEvent(state.ledger, parsed.event);
      }
    } else if (entry.type === "message") {
      if (entry.message.role === "user") state.ledger.turns += 1;
      if (entry.message.role === "toolResult") {
        recordToolStart(state.ledger);
        recordToolEnd(state.ledger, "isError" in entry.message && entry.message.isError === true);
      }
      recordUsage(state.ledger, entry.message);
    }
  }
  state.capsule = createContextCapsule(state.events);
}

function capsuleMessage(text: string) {
  return {
    role: "user" as const,
    content: [{ type: "text" as const, text }],
    timestamp: Date.now(),
  };
}

function ingestEvent(raw: unknown, ctx: ExtensionContext, state: RuntimeState, pi: ExtensionAPI): { ok: boolean; message: string; event?: WorkflowEvent } {
  const parsed = parseWorkflowEvent(raw);
  if (!parsed.event) return { ok: false, message: parsed.errors.join("; ") };

  const decision = state.gate.check(parsed.event);
  if (!decision.ok) return { ok: false, message: decision.reason };

  pi.appendEntry(PROTOCOL_ENTRY, parsed.event);
  state.gate.apply(parsed.event);
  state.events.push(parsed.event);
  state.cache.remember(parsed.event);
  recordEvent(state.ledger, parsed.event);
  state.capsule = createContextCapsule(state.events);
  return { ok: true, message: `accepted ${parsed.event.type} · ${parsed.event.workstream}`, event: parsed.event };
}

function appendAutomaticLifecycle(
  spawn: AutomaticSpawn,
  payload: SubagentLifecyclePayload,
  ctx: ExtensionContext,
  state: RuntimeState,
  pi: ExtensionAPI,
  emitted: Set<string>,
  failureReason?: string,
): boolean {
  if (payload.status !== "started" && spawn.finished) return true;
  const event = lifecycleEvent(spawn, payload, payload.id, failureReason);
  if (emitted.has(event.id)) return true;
  const result = ingestEvent(event, ctx, state, pi);
  if (!result.ok) return false;
  emitted.add(event.id);
  if (payload.status !== "started") spawn.finished = true;
  return true;
}

function automaticResultPayload(spawn: AutomaticSpawn, failed: boolean): SubagentLifecyclePayload {
  return {
    id: `${spawn.request.id}-result`,
    agent: spawn.request.to ?? "task",
    agentSource: "bundled",
    status: failed ? "failed" : "completed",
    index: spawn.index,
  };
}

export function registerEfficiency(pi: ExtensionAPI): void {
  const state: RuntimeState = {
    pending: true,
    events: [],
    gate: new WorkflowGate(DEFAULT_GATE_CONFIG),
    cache: new EvidenceCache(),
    ledger: createLedger(),
  };
  let currentContext: ExtensionContext | undefined;
  const markPending = (ctx: ExtensionContext) => {
    currentContext = ctx;
    state.pending = true;
    setEfficiencyStatus(ctx, "pending", state.ledger);
  };

  const sessionRun = (ctx: ExtensionContext): string => ctx.sessionManager.getSessionId() || ctx.cwd;
  const automaticByTool = new Map<string, AutomaticSpawn[]>();
  const automaticByChild = new Map<string, AutomaticSpawn>();
  const emittedLifecycle = new Set<string>();
  const buildAutomaticSpawns = (toolCallId: string, input: unknown, ctx: ExtensionContext): AutomaticSpawn[] =>
    createAutomaticSpawnRequests(toolCallId, sessionRun(ctx), input, state.gate.getAttempts()).map((request, index) => ({
      request,
      toolCallId,
      index,
      committed: false,
      finished: false,
    }));
  const commitAutomaticSpawns = (toolCallId: string, input: unknown, ctx: ExtensionContext): void => {
    const spawns = automaticByTool.get(toolCallId) ?? buildAutomaticSpawns(toolCallId, input, ctx);
    if (!spawns.length) return;
    automaticByTool.set(toolCallId, spawns);
    const pending = spawns.filter((spawn) => !spawn.committed);
    if (!pending.length) return;
    const decision = state.gate.checkBatch(pending.map((spawn) => spawn.request));
    if (!decision.ok) {
      ctx.ui.notify(`automatic workflow blocked: ${decision.reason}`, "error");
      return;
    }
    for (const spawn of pending) {
      const result = ingestEvent(spawn.request, ctx, state, pi);
      if (!result.ok) {
        ctx.ui.notify(`automatic workflow rejected: ${result.message}`, "error");
        return;
      }
      spawn.committed = true;
    }
  };
  const findAutomaticSpawn = (payload: SubagentLifecyclePayload): AutomaticSpawn | undefined => {
    const known = automaticByChild.get(payload.id);
    if (known) return known;
    if (payload.parentToolCallId) {
      const direct = automaticByTool.get(payload.parentToolCallId)?.find((spawn) => spawn.index === payload.index && !spawn.childId);
      if (direct) {
        direct.childId = payload.id;
        automaticByChild.set(payload.id, direct);
        return direct;
      }
    }
    for (const spawns of automaticByTool.values()) {
      const candidate = spawns.find((spawn) => !spawn.childId && spawn.index === payload.index && (spawn.request.to === payload.agent || spawn.request.goal === payload.description));
      if (candidate) {
        candidate.childId = payload.id;
        automaticByChild.set(payload.id, candidate);
        return candidate;
      }
    }
    return undefined;
  };
  const cleanupAutomaticSpawn = (spawn: AutomaticSpawn, childId?: string): void => {
    if (childId) automaticByChild.delete(childId);
    const spawns = automaticByTool.get(spawn.toolCallId);
    if (spawns?.every((item) => item.finished)) automaticByTool.delete(spawn.toolCallId);
  };

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "task") return;
    const spawns = buildAutomaticSpawns(event.toolCallId, event.input, ctx);
    if (!spawns.length) return;
    const decision = state.gate.checkBatch(spawns.map((spawn) => spawn.request));
    if (!decision.ok) return { block: true, reason: `workflow gate: ${decision.reason}` };
    automaticByTool.set(event.toolCallId, spawns);
  });

  pi.registerTool({
    name: "workflow_event",
    label: "Workflow Event",
    description: "Record one validated workflow event as JSON. Use for spawn requests, checkpoints, handoffs, verdicts, and blockers.",
    promptSnippet: "Record a workflow event with evidence and verification",
    parameters: Type.Object({
      payload: Type.String({ description: "One JSON workflow event, protocol version 1" }),
    }),
    async execute(_toolCallId, params) {
      if (!currentContext) return { content: [{ type: "text", text: "workflow event rejected: no active session" }], isError: true };
      const result = ingestEvent(params.payload, currentContext, state, pi);
      return { content: [{ type: "text", text: result.message }], details: result, isError: !result.ok };
    },
  });
  pi.registerTool({
    name: "workflow_lookup",
    label: "Workflow Cache",
    description: "Reuse verified workflow evidence when source files and environment still match.",
    promptSnippet: "Look up reusable verified workflow evidence before investigating",
    parameters: Type.Object({
      query: Type.String({ description: "Exact goal or investigation query" }),
      scope: Type.Array(Type.String(), { description: "Relevant repository paths" }),
    }),
    async execute(_toolCallId, params) {
      if (!currentContext) {
        recordCache(state.ledger, false);
        return { content: [{ type: "text", text: "cache miss: no active session" }], isError: false };
      }
      const hit = state.cache.lookup(params.query, params.scope, currentContext.cwd);
      recordCache(state.ledger, Boolean(hit));
      if (!hit) return { content: [{ type: "text", text: "cache miss: no current evidence matched" }], details: { hit: false }, isError: false };
      return {
        content: [{ type: "text", text: `cache hit: ${hit.evidence.length} evidence refs · ${hit.key}` }],
        details: { hit: true, ...hit },
        isError: false,
      };
    },
  });
  pi.events.on(TASK_SUBAGENT_LIFECYCLE_CHANNEL, (value) => {
    const payload = lifecyclePayload(value);
    const spawn = payload ? findAutomaticSpawn(payload) : undefined;
    if (!payload || !spawn?.committed || !currentContext) return;
    appendAutomaticLifecycle(spawn, payload, currentContext, state, pi, emittedLifecycle);
    if (payload.status !== "started" && spawn.finished) cleanupAutomaticSpawn(spawn, payload.id);
  });

  pi.on("tool_approval_resolved", async (event) => {
    if (!event.approved) automaticByTool.delete(event.toolCallId);
  });

  pi.registerCommand("workflow-event", {
    description: "Validate and persist one workflow event JSON object",
    handler: async (args, ctx) => {
      const result = ingestEvent(args.trim(), ctx, state, pi);
      ctx.ui.notify(result.message, result.ok ? "info" : "error");
    },
  });

  pi.registerCommand("efficiency", {
    description: "Show workflow efficiency ledger",
    handler: async (_args, ctx) => {
      ctx.ui.notify(formatLedger(state.ledger), "info");
    },
  });

  pi.registerCommand("workflow", {
    description: "Inspect session messages, tasks, and agents",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("The workflow TUI requires interactive mode", "error");
        return;
      }
      let transcripts = await loadWorkflowTranscripts(ctx, state.events);
      const refreshTranscripts = async (): Promise<void> => {
        transcripts = await loadWorkflowTranscripts(ctx, state.events);
      };
      const getSnapshot = () => ({
        entries: ctx.sessionManager.getBranch(),
        events: state.events,
        ledger: state.ledger,
        transcripts,
      });
      await ctx.ui.custom<void>((tui, theme, keybindings, done) => new WorkflowViewer(
        getSnapshot,
        () => tui.requestRender(),
        (color, text) => theme.fg(color as never, text),
        keybindings,
        () => done(undefined),
        refreshTranscripts,
      ), {
        overlay: true,
        overlayOptions: {
          anchor: "center",
          width: "90%",
          maxHeight: "92%",
          margin: 1,
        },
      });
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    currentContext = ctx;
    restoreState(ctx, state);
    markPending(ctx);
  });

  pi.on("session.compacting", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("session_before_switch", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("session_before_branch", async (_event, ctx) => {
    markPending(ctx);
  });

  pi.on("turn_start", async (_event, ctx) => {
    currentContext = ctx;
    state.ledger.turns += 1;
    setEfficiencyStatus(ctx, "active", state.ledger);
  });

  pi.on("turn_end", async (event, ctx) => {
    currentContext = ctx;
    recordUsage(state.ledger, event.message);
    setEfficiencyStatus(ctx, "active", state.ledger);
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    currentContext = ctx;
    if (event.toolName === "task") commitAutomaticSpawns(event.toolCallId, event.args, ctx);
    recordToolStart(state.ledger);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    currentContext = ctx;
    if (event.toolName === "task" && !taskIsRunning(event.result)) {
      const spawns = automaticByTool.get(event.toolCallId) ?? [];
      const results = taskResultItems(event.result);
      for (const spawn of spawns) {
        if (spawn.finished) continue;
        const result = results.find((item) => item.index === spawn.index);
        const failed = event.isError || result?.failed === true;
        appendAutomaticLifecycle(
          spawn,
          automaticResultPayload(spawn, failed),
          ctx,
          state,
          pi,
          emittedLifecycle,
          result?.error,
        );
        if (spawn.finished) cleanupAutomaticSpawn(spawn);
      }
      automaticByTool.delete(event.toolCallId);
    }
    recordToolEnd(state.ledger, event.isError);
  });

  pi.on("context", async (event: ContextEvent, ctx) => {
    currentContext = ctx;
    if (state.pending) {
      restoreState(ctx, state);
      state.pending = false;
    }

    const messages = [...event.messages];
    if (!markerInMessages(messages, POLICY_MARKER)) messages.push(capsuleMessage(POLICY));
    if (state.capsule && !markerInMessages(messages, CAPSULE_MARKER)) messages.push(capsuleMessage(renderContextCapsule(state.capsule)));
    setEfficiencyStatus(ctx, "active", state.ledger);
    return messages.length === event.messages.length ? undefined : { messages };
  });
}

