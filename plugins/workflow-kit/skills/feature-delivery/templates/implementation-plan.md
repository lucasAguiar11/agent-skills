---
feature_id: FEAT-0001
status: draft
owner: TBD
source: docs/features/FEAT-0001.md
adr: []
---

# FEAT-0001 Implementation Plan

> Section weight follows the change. For a Level 0 micro-change or any
> single-workstream plan, keep only `Goal`, `Tasks`, `Verification`, `Risks`
> and delete `Parallelization`, `Wave Schedule`, `Subagent Launch Spec`, and
> `Wave Execution Log`. Add those back only when the plan defines real parallel
> work. See `references/artifact-policy.md` (Plan Weight Rule).

## Goal

State the implementation outcome.

## Requirements and Constraints

- REQ-001:
- CON-001:

## Decision State

Blocking decisions:
- None.

Assumptions:
- None.

Open questions:
- None.

Approval required before execution:
- User approval of this plan.

## Ownership

Allowed write paths:
- `src/example/**`

Read-only paths:
- `src/shared/**`

Forbidden paths:
- `src/unrelated/**`

## Dependencies

| Dependency | Type | Notes |
|---|---|---|
| FEAT-0000 | contract | Contract must be agreed before implementation. |

Shared contracts for parallel work:
- PORT-001:
- DTO-001:

## Parallelization

<!-- Omit this section (and Wave Schedule / Subagent Launch Spec / Wave Execution Log) for Level 0 or single-workstream plans. -->

| Workstream | Type | Allowed write paths | Read-only paths | Depends on | Can run parallel |
|---|---|---|---|---|---|
| A | Worker | `src/example/**` | `src/shared/**` | none | yes |

Notes:
- State why workstreams can or cannot run together.
- Call out shared files explicitly if they require coordination.

## Wave Schedule

Required when more than one workstream exists or any row has `Can run parallel = yes`.

| Wave | Workstreams | Entry condition | Wave verification | Exit condition |
|---|---|---|---|---|
| 1 | A | plan approved | `pnpm lint` | all workstreams completed and evidence recorded |

## Subagent Launch Spec

Required when the plan is parallelizable. Omit for strictly sequential single-agent work.

| Workstream | Role | subagent_type | model_tier | Wave | Depends on | Task ref | Allowed write paths | readonly |
|---|---|---|---|---|---|---|---|---|
| A | Worker | generalPurpose | standard | 1 | none | Task 1 | `src/example/**` | no |

## Wave Execution Log

Append during `execute`. Leave placeholder rows empty before execution.

| Wave | Workstream | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | A | pending | | model: resolved at launch |

Status values: `pending`, `in_progress`, `completed`, `blocked`, `failed`.

## Tasks

Each task should map to at least one workstream in `Subagent Launch Spec`.

### Task 1 - Name

Workstream: A

Objective:

Files:
- Create:
- Modify:
- Read:

Steps:
- [ ] Step 1.
- [ ] Step 2.

Verification:
- Command:
- Expected result:

Stop conditions:
- Condition that requires user or planner input.

## Final Verification

- Command:
- Expected result:

## Risks

- RISK-001:
