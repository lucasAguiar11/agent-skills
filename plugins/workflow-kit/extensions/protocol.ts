import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const PROTOCOL_VERSION = 1 as const;
export const PROTOCOL_ENTRY = "workflow-kit:protocol:v1";
export const CAPSULE_MARKER = "<!-- workflow-efficiency:capsule:v1 -->";

type EventType = "spawn.request" | "checkpoint" | "handoff" | "verdict" | "blocked" | "agent.lifecycle";
type AgentLifecycleStatus = "started" | "completed" | "failed" | "aborted";
type VerificationStatus = "passed" | "failed" | "skipped";

export interface EvidenceRef {
  path: string;
  sha256: string;
  bytes: number;
  lineRange?: [number, number];
}

export interface EnvironmentFingerprint {
  cwd: string;
  runtime: string;
  platform: string;
  env: Record<string, string>;
  files: EvidenceRef[];
  digest: string;
}

export interface VerificationRef {
  command: string;
  status: VerificationStatus;
  cwd: string;
  environment: EnvironmentFingerprint;
  evidence: EvidenceRef[];
  reason?: string;
}

interface CommonEvent {
  v: typeof PROTOCOL_VERSION;
  id: string;
  run: string;
  from: string;
  workstream: string;
  to?: string;
  at?: string;
}

export interface SpawnRequest extends CommonEvent {
  type: "spawn.request";
  goal: string;
  scope: string[];
  tier: "fast" | "standard" | "high";
  budget: { maxTokens?: number; maxToolCalls?: number; maxRetries?: number };
  attempt: number;
  reason: string;
}

export interface CheckpointEvent extends CommonEvent {
  type: "checkpoint";
  goal: string;
  changed: string[];
  evidence: EvidenceRef[];
  open: string[];
  next: string;
}
export interface AgentLifecycleEvent extends CommonEvent {
  type: "agent.lifecycle";
  status: AgentLifecycleStatus;
  agent: string;
  agentSource: string;
  task: string;
  index: number;
  parentToolCallId?: string;
  sessionFile?: string;
  error?: string;
}

export interface HandoffEvent extends CommonEvent {
  type: "handoff";
  goal: string;
  scope: string[];
  status: "completed" | "blocked" | "failed";
  evidence: EvidenceRef[];
  verification: VerificationRef[];
  next?: string;
  notes?: string;
}

export interface VerdictEvent extends CommonEvent {
  type: "verdict";
  status: "validated" | "refuted";
  evidence: EvidenceRef[];
  verification: VerificationRef[];
  findings?: string[];
}

export interface BlockedEvent extends CommonEvent {
  type: "blocked";
  reason: string;
  unblockCondition: string;
  evidence: EvidenceRef[];
}

export type WorkflowEvent = SpawnRequest | CheckpointEvent | AgentLifecycleEvent | HandoffEvent | VerdictEvent | BlockedEvent;

export interface ContextCapsule {
  v: typeof PROTOCOL_VERSION;
  type: "context.capsule";
  goal?: string;
  changed: string[];
  evidence: EvidenceRef[];
  open: string[];
  next?: string;
}

export interface GateConfig {
  maxActiveAgents: number;
  maxRetries: number;
}

export const DEFAULT_GATE_CONFIG: GateConfig = { maxActiveAgents: 2, maxRetries: 1 };

function object(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
  return value.trim();
}

function textArray(value: unknown, name: string, optional = false): string[] {
  if (value === undefined && optional) return [];
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value.map((item, index) => text(item, `${name}[${index}]`));
}

function integer(value: unknown, name: string, zero = false): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (zero ? (value as number) < 0 : (value as number) <= 0)) {
    throw new Error(`${name} must be an integer ${zero ? "greater than or equal to" : "greater than"} zero`);
  }
  return value as number;
}

function json(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    throw new Error("event must be valid JSON");
  }
}

function evidence(value: unknown, name = "evidence"): EvidenceRef[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value.map((raw, index) => {
    const item = object(raw, `${name}[${index}]`);
    const sha = text(item.sha256, `${name}[${index}].sha256`).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(sha)) throw new Error(`${name}[${index}].sha256 must be SHA-256`);
    const range = item.lineRange;
    let lineRange: [number, number] | undefined;
    if (range !== undefined) {
      if (!Array.isArray(range) || range.length !== 2) throw new Error(`${name}[${index}].lineRange must be [start, end]`);
      const start = integer(range[0], `${name}[${index}].lineRange[0]`);
      const end = integer(range[1], `${name}[${index}].lineRange[1]`);
      if (start === undefined || end === undefined || end < start) throw new Error(`${name}[${index}].lineRange is invalid`);
      lineRange = [start, end];
    }
    return { path: text(item.path, `${name}[${index}].path`), sha256: sha, bytes: integer(item.bytes, `${name}[${index}].bytes`, true) ?? 0, ...(lineRange ? { lineRange } : {}) };
  });
}

function environment(value: unknown, name: string): EnvironmentFingerprint {
  const item = object(value, name);
  const envValue = object(item.env, `${name}.env`);
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(envValue)) {
    const hash = text(value, `${name}.env.${key}`).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`${name}.env.${key} must be SHA-256`);
    env[key] = hash;
  }
  const digest = text(item.digest, `${name}.digest`).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error(`${name}.digest must be SHA-256`);
  return { cwd: text(item.cwd, `${name}.cwd`), runtime: text(item.runtime, `${name}.runtime`), platform: text(item.platform, `${name}.platform`), env, files: evidence(item.files, `${name}.files`), digest };
}

function verifications(value: unknown): VerificationRef[] {
  if (!Array.isArray(value)) throw new Error("verification must be an array");
  return value.map((raw, index) => {
    const item = object(raw, `verification[${index}]`);
    const status = text(item.status, `verification[${index}].status`) as VerificationStatus;
    if (!["passed", "failed", "skipped"].includes(status)) throw new Error(`verification[${index}].status is invalid`);
    return {
      command: text(item.command, `verification[${index}].command`),
      status,
      cwd: text(item.cwd, `verification[${index}].cwd`),
      environment: environment(item.environment, `verification[${index}].environment`),
      evidence: evidence(item.evidence, `verification[${index}].evidence`),
      ...(item.reason === undefined ? {} : { reason: text(item.reason, `verification[${index}].reason`) }),
    };
  });
}

function common(item: Record<string, unknown>): CommonEvent {
  if (item.v !== PROTOCOL_VERSION) throw new Error(`v must be ${PROTOCOL_VERSION}`);
  return {
    v: PROTOCOL_VERSION,
    id: text(item.id, "id"),
    run: text(item.run, "run"),
    from: text(item.from, "from"),
    workstream: text(item.workstream, "workstream"),
    ...(item.to === undefined ? {} : { to: text(item.to, "to") }),
    ...(item.at === undefined ? {} : { at: text(item.at, "at") }),
  };
}

