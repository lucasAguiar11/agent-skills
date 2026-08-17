# Workflow Presets

Presets select the smallest delivery process that preserves the required evidence. They are not new skills and do not add another command surface.

Select one explicitly with `@feature-delivery <preset> <goal>`, or let triage select it from the conditions below. Repository `AGENTS.md` rules always win.

| Preset | Use when | Record | Execution | Gates |
|---|---|---|---|---|
| `fast-contract` | Existing verified HTTP/event contract; one consumer module plus adapter/host/tests; no persistence, auth, public contract, migration, shared UI or cross-feature ownership change | Contract Snapshot in task header or existing issue | One Worker, one Validator, focused checks, final build | One user decision only for `decision_required`; retry same task once |
| `standard` | Well-understood feature or scoped refactor with product behavior but no hard-to-reverse architecture decision | Feature brief + plan | Single worker inline or sequential tasks | Plan review, focused checks, final verification |
| `full` | New or changed public contract, persistence, auth, migration, shell/design-system boundary, Figma/new screen, cross-repo dependency, or real parallel ownership | Brief/PRD, ADR when needed, plan with ownership/waves | Coordinator + waves | Contract-first gate, Validators, full post-execution sequence |

## Routing

1. A user-named preset wins when its conditions hold.
2. Triage selects `fast-contract` when every eligibility condition is evidenced.
3. Triage selects `full` when any `full` trigger exists. Otherwise use `standard`.
4. Promote only upward (`fast-contract` → `standard`/`full`, `standard` → `full`) when new evidence changes eligibility. Never restart the workflow merely because a user answered a decision already recorded in the same task.

## Shared safety floor

Every preset keeps: explicit write scope, current contract/code evidence, focused verification, protected baseline tests, fresh final evidence, and no unapproved external mutation. Presets only remove ceremony that does not add evidence for that risk level.
