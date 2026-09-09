import type { WorkflowEvent } from "./protocol";

export interface EfficiencyLedger {
  turns: number;
  toolCalls: number;
  toolErrors: number;
  launches: number;
  retries: number;
  protocolEvents: number;
  validated: number;
  refuted: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
  cacheHits: number;
  cacheMisses: number;
  usageAvailable: boolean;
}

export function createLedger(): EfficiencyLedger {
  return {
    turns: 0,
    toolCalls: 0,
    toolErrors: 0,
    launches: 0,
    retries: 0,
    protocolEvents: 0,
    validated: 0,
    refuted: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cost: 0,
    cacheHits: 0,
    cacheMisses: 0,
    usageAvailable: false,
  };
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function recordUsage(ledger: EfficiencyLedger, message: unknown): void {
  if (typeof message !== "object" || message === null || !("usage" in message)) return;
  const usage = message.usage;
  if (typeof usage !== "object" || usage === null) return;
  const item = Object.fromEntries(Object.entries(usage));
  const input = numberValue(item.input);
  const output = numberValue(item.output);
  const cacheRead = numberValue(item.cacheRead);
  const cacheWrite = numberValue(item.cacheWrite);
  let costValue: number | undefined;
  if ("cost" in item && typeof item.cost === "object" && item.cost !== null && "total" in item.cost) {
    costValue = numberValue(item.cost.total);
  }
  if ([input, output, cacheRead, cacheWrite, costValue].some((value) => value !== undefined)) ledger.usageAvailable = true;
  if (input !== undefined) ledger.inputTokens += input;
  if (output !== undefined) ledger.outputTokens += output;
  if (cacheRead !== undefined) ledger.cacheReadTokens += cacheRead;
  if (cacheWrite !== undefined) ledger.cacheWriteTokens += cacheWrite;
  if (costValue !== undefined) ledger.cost += costValue;
}

export function recordToolStart(ledger: EfficiencyLedger): void {
  ledger.toolCalls += 1;
}

export function recordToolEnd(ledger: EfficiencyLedger, isError: boolean): void {
  if (isError) ledger.toolErrors += 1;
}

export function recordCache(ledger: EfficiencyLedger, hit: boolean): void {
  if (hit) ledger.cacheHits += 1;
  else ledger.cacheMisses += 1;
}

export function recordEvent(ledger: EfficiencyLedger, event: WorkflowEvent): void {
  ledger.protocolEvents += 1;
  if (event.type === "spawn.request") {
    ledger.launches += 1;
    if (event.attempt > 0) ledger.retries += 1;
  } else if (event.type === "verdict") {
    if (event.status === "validated") ledger.validated += 1;
    else ledger.refuted += 1;
  }
}

export function formatLedger(ledger: EfficiencyLedger): string {
  const tokens = ledger.usageAvailable
    ? `in ${ledger.inputTokens} · out ${ledger.outputTokens}`
    : "tokens unavailable";
  return `${tokens} · tools ${ledger.toolCalls} (${ledger.toolErrors} errors) · launches ${ledger.launches} · retries ${ledger.retries} · verdicts ${ledger.validated}/${ledger.refuted} · cache ${ledger.cacheHits}/${ledger.cacheMisses} · events ${ledger.protocolEvents}`;
}