export function parseWorkflowEvent(input: unknown): { event?: WorkflowEvent; errors: string[] } {
  try {
    const item = object(typeof input === "string" ? json(input) : input, "event");
    const base = common(item);
    const type = text(item.type, "type") as EventType;
    if (!["spawn.request", "agent.lifecycle", "checkpoint", "handoff", "verdict", "blocked"].includes(type)) throw new Error("type is invalid");

    if (type === "spawn.request") {
      const budget = object(item.budget, "budget");
      const parsedBudget = {
        ...(integer(budget.maxTokens, "budget.maxTokens") === undefined ? {} : { maxTokens: integer(budget.maxTokens, "budget.maxTokens") }),
        ...(integer(budget.maxToolCalls, "budget.maxToolCalls") === undefined ? {} : { maxToolCalls: integer(budget.maxToolCalls, "budget.maxToolCalls") }),
        ...(integer(budget.maxRetries, "budget.maxRetries", true) === undefined ? {} : { maxRetries: integer(budget.maxRetries, "budget.maxRetries", true) }),
      };
      const tier = text(item.tier, "tier") as SpawnRequest["tier"];
      if (!["fast", "standard", "high"].includes(tier)) throw new Error("tier is invalid");
      return { event: { ...base, type, goal: text(item.goal, "goal"), scope: textArray(item.scope, "scope"), tier, budget: parsedBudget, attempt: integer(item.attempt, "attempt", true) ?? 0, reason: text(item.reason, "reason") }, errors: [] };
    }
    if (type === "agent.lifecycle") {
      const status = text(item.status, "status") as AgentLifecycleEvent["status"];
      if (!["started", "completed", "failed", "aborted"].includes(status)) throw new Error("lifecycle status is invalid");
      return {
        event: {
          ...base,
          type,
          status,
          agent: text(item.agent, "agent"),
          agentSource: text(item.agentSource, "agentSource"),
          task: text(item.task, "task"),
          index: integer(item.index, "index", true) ?? 0,
          ...(item.parentToolCallId === undefined ? {} : { parentToolCallId: text(item.parentToolCallId, "parentToolCallId") }),
          ...(item.sessionFile === undefined ? {} : { sessionFile: text(item.sessionFile, "sessionFile") }),
          ...(item.error === undefined ? {} : { error: text(item.error, "error") }),
        },
        errors: [],
      };
    }

    if (type === "checkpoint") {
      return { event: { ...base, type, goal: text(item.goal, "goal"), changed: textArray(item.changed, "changed"), evidence: evidence(item.evidence), open: textArray(item.open, "open"), next: text(item.next, "next") }, errors: [] };
    }

    if (type === "handoff") {
      const status = text(item.status, "status") as HandoffEvent["status"];
      if (!["completed", "blocked", "failed"].includes(status)) throw new Error("handoff status is invalid");
      const refs = evidence(item.evidence);
      const checks = verifications(item.verification);
      if (status === "completed" && (!refs.length || !checks.some((check) => check.status === "passed"))) throw new Error("completed handoff requires evidence and a passed verification");
      return { event: { ...base, type, goal: text(item.goal, "goal"), scope: textArray(item.scope, "scope"), status, evidence: refs, verification: checks, ...(item.next === undefined ? {} : { next: text(item.next, "next") }), ...(item.notes === undefined ? {} : { notes: text(item.notes, "notes") }) }, errors: [] };
    }

    if (type === "verdict") {
      const status = text(item.status, "status") as VerdictEvent["status"];
      if (!["validated", "refuted"].includes(status)) throw new Error("verdict status is invalid");
      const refs = evidence(item.evidence);
      const checks = verifications(item.verification);
      if (status === "validated" && (!refs.length || !checks.some((check) => check.status === "passed"))) throw new Error("validated verdict requires evidence and a passed verification");
      return { event: { ...base, type, status, evidence: refs, verification: checks, findings: textArray(item.findings, "findings", true) }, errors: [] };
    }

    return { event: { ...base, type, reason: text(item.reason, "reason"), unblockCondition: text(item.unblockCondition, "unblockCondition"), evidence: evidence(item.evidence) }, errors: [] };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "invalid workflow event"] };
  }
}

