# Subagent Task - <Workstream> - <Role> - <Objective>

## Role

Scout | Planner | Worker | Reviewer | Verifier

## Workstream

Example: A

## Wave

Example: 1

## Model Tier

fast | standard | high

Resolve at launch using `references/model-tier-policy.md`. Optional explicit `model_override` when the user or plan already named a host model.

## Objective

State the bounded outcome.

## Context

Feature:
Plan:
Task ref:
Relevant docs:

## Allowed Write Paths

- None for read-only roles.

## Read-Only Paths

- `path/**`

## Forbidden Paths

- `path/**`

## Inputs

- Input document or code path.

## Expected Output

- Summary.
- Files changed, if any.
- Evidence.
- Open questions.

## Test Integrity (Required for any role that touches code)

Tests that passed before this task are a protected baseline. Do not delete, skip, or weaken a baseline test (or its runner/CI config) to make your change pass. A red test means fix the code, not the test. A baseline test may change only when it maps to this task's documented contract change (`feature-driven`, proven red-green) or is a genuine test bug (`test-was-wrong`, stop for approval first) — either way, report it in the handoff. An unmapped test edit is an `escape-hatch`: stop instead. See `test-guide` Test Integrity Gate.

## Verification

- Command:
- Expected result:

## Stop Conditions

- Needs to write outside allowed paths.
- Missing dependency or contract.
- Verification fails twice.
- Shared contract not agreed when required.
- A baseline test would need to be deleted, skipped, weakened, or changed without a documented contract mapping (`escape-hatch`).

## Handoff (Required)

Return this block to the Integration Coordinator:

```md
## Handoff - <Workstream> - <Role>

Status: completed | blocked | failed
Workstream:
Wave:

Summary:
- ...

Files changed:
- path (create|modify|delete)

Test changes:
- none | <test path>: feature-driven (mapped to task <ref>, red-green proven) | test-was-wrong (approved) | escape-hatch (STOPPED — not applied)

Evidence:
- command: (full suite / package)
- result: (N passed, M skipped — account for skips)

Open questions:
- ...

Stop reason:
- only when status is blocked or failed
```

## Launch Metadata

Use when the parent agent launches this task through the Task tool:

- subagent_type: explore | generalPurpose | shell | ci-investigator
- model_tier: fast | standard | high
- model: optional resolved slug when host supports explicit model selection
- readonly: yes | no
- run_in_background: prefer false for Workers unless user asked for background execution
