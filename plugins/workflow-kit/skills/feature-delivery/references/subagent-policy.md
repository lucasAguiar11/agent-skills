# Subagent Policy

Use subagents when they increase throughput or improve review quality without creating coordination risk.

In `plan` mode, prefer documenting launch specs in the implementation plan.
In `execute` mode, the parent agent acts as **Integration Coordinator** and must launch subagents from those specs when workstreams are independent. Read `references/subagent-handoff.md` for handoff and merge rules.

## Good Candidates

Use subagents for:

- independent implementation slices with disjoint write scopes;
- codebase discovery in separate areas;
- read-only plan/spec review;
- verification work that does not mutate code;
- comparing alternatives or risks in parallel;
- contract definition before parallel Workers start;
- **context offload**: reading a large plan/PRD/ADR/inventory doc and returning a compact digest (frontmatter + only the sections the current step needs), so the parent thread stays lean instead of loading whole files. Use a `Scout` for this; prefer it over reading multi-hundred-line docs inline.

## Poor Candidates

Avoid subagents when:

- the work is small;
- the next step depends on one blocking investigation;
- multiple tasks need to edit the same files;
- the user asked for manual step-by-step execution;
- the plan does not define ownership;
- the plan has no `Subagent Launch Spec` and scopes would have to be invented at runtime.

## Roles

| Role | Purpose | Typical write scope |
|---|---|---|
| `Scout` | Read-only investigation with evidence | none |
| `Planner` | Refine PRD, brief, plan, ADR, or shared contracts | docs only, unless user approved code scaffolding |
| `Worker` | Implement a bounded slice | plan-defined paths only |
| `Reviewer` | Check output against PRD/plan/tests | none |
| `Verifier` | Run checks and report evidence | none |
| `Validator` | Adversarially validate one completed Worker workstream against its Task block; defaults to refuting | none |
| `Reader` | Read one large doc, return a compact digest (context offload) | none |
| `Coordinator` | Parent agent in `execute`; orchestrates waves, does not own feature slices | plan log sections only |

## Task Tool Mapping

Map roles to Task tool `subagent_type` unless the user specifies otherwise. Read `references/model-tier-policy.md` for tier defaults, risk triggers, and platform model resolution.

| Role | subagent_type | readonly | Default model_tier | Notes |
|---|---|---|---|---|
| Scout | `explore` | yes | `fast` | Discovery in docs, code, contracts |
| Planner | `generalPurpose` | yes | `standard` | Shapes artifacts and contracts |
| Worker | `generalPurpose` | no | `standard` | Bounded implementation slice |
| Reviewer | `generalPurpose` | yes | `standard` | Plan/spec/test review |
| Verifier | `shell` | yes* | `fast` | Run lint/test/build commands |
| Validator | `workflow-kit:task-validator` | yes* | `standard` | Adversarial per-task check; re-runs verification, never trusts pasted output |
| CI investigator | `ci-investigator` | yes | `standard` | Single failing PR check diagnosis |

\* Verifier and Validator must not mutate code. If a command would modify files, stop and report.

## Bundled Reader Agents (context offload)

The plugin ships six `Reader` agents under `agents/` (Claude Code only — auto-discovered; other hosts read the docs inline). Dispatch them via the Agent tool with the scoped name (e.g. `workflow-kit:plan-reader`) instead of loading a multi-hundred-line doc into the main thread. Each returns a fixed-shape digest, never the whole file.

| Reader | Reads | Returns | Use in |
|---|---|---|---|
| `plan-reader` | `docs/plans/<ID>-plan.md` | Goal, Tasks, Decision State, Validation status, Traceability gaps | review, pre-execute, update |
| `plan-detail-reader` | one `### Task N` of a plan | objective, files, steps, verification, write scope | execute (build Worker prompts) |
| `feature-reader` | `docs/features/<ID>.md` | problem, scope, requirements, acceptance, open decisions | plan, review |
| `adr-reader` | one ADR | status, decision, consequences | plan, review (honor a prior decision) |
| `adr-correlator` | all ADR frontmatter | ranked shortlist by `scope`/`tags` vs current scope | plan step 4 (link, don't re-decide) |
| `feature-index-reader` | `docs/features.md` | related features, live dependencies, what to inherit | triage, plan |

When to reach for a Reader: the doc is large, you only need part of it, and reading it whole would crowd out context you still need. For small docs (the feature index is usually small, a Level 0 plan is tiny), read inline — a subagent round-trip costs more than it saves.

The plugin also ships one non-Reader bundled agent: `task-validator` (the `Validator` role above). Dispatched by the Coordinator during `execute`, one per completed Worker workstream — see `references/subagent-handoff.md`.

## Token Economy

Every subagent costs a full context spin-up (~30k+ tokens even for a trivial task), so the levers are fewer launches and smaller prompts — never weaker checks:

- **Prompt = Task block + launch-spec row, nothing more.** Never paste the whole plan, brief, or another workstream's context into a subagent prompt; fetch bounded detail via `plan-detail-reader`.
- **Validator tier:** drop to `fast` when the check is mechanical (run the verification command + diff-vs-scope scan); keep `standard` when it must judge test coverage or semantics.
- **The Validator trigger is a substantive diff, not the existence of a Worker.** Trivial inline work (a few lines, no domain/persistence/contract change) skips validation — inline verification and the Post-execution Sequence cover it. Substantive work gets one `task-validator` even when the Coordinator executed it inline (see `workflow-modes.md` → execute) — "no one grades their own work" must hold wherever it matters.
- **One Validator per workstream, never per step or per file.**
- **Small work stays inline.** A task the Coordinator can do in a few edits does not justify a Worker + Validator pair (see Poor Candidates); the pair is for parallel or riskier slices.
- **No re-validation without a retry.** A `validated` verdict is final for that wave; do not relaunch validators for reassurance.
- The Team Board's `Tokens` line (`subagent-handoff.md`) keeps the running spend visible to the user — sum of `subagent_tokens` from agent results.

## Skill Mapping

Prefer these skills inside subagent prompts when the role matches:

| Role | Skill(s) |
|---|---|
| Scout | `explore-codebase`, docs V1 listed in plan |
| Planner | `prd`, `create-implementation-plan`, `create-architectural-decision-record`, `update-implementation-plan` |
| Worker | `nestjs-best-practices`, `prisma-expert` when relevant |
| Reviewer | `review-plan`, `test-guide`, `pr-review` |
| Verifier | `verification-before-completion`, `test-guide` diagnose-only |

## Required Task Fields

Every subagent task — suggested or launched — must include:

- role;
- objective;
- context;
- workstream id;
- wave number;
- model tier (`fast`, `standard`, `high`) or explicit model override when the user requested one;
- allowed write paths;
- read-only paths;
- forbidden paths;
- inputs;
- expected output;
- verification;
- stop conditions;
- handoff shape from `references/subagent-handoff.md`.

Use `templates/subagent-task.md` as the prompt skeleton.

## Plan Sections for Execution

When a plan has more than one workstream, or any workstream with `Can run parallel = yes`, the plan must include:

1. `Parallelization` — ownership and dependencies;
2. `Wave Schedule` — ordered groups of workstreams;
3. `Subagent Launch Spec` — machine-readable launch table;
4. `Wave Execution Log` — filled during `execute`.

If parallel work is not expected, omit `Wave Schedule` and `Subagent Launch Spec`, and execute sequentially in the parent agent.

## Subagent Launch Spec Format

```md
## Subagent Launch Spec

| Workstream | Role | subagent_type | model_tier | Wave | Depends on | Task ref | Allowed write paths | readonly |
|---|---|---|---|---|---|---|---|---|
| A | Worker | generalPurpose | standard | 1 | none | Task 1 | `src/modules/auth/**` | no |
| B | Scout | explore | fast | 0 | none | discovery-auth | none | yes |
| C | Reviewer | generalPurpose | standard | 3 | A,B | review-plan | none | yes |
```

Rules:

- `Wave 0` is optional pre-work: discovery, contract planning, or review-before-build.
- Every Worker row must map to exactly one task section in the plan.
- Every row must include `model_tier`. Use `references/model-tier-policy.md` for defaults and escalation.
- Optional `model_override` column: explicit host model slug when already chosen.
- `Depends on` must match `Parallelization` and `Wave Schedule`.
- Do not assign the same write path to two Workers in the same wave.

## Wave Schedule Format

```md
## Wave Schedule

| Wave | Workstreams | Entry condition | Wave verification | Exit condition |
|---|---|---|---|---|
| 0 | B | plan approved | none | contracts listed or discovery done |
| 1 | A | wave 0 done | `pnpm exec prisma validate` | all workstreams completed |
| 2 | C,D | wave 1 done | `pnpm test -- <scope>` | verification passes |
```

## Recommendation Format (Plan / Triage)

For plans not yet approved, a lighter suggestion is enough:

```md
## Suggested Subagents

| Workstream | Role | Objective | Write scope | Wave | model_tier | Stop condition |
|---|---|---|---|---|---|---|
| A | Worker | Implement token service | `src/modules/auth/**` | 1 | standard | Needs changes outside auth |
| B | Reviewer | Check plan compliance | none | 2 | standard | Any missing acceptance criterion |
```

When the user approves execution, convert suggestions into `Subagent Launch Spec` and `Wave Schedule` if they are not already present.

## Launch Rules in Execute Mode

1. Read `Subagent Launch Spec` and `Wave Schedule`.
2. Confirm contract-first gate when parallel Workers cross layers.
3. Resolve `model_tier` per row using `references/model-tier-policy.md`; pass `model` when the host supports it.
4. Launch all subagents for the current wave in parallel when allowed.
5. Wait for handoff blocks; update `Wave Execution Log`.
6. Run wave verification before advancing.
7. Stop the feature on blocked/failed wave unless the user directs otherwise.

Do not let Workers declare the feature complete. Only the Coordinator runs final verification and closure.
