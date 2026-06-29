---
feature_id: FEAT-20260608-tela-bandeja
status: draft
owner: TBD
source: docs/features/FEAT-20260608-tela-bandeja.md
adr: []
---

# FEAT-20260608-tela-bandeja Implementation Plan

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

## Traceability Matrix

<!-- Omit for Level 0 micro-changes. Fill from medium features up. One row per REQ. -->
<!-- Closes the loop REQ → design → test. `Validation` row V-006 checks this. -->

| REQ | Design / Task | Test (file or case) | Status |
|---|---|---|---|
| REQ-001 | Task 1 | `path/to.spec.ts::case` | planned |

Status values: `planned` / `covered` / `gap`. A `gap` row is an unverified
requirement — resolve it (add a test or drop the REQ) before marking the plan `clean`.

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
| FEAT-20260607-base-bandeja | contract | Contract must be agreed before implementation. |

Shared contracts for parallel work:
- PORT-001:
- DTO-001:

## Libraries

<!-- One row per library the change adds or depends on a specific version of. Omit for Level 0 changes that touch no library. -->
<!-- Records the resolved doc so the next planner does not re-decide and version drift is caught. `Validation` row V-007 checks this. -->

| Library | Version | Doc ref | Why |
|---|---|---|---|
| example | ^1.0.0 | context7 / url | what it's for |

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

## Validation

> Self-check of THIS plan before it can be `planned` / approved. Re-run after
> every change to the plan (and after each `update`) until `status: clean`.
> Lives inside the plan — never a separate `*-validation.md` file.

status: draft  <!-- draft | needs-resolve | clean -->

| # | Check | Result | Note |
|---|---|---|---|
| V-001 | Every REQ maps to at least one Task | | |
| V-002 | Every Task has Verification (command + expected) | | |
| V-003 | No blocking decision left open (Decision Gate) | | |
| V-004 | Parallel workstreams have non-overlapping write paths | | |
| V-005 | Every Worker row in Launch Spec maps to one Task | | |
| V-006 | Traceability Matrix has no `gap` row | | |
| V-007 | Every new/version-pinned library has a `Libraries` row with a doc ref | | |

Result values: `pass` / `fail` / `n-a`. While any row is `fail`, status is
`needs-resolve`: fix the plan, then re-check. Set `status: clean` only when no
row is `fail`. V-004/V-005 are `n-a` for single-workstream plans.

## Final Verification

- Command:
- Expected result:

## Risks

- RISK-001:
