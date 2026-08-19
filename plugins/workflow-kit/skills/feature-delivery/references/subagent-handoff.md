# Subagent Handoff Protocol

Use this reference when launching subagents from an approved plan or when a subagent finishes work and returns control to the parent agent.

The parent agent in `execute` mode acts as **Integration Coordinator**. It orchestrates waves, merges outcomes, records evidence, and decides whether the next wave may start. It does not implement feature slices unless no Worker is available or the user asked for direct execution.

## Wait Protocol

Use event-driven waiting whenever the host provides it. The Coordinator should
not turn a running wave into a timer loop.

1. Launch the eligible workstreams in one batch.
2. Wait for an agent event or the host's wave-wait primitive.
3. On wake-up, collect statuses and handoffs once. Call `list_agents` only at a
   wave boundary, after a timeout, or when a stop condition is suspected.
4. If the host has no event primitive, use exponential backoff instead of fixed
   polling: 30s, 60s, 120s, then the host maximum. Emit progress only when a
   status changes or a timeout is reached.
5. Do not interrupt a healthy Worker because it has been quiet. Interrupt only
   after the timeout policy is exhausted or the host reports failure.

The Team Board is an event log, not a heartbeat. Do not print a new board just
to show that time passed.

## Coordinator Responsibilities

The Integration Coordinator must:

1. Read the plan's `Wave Schedule`, `Subagent Launch Spec`, and `Parallelization` sections.
2. Launch only the workstreams allowed in the current wave.
3. Wait for all subagents in the wave to finish or stop.
4. Collect each subagent's handoff block.
5. Audit the `Test changes` field of every handoff. Any `escape-hatch`, or a
   `feature-driven` change not mapped to a plan task, or a `test-was-wrong`
   without prior approval, blocks the wave — stop and ask the user. A baseline
   test deleted/skipped/weakened in the diff but not reported is a defect;
   surface it.
6. Run the wave verification profile from the plan. Use focused checks during
   intermediate waves and reserve the full suite/build for the final gate unless
   the plan explicitly opts into full verification per wave. Confirm skipped
   tests are accounted for (no silent growth).
7. Update `Wave Execution Log` in the plan and print the Team Board (below).
8. Unblock the next wave or stop and ask the user when a stop condition triggers.

Do not launch `task-validator` during an implementation wave. After the
post-execution review bundle freezes the diff, launch one validator per
substantive workstream in a single final validation wave. Revalidate only a
workstream with concrete refutation evidence.

The Coordinator must not declare the feature `done`. Only final verification after all waves completes that transition.

## Wave Execution Rules

- Execute **one wave at a time** unless the plan explicitly marks multiple waves as independent.
- Within a wave, launch all eligible subagents **in parallel** when their write scopes do not overlap.
- Do not start wave N+1 while any workstream in wave N is `blocked`, `failed`, or missing handoff evidence.
- If a workstream hits a stop condition, mark the wave `blocked`, record the reason in the plan, and ask the user before continuing.

## Contract-First Gate

Before launching parallel Workers that touch different layers of the same feature (for example domain + application + infrastructure):

1. Confirm shared contracts are listed in the plan: ports, DTOs, enums, migration boundaries, HTTP contracts.
2. If contracts are missing, launch a **Planner** subagent first or update the plan manually.
3. Record contract status in the plan under `Dependencies` or in the relevant workstream row (`contract: agreed`).
4. Only then launch parallel Workers.

Skip this gate when a single Worker owns the full vertical slice or when workstreams are strictly sequential.

## Subagent Launch

When launching a subagent through the Task tool:

