# Review Checklist

Use this before implementation.

For a Level 0 micro-change or any single-workstream plan, skip the parallelization
items (`Wave Schedule`, `Subagent Launch Spec`, wave order, task→workstream mapping).
Do not flag those sections as missing — their absence is correct per the Plan Weight
Rule in `references/artifact-policy.md`. Still apply Scope, Decision Gate, Ownership,
Completion, and Test Quality.

## Review Output Location

- The review writes its findings inside the plan being reviewed, not in a separate file.
- Section name: `Review Findings` for pre-execute reviews; `Post-execute Updates` for reviews after implementation.
- Each finding row: `# / Severity / Area / Finding / Decision / Status` (`applied` / `deferred → <where>` / `rejected`).
- Repeat rounds add rows or a dated subsection inside the same section. Never create `<FEATURE-ID>-review.md`, `<FEATURE-ID>-review-rN.md`, `FASE-X-review.md`, or any other `*-review*.md` file.

## Artifact Consistency

- Feature ID is consistent across feature brief, PRD, ADR, and plan.
- Status values are current.
- Dependencies match the feature index.
- ADR references are linked where relevant.

## Scope

- Goals are explicit.
- Non-goals are explicit.
- Acceptance criteria are observable.
- Open decisions that block implementation are marked as blockers.
- Blocking decisions are not hidden under generic open questions.
- Plans with unresolved blockers are `draft` or `blocked`, not `planned` or `approved`.

## Decision Gate

- Persistence, hierarchy, public/semi-public contracts, domain rules, authentication, authorization, multi-tenancy, migrations, integrations, execution order, and ownership decisions are classified.
- Each blocking decision has an owner or an explicit user question.
- Assumptions are safe to reverse and do not change the plan shape.

## Ownership

- Allowed write paths are listed.
- Read-only paths are listed.
- Forbidden paths are listed.
- Shared files or modules have coordination notes.

## Architecture

- Structural decisions have ADRs.
- Existing contracts are preserved or explicitly changed.
- Data ownership is clear.
- External integrations identify auth, retries, errors, and observability.

## Execution

- Tasks are ordered by dependency.
- Single-workstream plans carry no `Wave Schedule`/`Subagent Launch Spec`; the items below apply only to parallel plans.
- Parallel work has non-overlapping write scopes.
- Parallel plans include `Wave Schedule` and `Subagent Launch Spec`.
- Every launch-spec row includes `model_tier`; risk-heavy workstreams use `high` per `references/model-tier-policy.md`.
- Wave order matches task and contract dependencies.
- Each task maps to a workstream when subagents will be used.
- Each task has expected output.
- Each task has verification.
- Stop conditions are explicit.
- Contract-first gate is satisfied before parallel Workers across layers.

## Completion

- There is a final verification command or manual validation path.
- The plan says what evidence proves the work is done.
- The plan does not rely on "should work" or unchecked assumptions.

## Test Quality

Use `test-guide` when tests were added or when the change touches domain rules, validation, persistence, archive/status behavior, hierarchy movement, or API contracts.

- Each new test states or implies the bug it would catch.
- Tests are classified by boundary: domain, use case, API contract, persistence integration, or E2E.
- No test only mirrors implementation details or framework behavior.
- No test creates false confidence by mocking away the risk being reviewed.
- Missing critical tests are listed separately from passing verification commands.
- Proposed test additions, removals, or rewrites require explicit user approval before editing test files.
