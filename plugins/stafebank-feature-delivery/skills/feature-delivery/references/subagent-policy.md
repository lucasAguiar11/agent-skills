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
- contract definition before parallel Workers start.

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
| `Coordinator` | Parent agent in `execute`; orchestrates waves, does not own feature slices | plan log sections only |

## Task Tool Mapping

Map roles to Task tool `subagent_type` unless the user specifies otherwise:

| Role | subagent_type | readonly | Notes |
|---|---|---|---|
| Scout | `explore` | yes | Discovery in docs, code, contracts |
| Planner | `generalPurpose` | yes | Shapes artifacts and contracts |
| Worker | `generalPurpose` | no | Bounded implementation slice |
| Reviewer | `generalPurpose` | yes | Plan/spec/test review |
| Verifier | `shell` | yes* | Run lint/test/build commands |
| CI investigator | `ci-investigator` | yes | Single failing PR check diagnosis |

\* Verifier must not mutate code. If a command would modify files, stop and report.

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

| Workstream | Role | subagent_type | Wave | Depends on | Task ref | Allowed write paths | readonly |
|---|---|---|---|---|---|---|---|
| A | Worker | generalPurpose | 1 | none | Task 1 | `src/modules/auth/**` | no |
| B | Scout | explore | 0 | none | discovery-auth | none | yes |
| C | Reviewer | generalPurpose | 3 | A,B | review-plan | none | yes |
```

Rules:

- `Wave 0` is optional pre-work: discovery, contract planning, or review-before-build.
- Every Worker row must map to exactly one task section in the plan.
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

| Workstream | Role | Objective | Write scope | Wave | Stop condition |
|---|---|---|---|---|---|
| A | Worker | Implement token service | `src/modules/auth/**` | 1 | Needs changes outside auth |
| B | Reviewer | Check plan compliance | none | 2 | Any missing acceptance criterion |
```

When the user approves execution, convert suggestions into `Subagent Launch Spec` and `Wave Schedule` if they are not already present.

## Launch Rules in Execute Mode

1. Read `Subagent Launch Spec` and `Wave Schedule`.
2. Confirm contract-first gate when parallel Workers cross layers.
3. Launch all subagents for the current wave in parallel when allowed.
4. Wait for handoff blocks; update `Wave Execution Log`.
5. Run wave verification before advancing.
6. Stop the feature on blocked/failed wave unless the user directs otherwise.

Do not let Workers declare the feature complete. Only the Coordinator runs final verification and closure.