1. Build the prompt from `templates/subagent-task.md`.
2. Copy bounded context from the plan task section and the matching launch-spec row.
3. Set `readonly: true` for Scout, Reviewer, and read-only Verifier work.
4. Resolve `model_tier`, cost profile, and override scope using `references/model-tier-policy.md`; pass `model` to Task only for roles covered by that scope.
5. Launch all subagents for the current wave in a **single message with multiple Task calls** when parallel execution is allowed.
6. Pass the workstream id, wave number, model tier (and resolved model if applicable), allowed write paths, forbidden paths, verification commands, and stop conditions explicitly.
7. Name the launch (the Task/Agent `description` shown in the host's progress tree) as `<Role> <WS> · <task short title> · wave <n>`, appending `· retry <m>` on retries — e.g. `DEV A · slugify · wave 1`, `QA B · word_count · wave 1 · retry 1`. Role vocabulary from the Team Board (`DEV`, `QA`, `CI`, `TL`, `SCOUT`). Never use generic labels ("agent", "subagent", "task").

Do not launch parallel Workers with overlapping write paths. Prefer sequential execution or split the plan first.

## Handoff Block (Required From Every Subagent)

Every subagent must return a handoff block in this shape:

```md
## Handoff - <Workstream> - <Role>

Status: completed | blocked | failed
Workstream:
Wave:

Summary:
- ...

Files changed:
- path (create|modify|delete) — only for Workers

Evidence:
- command:
- result:

Open questions:
- ...

Stop reason:
- only when status is blocked or failed
```

The Coordinator copies the relevant rows into `Wave Execution Log`.

## Merge Rules

After a wave completes:

| Situation | Coordinator action |
|---|---|
| All workstreams `completed` with passing verification | Mark wave `done`; schedule next wave |
| Worker changed files outside allowed paths | Mark wave `blocked`; do not merge; ask user or Planner |
| Two Workers touched the same file | Mark wave `blocked`; require sequential fix or replan |
| Reviewer found high-severity issue | Append to `Review Findings` or `Post-execute Updates`; do not mark wave done |
| Verifier failed | Mark wave `failed`; retry once if plan allows; otherwise stop |
| Validator refuted a workstream | Mark that workstream `failed`; relaunch the Worker with the validator's `Findings` as input, once; if refuted again, stop and ask the user |
| Contract dependency unresolved | Mark wave `blocked`; launch Planner or ask user |
| Model slug rejected by host | Retry with platform default; record fallback in execution log |

When retrying a failed Worker after domain or contract issues, escalate `model_tier` to `high` per `references/model-tier-policy.md`.

When using git worktrees or branches per workstream, merge sequentially in dependency order and run verification after each merge.

## Team Board

A compact status snapshot the Coordinator prints in chat at these events: wave start, each validation verdict, wave close, and any block. It maps the execution to team roles so the user can see who is doing what and which gate is next, without reading the plan.

Format — plain GFM markdown (tables render reliably in every host terminal; do not use ASCII box art, which breaks on alignment and width):

```md
**<FEATURE-ID>** — Wave <n>/<total> `▓▓▓▓▓▓░░░ <pct>%`

| WS | Role | Task | Progress | Status |
|---|---|---|---|---|
| A | DEV | <task title> | `██████████` 5/5 | validated |
| B | DEV | <task title> | `████████░░` 4/5 | validating |
| — | QA | refute Task 2 | — | running tests |

Waves: `[x]──[>]──[ ]` · Blocked: 0 · Gate: <next exit condition>
Cost: <profile> · Model scope: <workers|wave|all>
Tokens: <wave>k wave · <total>k feature | unavailable
```

Rules:

- `Progress` counts the Task block's step checkboxes (done/total) as reported in handoffs — real data, never estimated.
- Overall `<pct>` = completed-and-validated tasks / total tasks.
- Status vocabulary: `queued`, `executing`, `validating`, `validated`, `refuted`, `blocked`, `failed`, `done`.
- Role vocabulary maps to `subagent-policy.md` roles: `DEV` = Worker, `QA` = Validator, `CI` = Verifier, `TL` = Planner/Reviewer.
- `Cost`: report the selected profile and model scope once per board.
- `Tokens`: sum the `subagent_tokens` reported in each agent's tool result — current wave and feature running total. Real numbers only; print `unavailable` when the host does not report usage. Never launch another agent just to estimate cost.
- Copy each printed board into the plan's `Wave Execution Log` (same table), so the plan file keeps the visual timeline.

## Plan Updates During Execute

The Coordinator may update only these plan sections during execution:

- `Wave Execution Log`
- task checkboxes in `Tasks`
- `Post-execute Updates`
- plan front matter `status` (`in_progress`, `blocked`, `done`)

Do not rewrite goals, requirements, or ownership mid-flight unless the user approves a plan update through `update` mode.

## Completion Gate

After the last wave:

1. Run `Final Verification` from the plan.
2. Invoke `test-guide` when tests changed or domain/API/persistence behavior changed.
3. Invoke `verification-before-completion` before claiming success.
4. Set plan status to `done` only with fresh evidence recorded in the plan or reported to the user.
