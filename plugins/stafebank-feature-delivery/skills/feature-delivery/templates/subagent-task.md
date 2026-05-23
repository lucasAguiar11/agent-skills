# Subagent Task - <Workstream> - <Role> - <Objective>

## Role

Scout | Planner | Worker | Reviewer | Verifier

## Workstream

Example: A

## Wave

Example: 1

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

## Verification

- Command:
- Expected result:

## Stop Conditions

- Needs to write outside allowed paths.
- Missing dependency or contract.
- Verification fails twice.
- Shared contract not agreed when required.

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

Evidence:
- command:
- result:

Open questions:
- ...

Stop reason:
- only when status is blocked or failed
```

## Launch Metadata

Use when the parent agent launches this task through the Task tool:

- subagent_type: explore | generalPurpose | shell | ci-investigator
- readonly: yes | no
- run_in_background: prefer false for Workers unless user asked for background execution