export interface AutomaticTask {
  index: number;
  name?: string;
  agent: string;
  task: string;
  effort?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function extractAutomaticTaskItems(input: unknown): AutomaticTask[] {
  const root = record(input);
  if (!root) return [];
  const rawItems = Array.isArray(root.tasks) ? root.tasks : [root];
  return rawItems.flatMap((raw, index) => {
    const item = record(raw);
    const task = optionalText(item?.task);
    if (!task) return [];
    return [{
      index,
      ...(optionalText(item.name) ? { name: optionalText(item.name) } : {}),
      agent: optionalText(item.agent) ?? "task",
      task,
      ...(optionalText(item.effort) ? { effort: optionalText(item.effort) } : {}),
    }];
  });
}

function automaticTier(effort: string | undefined): SpawnRequest["tier"] {
  return effort === "hi" ? "high" : effort === "lo" ? "fast" : "standard";
}

export function createAutomaticSpawnRequests(
  toolCallId: string,
  run: string,
  input: unknown,
  previousAttempts: ReadonlyMap<string, number>,
): SpawnRequest[] {
  return extractAutomaticTaskItems(input).map((item) => {
    const workstream = item.name ?? `${item.agent}-${toolCallId}-${item.index}`;
    const previousAttempt = previousAttempts.get(`${run}/${workstream}`);
    return {
      v: PROTOCOL_VERSION,
      type: "spawn.request",
      id: `automatic-${toolCallId}-${item.index}`,
      run,
      from: "omp",
      workstream,
      goal: item.task,
      scope: [],
      tier: automaticTier(item.effort),
      budget: {},
      attempt: previousAttempt === undefined ? 0 : previousAttempt + 1,
      reason: "automatic capture from task tool",
      ...(item.agent ? { to: item.agent } : {}),
      at: new Date().toISOString(),
    };
  });
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value !== null) {
    const item = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonical(item[key])]));
  }
  return value;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function digestObject(value: unknown): string {
  return sha256(JSON.stringify(canonical(value)));
}

function filePath(cwd: string, input: string): { path: string; absolute: string } {
  const root = realpathSync(resolve(cwd));
  const absolute = realpathSync(resolve(root, input));
  const path = relative(root, absolute);
  if (!path || path.startsWith(`..${sep}`) || isAbsolute(path)) throw new Error(`evidence path escapes workspace: ${input}`);
  return { path: path.split(sep).join("/"), absolute };
}

export function createEvidenceRef(cwd: string, input: string, lineRange?: [number, number]): EvidenceRef {
  const file = filePath(cwd, input);
  if (!statSync(file.absolute).isFile()) throw new Error(`evidence path is not a file: ${input}`);
  const content = readFileSync(file.absolute);
  return { path: file.path, sha256: sha256(content), bytes: content.byteLength, ...(lineRange ? { lineRange } : {}) };
}

export function verifyEvidenceRef(cwd: string, ref: EvidenceRef): boolean {
  try {
    const current = createEvidenceRef(cwd, ref.path);
    return current.bytes === ref.bytes && current.sha256 === ref.sha256;
  } catch {
    return false;
  }
}

export function buildEvidenceCacheKey(query: string, scope: string[], refs: EvidenceRef[]): string {
  return digestObject({ v: PROTOCOL_VERSION, query, scope: [...scope].sort(), evidence: [...refs].sort((a, b) => a.path.localeCompare(b.path)) });
}

export function createEnvironmentFingerprint(cwd: string, envKeys: string[] = [], files: EvidenceRef[] = []): EnvironmentFingerprint {
  const env: Record<string, string> = {};
  for (const key of [...new Set(envKeys)].sort()) env[key] = sha256(process.env[key] ?? "<unset>");
  const fingerprint = { cwd: resolve(cwd), runtime: process.version, platform: `${platform()}-${arch()}-${release()}`, env, files: [...files].sort((a, b) => a.path.localeCompare(b.path)) };
  return { ...fingerprint, digest: digestObject(fingerprint) };
}

export function buildVerificationCacheKey(ref: VerificationRef): string {
  return digestObject({ v: PROTOCOL_VERSION, command: ref.command, cwd: ref.cwd, environment: ref.environment, evidence: ref.evidence });
}

function eventEvidence(event: WorkflowEvent): EvidenceRef[] {
  return "evidence" in event ? event.evidence : [];
}

