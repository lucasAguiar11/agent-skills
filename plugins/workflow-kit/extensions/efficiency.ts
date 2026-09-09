import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import {
  CAPSULE_MARKER,
  DEFAULT_GATE_CONFIG,
  EvidenceCache,
  PROTOCOL_ENTRY,
  WorkflowGate,
  createContextCapsule,
  parseWorkflowEvent,
  renderContextCapsule,
  type ContextCapsule,
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

  pi.on("tool_execution_start", async (_event, ctx) => {
    currentContext = ctx;
    recordToolStart(state.ledger);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    currentContext = ctx;
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

