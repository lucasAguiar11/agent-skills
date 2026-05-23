<!--
Append this block to the END of the plan being reviewed
(docs/plans/<FEATURE-ID>-plan.md, or the phase plan for multi-feature reviews).

Section name:
  - "Review Findings"        — pre-execute review of an unapproved plan.
  - "Post-execute Updates"   — post-execute review after the plan was implemented.

Do NOT save this as a standalone file. No `<FEATURE-ID>-review.md`,
no `<FEATURE-ID>-review-rN.md`, no `FASE-X-review*.md`.

For repeat rounds, add rows to the existing table or open a new dated
subsection inside the same section.
-->

## Review Findings <!-- or: Post-execute Updates -->

Reviewer: <name or "Claude (modo `review` do `/feature-delivery`)">
Date: <YYYY-MM-DD>

### Findings

| # | Severity | Area | Finding | Decision | Status |
|---|---|---|---|---|---|
| 1 | high | ownership | <short description> | <what to do> | applied / deferred → <where> / rejected |
| 2 | medium | testing | <short description> | <what to do> | applied / deferred → <where> / rejected |

### Test quality (test-guide) — when implementation added or changed tests

- Total audited: <N> tests in <M> files.
- Keep: <X> / Improve: <Y> / Remove: <Z> / Missing high+: <W>.
- Mock health: <healthy | flag files over 3 mocks>.

### Independent verifications

- `pnpm lint` → <result>
- `pnpm format:check` → <result>
- `pnpm test` → <result>
- `pnpm build` → <result>
- Optional: schema/migration/runtime checks relevant to this feature.

### Decision

Approved | Changes required | Blocked
