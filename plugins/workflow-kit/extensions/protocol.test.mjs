import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  EvidenceCache,
  WorkflowGate,
  createAutomaticSpawnRequests,
  buildVerificationCacheKey,
  createContextCapsule,
  createEnvironmentFingerprint,
  createEvidenceRef,
  parseWorkflowEvent,
  renderContextCapsule,
  verifyEvidenceRef,
} from "./protocol.ts";

const digest = "a".repeat(64);
const environment = { cwd: "/workspace", runtime: "node v22", platform: "test", env: {}, files: [], digest };
const evidence = [{ path: "src/example.ts", sha256: digest, bytes: 10 }];

function event(overrides = {}) {
  return {
    v: 1,
    id: "event-1",
    run: "run-1",
    from: "worker",
    workstream: "A",
    type: "handoff",
    goal: "test protocol",
    scope: ["src/example.ts"],
    status: "completed",
    evidence,
    verification: [{ command: "node --test", status: "passed", cwd: "/workspace", environment, evidence: [] }],
    ...overrides,
  };
}

test("accepts a completed handoff with proof", () => {
  const result = parseWorkflowEvent(event());
  assert.equal(result.errors.length, 0);
  assert.equal(result.event?.type, "handoff");
});

test("rejects completion without evidence and a passed check", () => {
  const result = parseWorkflowEvent(event({ evidence: [], verification: [{ command: "node --test", status: "skipped", cwd: "/workspace", environment, evidence: [] }] }));
  assert.match(result.errors[0], /completed handoff requires/);
});

