import assert from "node:assert/strict";
import test from "node:test";
import { createLedger, formatLedger, recordCache, recordEvent, recordToolEnd, recordToolStart, recordUsage } from "./ledger.ts";

const ref = { path: "src/example.ts", sha256: "a".repeat(64), bytes: 10 };
const environment = { cwd: "/workspace", runtime: "node v22", platform: "test", env: {}, files: [], digest: "b".repeat(64) };
const passed = { command: "node --test", status: "passed", cwd: "/workspace", environment, evidence: [] };

test("records real usage, cache outcomes, and tool failures", () => {
  const ledger = createLedger();
  recordUsage(ledger, { usage: { input: 12, output: 7, cacheRead: 3, cacheWrite: 2, cost: { total: 0.01 } } });
  recordCache(ledger, true);
  recordCache(ledger, false);
  recordToolStart(ledger);
  recordToolEnd(ledger, true);
  assert.deepEqual({ input: ledger.inputTokens, output: ledger.outputTokens, cacheRead: ledger.cacheReadTokens, cacheWrite: ledger.cacheWriteTokens, cost: ledger.cost, hits: ledger.cacheHits, misses: ledger.cacheMisses, tools: ledger.toolCalls, errors: ledger.toolErrors }, { input: 12, output: 7, cacheRead: 3, cacheWrite: 2, cost: 0.01, hits: 1, misses: 1, tools: 1, errors: 1 });
  assert.match(formatLedger(ledger), /in 12 · out 7/);
  assert.match(formatLedger(ledger), /cache 1\/1/);
});

test("does not claim usage when the host omitted it", () => {
  const ledger = createLedger();
  recordUsage(ledger, { role: "assistant", content: [] });
  assert.equal(ledger.usageAvailable, false);
  assert.match(formatLedger(ledger), /tokens unavailable/);
});

test("counts launches, retries, and verdicts", () => {
  const ledger = createLedger();
  recordEvent(ledger, { v: 1, type: "spawn.request", id: "spawn-0", run: "run-1", from: "coordinator", workstream: "A", goal: "test", scope: ["src"], tier: "fast", budget: {}, attempt: 0, reason: "independent" });
  recordEvent(ledger, { v: 1, type: "spawn.request", id: "spawn-1", run: "run-1", from: "coordinator", workstream: "A", goal: "test", scope: ["src"], tier: "fast", budget: {}, attempt: 1, reason: "refuted" });
  recordEvent(ledger, { v: 1, type: "verdict", id: "verdict-1", run: "run-1", from: "validator", workstream: "A", status: "validated", evidence: [ref], verification: [passed] });
  assert.deepEqual({ launches: ledger.launches, retries: ledger.retries, validated: ledger.validated, refuted: ledger.refuted }, { launches: 2, retries: 1, validated: 1, refuted: 0 });
});
