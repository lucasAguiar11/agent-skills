---
name: supersede-feature
description: Fold one or more old/superseded features into the new feature that replaced them — condense the relevant history into the successor's brief, mark the old ones deprecated with superseded_by, and git rm their dead plans (which stay recoverable in git history). Use when features are obsolete, replaced, ultrapassadas, antigas, or when a new feature supersedes earlier ones.
---

# Supersede Feature

Use this when a newer feature has replaced one or more older ones and you want the
history consolidated instead of scattered across dead `docs/features/` and
`docs/plans/` files.

It belongs to the `workflow-kit` `feature-delivery` flow. Invoke as
`/workflow-kit:supersede-feature`. Repository rules in `AGENTS.md` win over this
skill.

## Principle

Git already keeps everything forever. So the merge is not about *preserving* the
old files — it is about deciding what stays **visible in the working tree**:

- The **why / decision / outcome** of an old feature has lasting value → fold a
  condensed version into the successor's brief.
- The **plan** (`*-plan.md`) was scaffolding for *how* to build it → the code is
  now the answer. `git rm` it; it lives on in history.
- **ADRs are never deleted.** They are the permanent record. Relink them from the
  successor instead.

## Inputs

- `successor` — the feature ID that replaces the others (e.g. `FEAT-20260630-nova`).
- `superseded` — one or more old feature IDs being folded in.

If the user names only the successor, find candidates: features in
`docs/features.md` with status `done`/`deprecated` whose `impacts`/scope overlap
the successor. Propose the list and confirm before deleting anything.

## Procedure

1. **Read the old briefs.** For each superseded ID read `docs/features/<ID>.md`.
   If a brief is large, dispatch `workflow-kit:feature-reader` instead of loading
   it whole. You only need: objective, key decision(s), final outcome, ADR links.
   Ignore the plan body — that is the part being dropped.

2. **Fold into the successor brief.** Append (or extend) a `## History` section in
   `docs/features/<successor>.md`, one condensed entry per superseded feature:

   ```md
   ## History

   Supersedes:

   - **FEAT-20260101-antiga** — <one line: what it did and why it existed>.
     Replaced because <reason>. Decisions: [ADR-…](../adr/ADR-….md). Detail in
     git history (`git log -- docs/plans/FEAT-20260101-antiga-plan.md`).
   ```

   Keep each entry ~2–3 lines. If an old feature carried an ADR, add that ADR ID
   to the successor brief's `adr:` frontmatter list so the decision stays linked.

3. **Mark each old brief deprecated.** In `docs/features/<old>.md` frontmatter set
   `status: deprecated` and add `superseded_by: <successor>`. Leave the brief body
   in place — it is the breadcrumb the index points to.

4. **Drop the dead plans.** `git rm docs/plans/<old>-plan.md` for each superseded
   feature. Do **not** touch ADRs. Do not delete the old brief.

5. **Update the index** (`docs/features.md`):
   - Each superseded row → status `deprecated`.
   - Its `Docs` cell drops the `[plan]` link (the file is gone); keep `[brief]`.
   - Edit rows in place; do not reorder. The successor row is unchanged except its
     `Depends on` may now reference nothing from the dead features.

6. **Sync check.** Status must match in both places that still exist: the index row
   and the brief frontmatter. (The plan, the usual third place, is gone — so the
   `feature-delivery` three-place sync rule collapses to index + brief here.)

7. **Report and stop.** List: which features were folded, which plans were
   `git rm`'d, which ADRs were relinked. Do **not** commit unless the user asks —
   show the staged diff so they review before it lands.

## Guardrails

- Never delete an ADR or an old brief. Only plans get removed.
- Never run this on a feature whose successor is not `done`/in active use — folding
  history into a draft that may be abandoned just moves the scatter around.
- Reversible by design: every deleted plan is one `git revert`/`git checkout` away,
  because removal is the whole point being recorded in the commit.

## Self-check

Before reporting done, verify:

- [ ] Successor brief has a `## History` entry for every superseded ID.
- [ ] Every superseded brief has `status: deprecated` + `superseded_by: <successor>`.
- [ ] Every superseded plan is staged for deletion (`git status` shows `D`).
- [ ] No ADR file is staged for deletion.
- [ ] Index status for each old row matches its brief.