export function createContextCapsule(events: readonly WorkflowEvent[]): ContextCapsule | undefined {
  if (!events.length) return undefined;
  const changed = new Set<string>();
  const refs = new Map<string, EvidenceRef>();
  let goal: string | undefined;
  let open: string[] = [];
  let next: string | undefined;

  for (const event of events.slice(-12)) {
    if ("goal" in event) goal = event.goal;
    if (event.type === "checkpoint") event.changed.forEach((item) => changed.add(item));
    if (event.type === "handoff") event.scope.forEach((item) => changed.add(item));
    if (event.type === "checkpoint") open = event.open;
    if (event.type === "blocked") open = [event.reason];
    if (event.type === "agent.lifecycle" && event.status !== "started") {
      open = event.status === "completed" ? [] : [`${event.agent} ${event.status}: ${event.error ?? event.task}`];
      next = event.status === "completed" ? "coordinator review" : "inspect failure or retry";
    }
    if (event.type === "checkpoint" || event.type === "handoff") next = event.next;
    if (event.type === "blocked") next = event.unblockCondition;
    for (const ref of eventEvidence(event)) refs.set(`${ref.path}:${ref.sha256}`, ref);
  }

  return { v: PROTOCOL_VERSION, type: "context.capsule", ...(goal ? { goal } : {}), changed: [...changed].slice(-8), evidence: [...refs.values()].slice(-6), open: open.slice(-4), ...(next ? { next } : {}) };
}

export function renderContextCapsule(capsule: ContextCapsule): string {
  const lines = [CAPSULE_MARKER, "Workflow capsule:"];
  if (capsule.goal) lines.push(`goal: ${capsule.goal}`);
  if (capsule.changed.length) lines.push(`changed: ${capsule.changed.join(", ")}`);
  if (capsule.evidence.length) lines.push(`evidence: ${capsule.evidence.map((ref) => `${ref.path}@${ref.sha256.slice(0, 12)}`).join(", ")}`);
  if (capsule.open.length) lines.push(`open: ${capsule.open.join(" | ")}`);
  if (capsule.next) lines.push(`next: ${capsule.next}`);
  return lines.join("\n");
}

export interface EvidenceCacheHit {
  key: string;
  query: string;
  scope: string[];
  evidence: EvidenceRef[];
  verification: VerificationRef[];
}

function cacheScope(event: CheckpointEvent | HandoffEvent): string[] {
  return event.type === "checkpoint" ? event.changed : event.scope;
}

function cacheKey(query: string, scope: string[], refs: EvidenceRef[], checks: VerificationRef[]): string {
  return digestObject({
    v: PROTOCOL_VERSION,
    query,
    scope: [...scope].sort(),
    evidence: [...refs].sort((a, b) => a.path.localeCompare(b.path)),
    verification: checks.map(buildVerificationCacheKey).sort(),
  });
}

function verificationStillValid(check: VerificationRef): boolean {
  return check.status !== "passed" ||
    check.environment.files.every((ref) => verifyEvidenceRef(check.environment.cwd, ref)) &&
    check.evidence.every((ref) => verifyEvidenceRef(check.cwd, ref)) &&
    createEnvironmentFingerprint(check.environment.cwd, Object.keys(check.environment.env), check.environment.files).digest === check.environment.digest;
}

export class EvidenceCache {
  private readonly entries: EvidenceCacheHit[] = [];

  remember(event: WorkflowEvent): void {
    if (event.type !== "checkpoint" && event.type !== "handoff") return;
    if (!event.evidence.length) return;
    const scope = cacheScope(event);
    const entry: EvidenceCacheHit = {
      key: cacheKey(event.goal, scope, event.evidence, event.type === "handoff" ? event.verification : []),
      query: event.goal,
      scope,
      evidence: event.evidence,
      verification: event.type === "handoff" ? event.verification : [],
    };
    this.entries.push(entry);
    if (this.entries.length > 32) this.entries.shift();
  }