test("invalidates a source reference after an uncommitted edit", () => {
  const root = mkdtempSync(join(tmpdir(), "workflow-kit-"));
  const path = join(root, "new-file.ts");
  try {
    writeFileSync(path, "before");
    const ref = createEvidenceRef(root, "new-file.ts");
    assert.equal(verifyEvidenceRef(root, ref), true);
    writeFileSync(path, "after");
    assert.equal(verifyEvidenceRef(root, ref), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("does not reuse cached evidence after a dirty edit", () => {
  const root = mkdtempSync(join(tmpdir(), "workflow-kit-cache-"));
  const path = join(root, "new-file.ts");
  try {
    writeFileSync(path, "before");
    const ref = createEvidenceRef(root, "new-file.ts");
    const checkpoint = parseWorkflowEvent({
      v: 1,
      type: "checkpoint",
      id: "checkpoint-cache",
      run: "run-cache",
      from: "worker",
      workstream: "cache",
      goal: "reuse evidence",
      changed: ["new-file.ts"],
      evidence: [ref],
      open: [],
      next: "continue",
    }).event;
    const cache = new EvidenceCache();
    cache.remember(checkpoint);
    assert.ok(cache.lookup("reuse evidence", ["new-file.ts"], root));
    writeFileSync(path, "after");
    assert.equal(cache.lookup("reuse evidence", ["new-file.ts"], root), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test("does not reuse a passed check after its environment changes", () => {
  const root = mkdtempSync(join(tmpdir(), "workflow-kit-env-"));
  const sourcePath = join(root, "source.ts");
  const configPath = join(root, "package-lock.json");
  const envKey = "WORKFLOW_KIT_CACHE_TEST";
  const previous = process.env[envKey];
  try {
    writeFileSync(sourcePath, "source");
    writeFileSync(configPath, "config");
    process.env[envKey] = "before";
    const source = createEvidenceRef(root, "source.ts");
    const config = createEvidenceRef(root, "package-lock.json");
    const fingerprint = createEnvironmentFingerprint(root, [envKey], [config]);
    const handoff = parseWorkflowEvent({
      ...event({
        run: "run-env",
        workstream: "env-cache",
        goal: "reuse verified evidence",
        scope: ["source.ts"],
        evidence: [source],
        verification: [{ command: "node --test", status: "passed", cwd: root, environment: fingerprint, evidence: [source] }],
      }),
    }).event;
    const cache = new EvidenceCache();
    cache.remember(handoff);
    assert.ok(cache.lookup("reuse verified evidence", ["source.ts"], root));
    process.env[envKey] = "after";
    assert.equal(cache.lookup("reuse verified evidence", ["source.ts"], root), undefined);
  } finally {
    if (previous === undefined) delete process.env[envKey];
    else process.env[envKey] = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
test("changes verification cache keys when environment changes", () => {
  const first = createEnvironmentFingerprint("/workspace", ["CI"], evidence);
  const second = { ...first, env: { CI: "b".repeat(64) }, digest: "b".repeat(64) };
  const verification = { command: "npm test", status: "passed", cwd: "/workspace", environment: first, evidence };
  const changed = { ...verification, environment: second };
  assert.notEqual(buildVerificationCacheKey(verification), buildVerificationCacheKey(changed));
});

test("enforces two active agents and one retry", () => {
  const gate = new WorkflowGate();
  const spawn = (workstream, attempt = 0) => parseWorkflowEvent({
    v: 1,
    type: "spawn.request",
    id: `${workstream}-${attempt}`,
    run: "run-1",
    from: "coordinator",
    workstream,
    goal: "test",
    scope: [workstream],
    tier: "fast",
    budget: { maxRetries: 1 },
    attempt,
    reason: "independent work",
  }).event;

  const first = spawn("A");
  const second = spawn("B");
  const third = spawn("C");
  assert.equal(gate.check(first).ok, true);
  gate.apply(first);
  assert.equal(gate.check(second).ok, true);
  gate.apply(second);
  assert.equal(gate.check(third).ok, false);

  const refuted = parseWorkflowEvent({ ...event({ type: "verdict", status: "refuted", evidence, verification: [{ command: "node --test", status: "failed", cwd: "/workspace", environment, evidence: [] }] }) }).event;
  assert.equal(gate.check(refuted).ok, true);
  gate.apply(refuted);
  const retry = spawn("A", 1);
  assert.equal(gate.check(retry).ok, true);
  gate.apply(retry);
  const secondRefuted = parseWorkflowEvent({ ...refuted, id: "verdict-2" }).event;
  assert.equal(gate.check(secondRefuted).ok, true);
  gate.apply(secondRefuted);
  const repeatedRetry = gate.check(spawn("A", 1));
  assert.equal(repeatedRetry.ok, false);
  assert.match(repeatedRetry.reason, /attempt must increment/);
  assert.equal(gate.check(spawn("A", 2)).ok, false);
});

test("creates automatic spawn requests from task calls", () => {
  const requests = createAutomaticSpawnRequests(
    "call-1",
    "session-1",
    {
      context: "inspect independently",
      tasks: [
        { name: "A", agent: "scout", task: "inspect the API", effort: "lo" },
        { agent: "reviewer", task: "review the diff", effort: "hi" },
      ],
    },
    new Map(),
  );
  assert.deepEqual(requests.map(({ workstream, goal, tier, attempt, scope }) => ({ workstream, goal, tier, attempt, scope })), [
    { workstream: "A", goal: "inspect the API", tier: "fast", attempt: 0, scope: [] },
    { workstream: "reviewer-call-1-1", goal: "review the diff", tier: "high", attempt: 0, scope: [] },
  ]);
});

test("tracks automatic lifecycle and releases active capacity", () => {
  const gate = new WorkflowGate();
  const spawn = parseWorkflowEvent({
    v: 1,
    type: "spawn.request",
    id: "spawn-auto",
    run: "run-auto",
    from: "omp",
    workstream: "A",
    goal: "inspect",
    scope: [],
    tier: "standard",
    budget: {},
    attempt: 0,
    reason: "automatic capture",
  }).event;
  const lifecycle = (status) => parseWorkflowEvent({
    v: 1,
    type: "agent.lifecycle",
    id: `lifecycle-${status}`,
    run: "run-auto",
    from: "omp",
    workstream: "A",
    status,
    agent: "scout",
    agentSource: "bundled",
    task: "inspect",
    index: 0,
  }).event;
  assert.equal(gate.check(spawn).ok, true);
  gate.apply(spawn);
  assert.equal(gate.check(lifecycle("started")).ok, true);
  gate.apply(lifecycle("started"));
  assert.equal(gate.getActiveCount(), 1);
  assert.equal(gate.check(lifecycle("completed")).ok, true);
  gate.apply(lifecycle("completed"));
  assert.equal(gate.getActiveCount(), 0);
});

test("checks automatic spawn batches without mutating the gate", () => {
  const gate = new WorkflowGate();
  const spawn = (workstream) => parseWorkflowEvent({
    v: 1,
    type: "spawn.request",
    id: `spawn-${workstream}`,
    run: "run-batch",
    from: "omp",
    workstream,
    goal: "test",
    scope: [],
    tier: "standard",
    budget: {},
    attempt: 0,
    reason: "automatic capture",
  }).event;
  gate.apply(spawn("A"));
  assert.equal(gate.checkBatch([spawn("B"), spawn("C")]).ok, false);
  assert.equal(gate.getActiveCount(), 1);
});

test("renders a compact context capsule", () => {
  const checkpoint = parseWorkflowEvent({
    v: 1,
    type: "checkpoint",
    id: "checkpoint-1",
    run: "run-1",
    from: "worker",
    workstream: "A",
    goal: "keep context small",
    changed: ["src/example.ts"],
    evidence,
    open: ["run smoke test"],
    next: "run smoke test",
  }).event;
  const capsule = createContextCapsule([checkpoint]);
  assert.ok(capsule);
  assert.match(renderContextCapsule(capsule), /goal: keep context small/);
  assert.match(renderContextCapsule(capsule), /example\.ts@aaaaaaaaaaaa/);
});
