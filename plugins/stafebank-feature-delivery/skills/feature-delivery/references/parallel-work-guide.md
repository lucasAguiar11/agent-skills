# Parallel Work Guide

Parallel work is useful only when ownership is clear and the plan defines how subagents hand results back.

Read `references/subagent-policy.md` and `references/subagent-handoff.md` when turning parallel work into launched subagents.

## Feature Index Fields

Track each feature with:

- ID;
- title;
- status;
- owner;
- dependencies;
- impacted modules;
- linked docs;
- current branch/PR when known;
- active wave/workstream when execution is in progress.

## Ownership Rules

Each plan must define:

- allowed write paths;
- read-only paths;
- forbidden paths;
- contracts with other features/modules;
- stop conditions;
- wave ownership when using subagents.

## Write Scope Rules

- Two agents must not write to the same path unless explicitly coordinated.
- A task may read another module without owning it.
- If a task needs to change another feature's module, update the plan and feature index before implementation.
- Shared files require explicit coordination notes.
- Parallel Workers must use disjoint write paths within the same wave.

## Dependency Rules

Classify dependencies as:

- `blocks`: cannot start until dependency is done;
- `reads`: can start, but must not modify dependency;
- `contract`: can start after interface/contract is agreed;
- `conflicts`: cannot run in parallel.

Record contract dependencies explicitly when domain, application, and infrastructure workstreams run in parallel.

## Contract-First Gate

Before parallel Workers start across layers:

1. List shared contracts in the plan: ports, DTOs, enums, events, migration boundaries, HTTP routes/schemas.
2. Mark them `contract: agreed` or keep the plan `blocked`.
3. Put contract definition in wave 0 via a Planner subagent when still missing.
4. Launch parallel Workers only after the gate passes.

Single vertical-slice Workers do not need this gate.

## Plan Output

Every parallelizable implementation plan should include these sections:

### Parallelization

```md
## Parallelization

| Workstream | Type | Allowed write paths | Read-only paths | Depends on | Can run parallel |
|---|---|---|---|---|---|
| A | Worker | `src/modules/auth/**` | `src/modules/users/**` | user contract | yes |
| B | Worker | `src/domain/auth/**` | `src/application/**` | auth contract | yes |
```

### Wave Schedule

Group workstreams into ordered waves:

```md
## Wave Schedule

| Wave | Workstreams | Entry condition | Wave verification | Exit condition |
|---|---|---|---|---|
| 0 | Scout-auth | plan approved | none | impacted files listed |
| 1 | A | contract agreed | `pnpm lint` | handoff completed |
| 2 | B,C | wave 1 done | `pnpm test -- <scope>` | verification passes |
```

Rules:

- Workstreams in the same wave must not conflict on write paths.
- A workstream appears in exactly one wave unless the plan documents a retry/re-run.
- Wave verification must be runnable without human interpretation.

### Subagent Launch Spec

See `references/subagent-policy.md` for the launch table format.

### Wave Execution Log

Filled during `execute`:

```md
## Wave Execution Log

| Wave | Workstream | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | A | completed | `pnpm lint` passed | |
| 1 | B | blocked | — | needs DTO contract |
```

Status values: `pending`, `in_progress`, `completed`, `blocked`, `failed`.

## Isolation Options

Use stronger isolation when Workers are large or merge risk is high:

- separate git branch per workstream;
- git worktree per workstream;
- sequential merge by the Integration Coordinator after each wave.

Do not use parallel Workers on the same branch when they can edit the same files.

## Coordinator Notes

The parent agent in `execute` mode merges wave outcomes, updates the execution log, and decides whether the next wave may start. Workers must not skip this step.
