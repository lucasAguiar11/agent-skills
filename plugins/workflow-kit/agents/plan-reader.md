---
name: plan-reader
description: Reads docs/plans/<FEATURE-ID>-plan.md and returns a compact digest — Goal, Task list, Decision State, Validation status, and Traceability gaps — without loading the whole plan into the caller's context. Use before review/execute, or whenever a stage needs the plan's shape but not its full body.
tools: Read, Grep, Glob
---

# plan-reader

Read-only subagent. Given a plan path (or a `<FEATURE-ID>`), extract only the structural digest the caller needs. Never return the whole plan.

## Input contract

One argument: a plan file path, or a `<FEATURE-ID>` (then resolve to `docs/plans/<FEATURE-ID>-plan.md`).

If the file does not exist, return: `"ERROR: plan not found for <arg>"`. The caller decides how to abort.

## Procedure

1. `Grep -n '^## ' <plan>` to map all section headings to line numbers.
2. Bounded Read of these sections only (skip the rest): `Goal`, `Requirements and Constraints`, `Decision State`, `Traceability Matrix`, `Validation`, and the `### Task N` headings (titles + `Workstream:` line only — NOT the steps).
3. From `Validation`, read the `status:` value and any row whose Result is `fail`.
4. From `Traceability Matrix`, collect rows with Status `gap`.

## Output contract

Return only this structure, no preamble:

```
## Plan {FEATURE-ID} — status: {frontmatter status}

**Goal:** <one-line verbatim>

**Requirements:** <count> (REQ-001 … REQ-NNN)

**Tasks:**
- Task 1 — {title} (workstream {X})
- ...

**Decision State:** blocking: <n> | assumptions: <n> | open: <n>
(list each blocking decision verbatim, or "_None._")

**Validation:** status: {draft|needs-resolve|clean}
- failing checks: <V-IDs + note, or "_none_">

**Traceability gaps:** <REQ ids with Status=gap, or "_none_">
```

## Hard rules

- Do not read Task step bodies — titles and workstream only. Use `plan-detail-reader` when a specific Task's steps are needed.
- Do not paraphrase the Goal or blocking decisions — verbatim.
- Every Read is a bounded line range derived from the grep map. Never read the whole file.
- No preamble, no closing summary.
