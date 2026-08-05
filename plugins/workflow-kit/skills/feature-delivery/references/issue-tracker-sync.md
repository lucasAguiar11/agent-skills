# Issue Tracker Sync

Optional gate **after** the plan is reviewed: mirror the feature decomposition into the team's issue
tracker, so the work is visible where the team already looks.

Host-agnostic. The contract is the same for GitHub, GitLab or Jira; only the CLI/API changes.

The artifacts in `docs/` stay the source of truth. The tracker holds a **pointer and a checkbox**, not
a second copy of the plan — otherwise the two drift and nobody knows which one is current.

## When it runs

The unit being mirrored is the plan's `Task` block — one sub-issue per `Task`.

| Run | When |
|-----|------|
| **Yes** | The user asked for issues, AND the plan is `Validation: clean` |
| **Offer** | Plan is `clean`, has 3+ `Task` blocks, the team uses a tracker, and the user stopped at the plan — ask once, do not act |
| **Suggest** | Same, but the user asked for implementation upfront — do **not** stop mid-flow; put a one-line offer in the closing report instead |
| **No** | Before the plan reaches `Validation: clean` — the decomposition is still moving |
| **Skip** | Level 0 / single-workstream change, solo repo with no tracker, or user declined |

**An explicit user request overrides the 3-`Task` threshold.** The threshold only governs when *you*
may raise the subject; it never blocks what the user asked for. Below 3 `Task` blocks, do not raise
it on your own initiative — a single issue that duplicates a plan is pure overhead.

**Offer and Suggest differ only in timing, never in effect.** Neither creates anything. `Offer` asks
and waits, because the flow is already stopped at the plan. `Suggest` does not ask and does not wait
— it rides along in the closing report so a continuous execution flow never pauses on an outward-facing
side quest. The sync itself always needs an explicit yes.

## Placement in the flow

Two slots, decided by whether the flow is already stopped at the plan:

```
triage → brief/PRD → (ADR) → plan → review until Validation: clean
  → Parallelization / Wave Schedule written into the plan
  │
  ├─ user stopped at the plan ──► Issue Tracker Sync   ← ask here
  │                               → user approval → execute
  │
  └─ upfront "implement it" ────► execute → Post-execution
                                  → closing report carries the offer
                                  → Issue Tracker Sync   ← only if the user says yes
```

The late slot has a real cost: by then the work is done, so the sub-issues are created already
complete — a record of what shipped, not a board the team pulls from. Say so in the offer, and pass
the `Wave Execution Log` evidence into each issue so the closed state is justified. If the team needs
the board *before* the work, they have to stop at the plan — that is the `Offer` slot.

**After the parallelization sections, not before.** Each sub-issue's `Depends on` line is read from
`Parallelization` / `Wave Schedule`; sync earlier and every issue is created with its dependencies
blank.

**Never mirror a plan that is not `clean`.** Every applied finding rewrites titles, scope lines and
dependency rows — mirroring earlier means editing every issue again. A review round that renumbers
tasks (5 tasks became 7, or the reverse) invalidates half the sub-issues.

## Opt-in contract (ask before creating anything)

Creating issues is outward-facing and visible to the whole team. Confirm in **one** round, then act:

```text
Issue Tracker Sync:
- tracker + repo: <e.g. github: org/repo>
- parent:         <existing story/epic #, or none>
- scope:          <epics only | epics + sub-issues | one feature only>
- labels:         <default: inherit from the parent issue>
- assignee:       <default: the user requesting the sync>
- milestone:      <optional>
```

Two defaults worth stating out loud:

- **Labels are inherited from the parent issue.** The new issues must land in the same filters the
  parent already appears in, otherwise the team's saved views miss them.
- **Ask for the assignee explicitly.** An unassigned board reads as "nobody owns this". Discovering
  it after creating 18 issues costs a second round of API calls over every one of them.

## Hierarchy

Mirror the artifact hierarchy — do not invent a parallel one:

| Artifact | Tracker object |
|---|---|
| Existing product story (already in the tracker) | parent — **reuse, never recreate** |
| Feature brief / PRD (`docs/features/<FEATURE-ID>.md`) | epic, linked under the story |
| Plan `Task` block (`docs/plans/<FEATURE-ID>-plan.md`) | sub-issue of the epic |

Check for an existing parent before creating one. A duplicated story splits the team's history in two.

## Issue body comes from the artifact

Do not rewrite the content in tracker prose. Carry over what the brief and plan already say:

| Section | Source |
|---|---|
| Objective | sub-issue: Task `Objective`; epic: brief `Objective` |
| References | repo + path of brief, plan, ADR, spec section |
| Scope / Out of scope | Task `Files` + `Steps`, brief scope |
| Acceptance criteria | Task `Verification` + brief criteria, as checkboxes |
| Stop conditions | Task `Stop conditions` |
| Open decisions | `Decision State` items that touch this task |
| Depends on | `Parallelization` / `Wave Schedule` |

**References carry repo + path, never pasted content.** `dm-tech/api → docs/plans/FEAT-…-plan.md
(Task 3)` survives the plan being edited; a pasted copy does not.

## Blocking dependencies are stated in the issue

If a sub-issue cannot close without another repository shipping something, say it in the body under
its own heading. A dependency that lives only in the originating repo's plan is invisible to whoever
picks up the issue.

The counterpart repo gets a triage prompt, not an issue from you — that is `cross-repo-handoff.md`'s
job, and it runs whether or not any tracker is involved. Open an issue in the other repo only if the
user confirms that repo uses the same tracker; otherwise link the handoff prompt and stop there.

## Idempotency

The sync runs more than once — decomposition changes, scope gets cut, tasks merge.

The recorded numbers live in **one** place: the `issues:` block in the brief's frontmatter
(`templates/feature-brief.md`). Nowhere else. A number written into prose instead is a number the
next sync will not find, and an issue it will therefore duplicate.

```yaml
issues:
  tracker: github:org/repo
  parent: "#41"
  epic: "#42"
  tasks: ["Task 1: #43", "Task 2: #44"]
```

1. Before creating, read that block.
2. Numbers present → **update** those issues (title, body, checkboxes). Never create a second set.
3. A task that disappeared from the plan → close its issue as `not planned` with a one-line reason,
   and drop its entry from `tasks:`. Don't leave it orphaned and open.

## Bulk operations: prefer the CLI

An MCP tracker call costs a round trip and a response payload per issue, even when the useful output
is one line. Twenty label edits means twenty of those. A CLI loop is one call and one line each.

- **Create** (needs the returned id for linking): MCP or CLI, either works.
- **Repetitive edits** (assignee, label, milestone across N issues): use the CLI in a loop —
  `gh issue edit <n> --add-assignee <user>` — and print one line per issue.

If only MCP is available, trim the response — GitHub's MCP takes `minimal_output` and a `fields`
subset. Never pull full issue bodies back just to confirm an edit landed; confirm by listing once at
the end.

## After sync

- Write the parent, epic and sub-issue numbers into the brief's `issues:` frontmatter block, so the
  trace works in both directions and the next sync updates instead of duplicating.
- **Verify by listing, not by trusting the create responses**: `gh issue list --assignee <user>` (or
  the tracker equivalent) and confirm count, hierarchy and assignee.
- Report the parent, the epics, the first unblocked issue, and any issue that carries an open
  decision the team must answer before starting.
