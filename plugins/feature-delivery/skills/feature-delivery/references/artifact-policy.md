# Artifact Policy

Use the smallest set of artifacts that makes the work clear and parallelizable.

## Artifact Levels

### Level 1: Feature Brief + Plan

Use for small or well-understood changes.

Examples:
- Add a single endpoint.
- Adjust validation behavior.
- Add a narrow UI state.
- Make a scoped refactor inside one module.

Required artifacts:
- `docs/features/<FEATURE-ID>.md`
- `docs/plans/<FEATURE-ID>-plan.md`

### Level 2: PRD + Plan

Use when product behavior, user impact, or acceptance criteria are not obvious.

Examples:
- New user-facing workflow.
- Feature involving multiple personas or states.
- Business rules that need stakeholder review.
- Feature with multiple rollout phases.

Required artifacts:
- `docs/features/<FEATURE-ID>.md` or `docs/prds/<FEATURE-ID>.md`
- `docs/plans/<FEATURE-ID>-plan.md`

Use the `prd` skill when the requirement is vague or stakeholder-facing.

### Level 3: PRD + ADR + Plan

Use when the implementation depends on a technical decision that is costly to reverse or affects multiple teams/features.

Examples:
- Authentication/session strategy.
- Database model or persistence boundary.
- Message queue/event strategy.
- Public API or library contract.
- Module architecture.
- External integration strategy.

Required artifacts:
- PRD or feature brief.
- ADR in `docs/adr/`.
- Implementation plan.

Use `create-architectural-decision-record` for the ADR.

## Existing Codebase Rule

For changes in an existing codebase, discovery comes before planning.

Discovery must identify:
- current implementation files;
- owners or modules affected;
- read-only dependencies;
- contracts that cannot be broken;
- tests or manual checks that prove behavior.

## Output Rule

Every artifact should include the same `feature_id` so tools, humans, and agents can connect PRD, ADR, plan, execution, and review.

Artifacts with unresolved blocking decisions must stay `draft` or `blocked`. Use `planned` only when the plan shape is complete and waiting for user approval.
