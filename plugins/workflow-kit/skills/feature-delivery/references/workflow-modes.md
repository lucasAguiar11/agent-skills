# Workflow Modes

Infer the mode from the request.

## Mode Pipeline and Subagents

| Mode | Default subagent use | Parallelism |
|---|---|---|
| `triage` | Optional Scouts for docs/code/contracts | yes, read-only |
| `plan` | Scout discovery, then Planner artifacts | partial |
| `review` | Reviewer structural + Reviewer tests | yes, read-only |
| `execute` | Coordinator + Workers/Verifiers by wave | yes, by wave |
| `update` | Scout impact scan, then Planner diff | usually serial |

Read `references/subagent-policy.md` for role mapping, `references/model-tier-policy.md` for model tiers, and `references/subagent-handoff.md` for launch/handoff rules.

## triage

Use when the user is exploring, unsure, or asking what process to use.

Output:

- request classification;
- recommended artifacts;
- whether ADR is likely needed;
- likely blocking decisions;
- whether subagents may help;
- suggested Scout workstreams if discovery would speed planning;
- a ready-to-paste cross-repo triage prompt when the change depends on another repo (`references/cross-repo-handoff.md`);
- next concrete command or action.

Optional subagents:

| Workstream | Role | Objective |
|---|---|---|
| docs | Scout | Map relevant V1 docs and open questions |
| code | Scout | Map current implementation and impacted modules |
| contracts | Scout | Identify API/persistence/integration boundaries |

Launch Scouts in parallel only when paths are read-only. Stop after recommendation unless the user asks to create files.

## plan

Use when the user asks to prepare, document, plan, or create artifacts.

Steps:

1. Identify or create `feature_id`.
2. Update `docs/features.md`.
3. Run discovery for existing codebases. Use parallel Scouts when multiple areas are unrelated.
4. Create/update feature brief or PRD.
5. Decide whether ADR is needed.
6. Classify open decisions as blocking, non-blocking, or assumptions.
7. If blocking decisions exist, ask the user before finalizing, or create artifacts only as `draft`/`blocked`.
8. Create/update implementation plan using `templates/implementation-plan.md`. For a Level 0 micro-change, keep only `Goal`, `Tasks`, `Verification`, `Risks` (see Plan Weight Rule in `references/artifact-policy.md`).
9. When work can be parallelized, add `Parallelization`, `Wave Schedule`, and `Subagent Launch Spec`. Omit these for single-workstream plans.
10. When the feature depends on another repo, generate the cross-repo triage prompt (`references/cross-repo-handoff.md`) and record the dependency in the plan.
11. Summarize blocking decisions, assumptions, open questions, and suggested execution waves; stop for approval.

Planner subagents may draft PRD/plan/ADR sections, but the parent agent must keep `feature_id`, paths, and repository conventions consistent.

## review

Use when the user asks to validate a plan, PRD, ADR, or feature set.

Check:

- cross-document consistency;
- feature dependencies;
- ownership and write scopes;
- missing acceptance criteria;
- missing verification;
- hidden ADR decisions;
- hidden blocking decisions listed only as open questions;
- `Subagent Launch Spec` completeness when the plan is parallelizable;
- wave order vs task dependencies;
- test usefulness and missing coverage when execution added tests or touched domain rules, validation, persistence, archive/status behavior, hierarchy movement, or API contracts.

For Level 0 / single-workstream plans, skip the parallelization checks (launch spec, wave order) — their absence is correct by design (see Plan Weight Rule in `references/artifact-policy.md`). Do not report missing wave/subagent sections as findings.

Prefer parallel Reviewer subagents when reviews are independent:

| Workstream | Role | Skill | Scope |
|---|---|---|---|
| structure | Reviewer | `review-plan` | full plan consistency |
| tests | Reviewer | `test-guide` | diagnose-only test quality |
| domain | Reviewer | read-only | docs V1 vs plan claims |

Use `review-plan` for implementation plans.
Use `test-guide` for test-quality review.

Output location: append the findings to the plan being reviewed (`docs/plans/<FEATURE-ID>-plan.md` or the phase plan when multi-feature), in a section named `Review Findings` (pre-execute) or `Post-execute Updates` (post-execute). Use `templates/review-findings-section.md` as the shape. **Never** create a separate `*-review*.md` / `*-review-rN.md` file. Repeat rounds add rows or a new dated subsection inside the same section — git history covers the rest.

## execute

Use only when the user explicitly asks to execute or implement.

The parent agent is the **Integration Coordinator**. Read `references/subagent-handoff.md` before launching work.

Steps:

1. Read the approved plan and confirm status is `approved` or `in_progress`.
2. Verify ownership, stop conditions, `Wave Schedule`, and `Subagent Launch Spec`.
3. Set plan status to `in_progress` if not already.
4. Run optional wave 0 work: contract confirmation, discovery, or pre-review.
5. For each wave:
   - resolve `model_tier` per launch-spec row and pass `model` when supported;
   - launch eligible subagents in parallel;
   - collect handoff blocks;
   - run wave verification;
   - update `Wave Execution Log`;
   - stop if any workstream is `blocked` or `failed`.
6. After the last wave, run `Final Verification`.
7. Run the Post-execution Sequence (`SKILL.md` → `## Post-execution Sequence`): `simplify` on the diff, Post-feature Checkpoint, `test-guide` (stop for explicit approval before editing tests), `verification-before-completion`, then set status to `done` and sync it across `docs/features.md`, the feature brief/PRD, and the plan frontmatter.

If the plan has no launch spec and the work is small, the Coordinator may execute directly without subagents.

If the plan has parallel workstreams but no launch spec, stop and update the plan in `update` mode before continuing.

## update

Use when scope, requirements, decisions, or implementation details changed.

Steps:

1. Find the affected feature artifacts.
2. Optional Scout subagent: map impact across docs, code, tests, and dependent features.
3. Update the source artifact first.
4. Propagate changes to dependent artifacts.
5. Reconcile `Parallelization`, `Wave Schedule`, and `Subagent Launch Spec` when ownership or dependencies changed.
6. Re-run the decision gate.
7. Re-run review before execution.

When the update is the response to a previous review, record the applied changes in the same plan's `Review Findings` or `Post-execute Updates` section (status `applied`, `deferred → <where>`, or `rejected`). Do not open a new review file.