  lookup(query: string, scope: string[], cwd: string): EvidenceCacheHit | undefined {
    const wantedScope = [...scope].sort();
    for (const entry of [...this.entries].reverse()) {
      if (entry.query !== query || JSON.stringify([...entry.scope].sort()) !== JSON.stringify(wantedScope)) continue;
      if (!entry.evidence.every((ref) => verifyEvidenceRef(cwd, ref))) continue;
      if (!entry.verification.every(verificationStillValid)) continue;
      return entry;
    }
    return undefined;
  }

  clear(): void {
    this.entries.length = 0;
  }
}

function key(event: WorkflowEvent): string {
  return `${event.run}/${event.workstream}`;
}

export class WorkflowGate {
  private readonly active = new Set<string>();
  private readonly seen = new Set<string>();
  private readonly retryable = new Set<string>();
  private readonly attempts = new Map<string, number>();
  private readonly config: GateConfig;

  constructor(config: GateConfig = DEFAULT_GATE_CONFIG) {
    this.config = config;
  }

  check(event: WorkflowEvent): { ok: true } | { ok: false; reason: string } {
    const id = key(event);
    if (event.type === "spawn.request") {
      if (this.active.has(id)) return { ok: false, reason: `workstream already active: ${event.workstream}` };
      if (this.active.size >= this.config.maxActiveAgents) return { ok: false, reason: `active agent limit reached: ${this.config.maxActiveAgents}` };
      if (event.attempt > this.config.maxRetries) return { ok: false, reason: `retry limit reached: ${this.config.maxRetries}` };
      if (this.seen.has(id) && (!event.attempt || !this.retryable.has(id))) return { ok: false, reason: "retry requires a refuted verdict" };
      if (event.attempt > 0 && !this.retryable.has(id)) return { ok: false, reason: "retry requires a refuted verdict" };
      const previousAttempt = this.attempts.get(id);
      if (previousAttempt !== undefined && event.attempt !== previousAttempt + 1) return { ok: false, reason: `retry attempt must increment from ${previousAttempt}` };
      return { ok: true };
    }
    if ((event.type === "agent.lifecycle" || event.type === "verdict" || event.type === "handoff" || event.type === "blocked") && !this.seen.has(id)) return { ok: false, reason: `unknown workstream: ${event.workstream}` };
    return { ok: true };
  }

  checkBatch(events: readonly WorkflowEvent[]): { ok: true } | { ok: false; reason: string } {
    const snapshot = new WorkflowGate(this.config);
    snapshot.active.clear();
    this.active.forEach((item) => snapshot.active.add(item));
    snapshot.seen.clear();
    this.seen.forEach((item) => snapshot.seen.add(item));
    snapshot.retryable.clear();
    this.retryable.forEach((item) => snapshot.retryable.add(item));
    snapshot.attempts.clear();
    this.attempts.forEach((attempt, id) => snapshot.attempts.set(id, attempt));
    for (const event of events) {
      const decision = snapshot.check(event);
      if (!decision.ok) return decision;
      snapshot.apply(event);
    }
    return { ok: true };
  }

  apply(event: WorkflowEvent): void {
    const id = key(event);
    if (event.type === "spawn.request") {
      this.active.add(id);
      this.seen.add(id);
      this.retryable.delete(id);
      this.attempts.set(id, event.attempt);
    } else if (event.type === "agent.lifecycle") {
      this.seen.add(id);
      if (event.status !== "started") {
        this.active.delete(id);
        if (event.status === "failed" || event.status === "aborted") this.retryable.add(id);
        else this.retryable.delete(id);
      }
    } else if (event.type === "verdict") {
      this.active.delete(id);
      if (event.status === "refuted") this.retryable.add(id);
      else this.retryable.delete(id);
    } else if (event.type === "handoff" || event.type === "blocked") {
      this.active.delete(id);
    }
  }

  replay(events: readonly WorkflowEvent[]): void {
    events.forEach((event) => this.apply(event));
  }

  getActiveCount(): number {
    return this.active.size;
  }

  getAttempts(): ReadonlyMap<string, number> {
    return this.attempts;
  }
}
