---
name: feature-delivery
description: Orchestrate lightweight feature delivery for new or existing projects using feature briefs, optional PRDs, optional ADRs, implementation plans, review gates, ownership boundaries, wave-based subagent launch/handoff, and Integration Coordinator execution for parallel human/AI work.
---

# Feature Delivery

Use this skill when the user wants to plan, decompose, document, review, update, or prepare execution for a feature, product change, refactor, architecture change, or scoped bugfix.

The goal is to make delivery easier for humans and AI agents working in parallel, without adding unnecessary ceremony.

## Plugin installation

When installed from the `workflow-kit` plugin (Cursor, Claude Code, or Codex), invoke the orchestrator as:

| Platform | Invocation |
|---|---|
| Cursor | `/feature-delivery` |
| Claude Code | `/workflow-kit:feature-delivery` |
| Codex | `@workflow-kit` or `@feature-delivery` |

Bundled helper skills follow the same plugin namespace in Claude Code, for example `/workflow-kit:review-plan`.

If the host loads plugin skills without namespace, `/feature-delivery` and `$feature-delivery` remain valid aliases.

Repository-specific domain rules still live in the project `AGENTS.md`, not in this skill.

## Feature ID format

The `<FEATURE-ID>` placeholder used throughout this skill resolves to a **date + slug**, never a sequential counter:

- Feature: `FEAT-YYYYMMDD-<slug>` (e.g. `FEAT-20260608-tela-bandeja`)
- ADR: `ADR-YYYYMMDD-<slug>` (e.g. `ADR-20260608-historico-global`)
- `YYYYMMDD` is the artifact's creation date (an absolute calendar date, **never** an incrementing count).
- `<slug>` is the title in kebab-case, without accents, kept short.

**Why date + slug instead of a sequential counter.** A sequential scheme (`FEAT-0001`, `FEAT-0002`, …) races between git worktrees: each worktree scans the same folder, finds the same highest number, and reserves the same next ID — because worktrees share one `.git` but have separate working trees, so neither sees the other's uncommitted artifact. There is no coordination point. Date + slug has no shared counter to contend for: two worktrees creating features the same day still differ by slug, so IDs never collide.

The rest of this document keeps the `<FEATURE-ID>` placeholder; this section is the single anchor for what that placeholder expands to.

Artifacts that already exist with a sequential ID are **not** renamed. The date + slug format applies only to artifacts created from now on.

## Default Flow

1. Classify the request and choose the lightest useful artifact set.
2. Register or update the feature in `docs/features.md`.
3. Create or update `docs/features/<FEATURE-ID>.md`.
4. Create an ADR only for structural or hard-to-reverse decisions. Before finalizing, scan existing ADRs by `scope`/`tags` frontmatter (dispatch the `adr-correlator` reader, or `grep -rl 'scope: "auth"' docs/`) and link any related prior decision in the plan's `adr:` frontmatter and `Dependencies` — do not re-decide something already settled.
5. When discovery shows the feature depends on another repo, generate a ready-to-paste triage prompt for that service (`references/cross-repo-handoff.md`) and record the dependency.
6. Run the decision gate before finalizing the plan.
7. Create or update `docs/plans/<FEATURE-ID>-plan.md`, then run its `Validation` self-check. Loop fixing the plan until `status: clean` — a plan with any `fail` row is `needs-resolve`, not `planned`.
8. Review the plan before implementation. The review output lives inside the plan itself — never as a separate `*-review*.md` file.
9. When work can run in parallel, add `Parallelization`, `Wave Schedule`, and `Subagent Launch Spec` to the plan.
10. In `execute`, act as Integration Coordinator: resolve model tiers, launch subagents by wave, collect handoffs, update `Wave Execution Log`, and advance only after verification passes.
11. After verification passes — and before commit/PR — run the Post-feature Checkpoint (`references/post-feature-checkpoint.md`) and report its result, even when clean. Triggered actions become proposals (own feature/ADR), never silent scope expansion.
12. Do not execute implementation unless the user approves or explicitly asks for execution.

When a plan, feature brief, PRD, or ADR is large and you only need part of it, offload the read to a bundled `Reader` agent (`workflow-kit:plan-reader`, `feature-reader`, `adr-reader`, `adr-correlator`, `plan-detail-reader`, `feature-index-reader`) instead of loading the whole file into context. See `references/subagent-policy.md` (Bundled Reader Agents). Read small docs inline — a Reader round-trip only pays off on large ones.

## Feature Registration

When registering a feature (step 2):

- Each worktree creates and edits only **its own** `docs/features/<FEATURE-ID>.md`. Never touch another worktree's feature file.
- The row added to the `docs/features.md` table must be inserted **ordered by ID (date)**, not appended as a fixed line at the same shared bottom of the table. Two worktrees that both append to the same trailing position produce overlapping edits on the same line and conflict on merge; inserting in date order means each new row lands at a different position and the index file merges cleanly.

