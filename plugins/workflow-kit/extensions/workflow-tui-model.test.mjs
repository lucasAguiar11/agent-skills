import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowTuiRows } from "./workflow-tui-model.ts";

const ledger = {
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

const spawn = {
  v: 1,
  type: "spawn.request",
  id: "spawn-1",
  run: "run-1",
  from: "omp",
  workstream: "A",
  goal: "inspect the API",
  scope: ["src"],
  tier: "fast",
  budget: {},
  attempt: 0,
  reason: "automatic capture",
};

const lifecycle = {
  v: 1,
  type: "agent.lifecycle",
  id: "lifecycle-1",
  run: "run-1",
  from: "omp",
  workstream: "A",
  status: "completed",
  agent: "scout",
  agentSource: "bundled",
  task: "inspect the API",
  index: 0,
};

test("builds a timeline from messages and workflow events without duplicating protocol entries", () => {
  const rows = buildWorkflowTuiRows({
    ledger,
    events: [spawn, lifecycle],
    entries: [
      { type: "message", id: "m-1", timestamp: "2026-01-01T00:00:00Z", message: { role: "user", content: [{ type: "text", text: "inspect" }] } },
      { type: "custom", id: "p-1", customType: "workflow-kit:protocol:v1", timestamp: "2026-01-01T00:00:01Z", data: spawn },
    ],
  }, "timeline");

  assert.deepEqual(rows.map(({ kind }) => kind), ["message", "event", "agent"]);
  assert.match(rows[0].title, /user: inspect/);
  assert.match(rows[1].title, /task A: inspect the API/);
  assert.match(rows[2].title, /scout: completed/);
});

test("groups agent details by workstream", () => {
  const rows = buildWorkflowTuiRows({ ledger, entries: [], events: [spawn, lifecycle] }, "agents");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "agent:A");
  assert.match(rows[0].title, /A: completed/);
  assert.match(rows[0].subtitle, /scout/);
  assert.match(rows[0].detail, /inspect the API/);
});

test("shows an explicit empty state", () => {
  const rows = buildWorkflowTuiRows({ ledger, entries: [], events: [] }, "agents");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "empty");
});