## Review Output Location

Reviews — pre-execute or post-execute — write their findings as a section appended to the plan they are reviewing (`docs/plans/<FEATURE-ID>-plan.md` for a single feature, or the phase-level plan when the review spans multiple features). Use the section name that matches the moment:

- `Review Findings` — pre-execute review of an unapproved plan.
- `Post-execute Updates` — post-execute review after the plan was implemented.

Each finding row must carry: `# / Severity / Area / Finding / Decision / Status` (`applied` / `deferred → <where>` / `rejected`).

Do not create files like `<FEATURE-ID>-review.md`, `<FEATURE-ID>-review-rN.md`, `FASE-X-review.md`, or `FASE-X-review-rN.md`. Repeated review rounds add new rows (or a new dated subsection) to the same plan — git history covers the rest.

## Decision Gate

Before marking a feature or plan as `planned` or ready for review, classify open decisions:

- `blocking`: changes persistence, hierarchy, public/semi-public contracts, domain rules, authentication, authorization, multi-tenancy, migrations, integrations, execution order, or ownership.
- `non-blocking`: can be decided during execution without changing the plan shape or artifact contracts.
- `assumption`: a planner choice that is safe to proceed with and easy to reverse.

If any blocking decision exists, ask the user before finalizing the plan, or create/update artifacts with status `draft` or `blocked` and list the blocker explicitly. Do not hide blockers under generic open questions.

Use status values consistently:

- `draft`: still being shaped.
- `blocked`: cannot be finalized until a decision is made.
- `planned`: complete plan, waiting for approval.
- `approved`: user approved execution.
- `in_progress`: implementation started.
- `done`: implementation and verification completed.

## Modes

Infer the mode from the user's request. If ambiguous, default to `triage`.

- `triage`: classify the request, identify needed artifacts, and propose next step.
- `plan`: create/update feature brief, PRD when needed, ADR when needed, and implementation plan.
- `review`: review an existing feature or plan for consistency, dependencies, ownership, and missing validation. When the review covers an implementation (post-`execute`), it MUST also include a test-quality review using the `test-guide` skill — never report the implementation review as done before running the test review and presenting its `keep/improve/remove/missing` output to the user.
- `execute`: execute an approved plan as Integration Coordinator, launching subagents by wave when the plan defines launch specs, respecting ownership, handoff, and verification gates.
- `update`: update existing artifacts after scope, requirements, or design changes.

### Mode preconditions (self-guiding)

Each mode has an entry condition. When it is not met, do not improvise the missing step — stop and tell the user the exact next action, then wait.

| Mode | Precondition | If missing, stop with |
|---|---|---|
| `plan` | feature registered in `docs/features.md` | "No feature registered — run `triage` first to classify and register." |
| `review` | a plan exists at `docs/plans/<ID>-plan.md` | "No plan to review — run `plan` first." |
| `execute` | plan `status: approved` AND `Validation` status `clean` | "Plan is not approved/clean — run `plan` until Validation is `clean`, then get user approval." |
| `execute` (parallel) | plan has `Subagent Launch Spec` + `Wave Schedule` | "Plan is parallel but lacks launch spec — update the plan first." |
| `update` | the target artifact exists | "Nothing to update — name the artifact or run `plan`/`triage`." |

Read `references/workflow-modes.md` when the mode is unclear or when switching modes.

## Artifact Selection

Use the smallest artifact set that gives enough clarity:

- Micro change (one logic path, no blocking decision/migration/contract change): inline plan (Level 0 — `Goal`, `Tasks`, `Verification`, `Risks` only).
- Small change: feature brief + plan.
- Medium feature: PRD + plan.
- Structural change: PRD + ADR + plan.
- Existing codebase change: discovery + feature brief/PRD + ADR if needed + plan.

Match section weight to the change: a single-workstream plan omits wave/subagent sections entirely. Read `references/artifact-policy.md` before creating artifacts.

## Related Skills

Use these local/project skills when appropriate:

- `prd`: create a PRD when the idea is broad, stakeholder-facing, or unclear.
- `create-architectural-decision-record`: create an ADR for structural decisions.
- `create-implementation-plan`: create a new plan.
- `update-implementation-plan`: update an existing plan.

Use installed/global workflow skills when available:

- `review-plan`: review implementation plans before execution.
- `verification-before-completion`: verify before claiming completion.
- `test-guide`: audit test usefulness whenever implementation adds tests or changes domain rules, validation, persistence, archive/status behavior, hierarchy movement, or API contracts.
- `commit` / `create-pr` / `pr-review`: delivery and review.
- `supersede-feature`: fold old/superseded features into the one that replaced them — condense their history into the successor brief, mark them `deprecated` with `superseded_by`, and `git rm` their dead plans (ADRs and briefs are kept).

## References

Load only the reference needed for the current action:

- `references/artifact-policy.md`: decide brief vs PRD vs ADR vs plan.
- `references/workflow-modes.md`: mode behavior and stop points.
- `references/adr-decision-guide.md`: decide whether a change needs an ADR.
- `references/parallel-work-guide.md`: ownership, write scope, dependency rules.
- `references/subagent-policy.md`: when and how to suggest or launch subagents; also documents the six bundled `Reader` agents for context offload.
- `references/model-tier-policy.md`: abstract tiers (`fast`, `standard`, `high`), defaults by role, escalation, platform model resolution.
- `references/subagent-handoff.md`: wave execution, handoff blocks, merge rules, Coordinator duties.
- `references/cross-repo-handoff.md`: when a feature depends on another repo, generate a ready-to-paste triage prompt for that service.
- `references/review-checklist.md`: review gates before execution.
- `references/post-feature-checkpoint.md`: post-feature debt checkpoint — garbage (dead code, leftover markers, diff duplication) every feature, plus threshold-gated structural checks (3rd copy, hub growth, first real data integration).

## Templates

Use templates as output shapes, adapting paths only when the user or repository already has a stronger convention:

- `templates/feature-index.md`
- `templates/feature-brief.md`
- `templates/prd.md`
- `templates/adr.md`
- `templates/implementation-plan.md`
- `templates/subagent-task.md`
- `templates/review-findings-section.md` (section block — append to the plan, never a standalone file)

## Required Gates

- Do not create an ADR for a trivial or easily reversible choice.
- Do not finalize an ADR with an empty `scope` frontmatter — an unscoped decision is invisible to `adr-correlator` and will be re-decided later.
- Do not enter `plan`, `review`, `execute`, or `update` while its precondition (see Modes → Mode preconditions) is unmet — stop and surface the exact next action instead of improvising.
- Do not implement before there is an approved plan, unless the user explicitly asks for a very small direct change.
- Do not mark a plan `planned` or send it for review while its `Validation` status is not `clean`, or while the `Traceability Matrix` (medium+ features) has any `gap` row. Fix the plan and re-run the self-check first.
- Do not assign parallel work without non-overlapping write scopes.
- Do not launch parallel Workers across layers without a contract-first gate when shared ports/DTOs/enums/migrations are involved.
- Do not advance to the next wave while any workstream in the current wave is `blocked` or `failed`.
- Do not allow Workers to declare feature completion; only the Integration Coordinator runs final verification and sets status to `done`.
- Do not execute parallel work from an approved plan that lacks `Subagent Launch Spec` and `Wave Schedule`; update the plan first.
- Do not add `Wave Execution Log`, `Wave Schedule`, or `Subagent Launch Spec` to a single-workstream plan. Record execution as a one-line note under `Tasks`; add those sections only when the plan defines actual parallel work.
- Do not launch subagents from a launch spec row that lacks `model_tier`; use `references/model-tier-policy.md` defaults when drafting the plan.
- Do not allow a plan to mutate another feature's owned module without recording the dependency and impact.
- Do not claim completion without fresh verification evidence.
- Do not set a feature to `done` (or any status change) in only one place. The status in `docs/features.md` (index), the feature brief/PRD, and the plan frontmatter must all match. A status changed in the brief but stale in the index is a defect — sync all three.
- Do not delete, skip, or weaken a test that passed before the change in order to make execution green. Tests passing before the change form the protected baseline (see `test-guide` Test Integrity Gate). Any baseline test change must be classified `feature-driven` (mapped to a specific plan task that changes the asserted contract) and proven red-green, or `test-was-wrong` (explicit user approval first). A test edit that cannot be mapped to a planned contract change is an `escape-hatch`: stop, fix the code, and surface it to the user instead of applying it.
- Do not finish an implementation review without invoking `test-guide` to audit the tests changed or added by the feature. Present the `keep/improve/remove/missing` classification, ask explicit approval before modifying any test, and do not mark the review as approved while `missing` items of medium or higher severity remain unaddressed.
- Do not write review output to a separate file. Append `Review Findings` (pre-execute) or `Post-execute Updates` (post-execute) inside the plan being reviewed. Repeat rounds add rows/subsections to the same section — never new `*-review*.md` files.
- Do not declare delivery complete or open a PR without running the Post-feature Checkpoint (`references/post-feature-checkpoint.md`) and reporting its result — clean or triggered. A triggered action is a proposal for its own feature/ADR; executing it inside the current feature's scope is a scope violation.
