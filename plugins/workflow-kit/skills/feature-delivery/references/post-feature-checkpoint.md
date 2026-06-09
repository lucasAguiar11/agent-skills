# Post-feature Checkpoint

Run at the end of **every** feature: after verification passes, before commit/PR. The measurement is cheap and runs every time; the **actions** only fire at thresholds — so interventions stay sporadic (every 1–2 features in practice).

Two hard rules:

- **Always report the result**, even when no threshold fires (`clean` is a valid, required outcome).
- **A triggered action is a proposal, never an execution.** It becomes its own feature/ADR for the user to approve — it must not expand the scope of the feature being delivered (scope guard).

A project `AGENTS.md` may define its own metrics, commands, and thresholds (e.g. a section named `Checkpoint de Arquitetura` / `Architecture Checkpoint`); when present, the project version takes precedence. The defaults below apply otherwise.

## Check 1 — Garbage (threshold: any occurrence)

- **Leftover markers:** grep source dirs for `TEMP-`, `TODO`, `FIXME`. Expected: 0. A `TODO`/`FIXME` survives only if its text links an issue or feature ID.
- **Orphan declarations:** every `private`/file-local declaration **added by the feature diff** must have at least one usage (grep the symbol). No usage → remove before the PR.
- **Diff duplication:** a new block near-identical to an existing one in the **same module** → unify before the PR. Near-identical to a block in **another module** → counts toward Check 2's copy counter.

## Check 2 — Structural duplication (threshold: 3rd copy)

When the feature adds the **third** near-copy of the same structural pattern across modules (table/grid, scan input, empty state, form field, card variant…), propose: promote the pattern to the shared layer (design system / shared module) and migrate the existing consumers — as its **own feature**.

Rationale: two copies are tolerable isolation; three copies means divergence bugs (a fix lands in one copy and not the others).

## Check 3 — Central integration point growth (threshold: ~6 branches)

Hub files (app shell, router, DI registry, navigation `when`/`switch`) grow by one branch or parameter per feature. When a hub accumulates **≥ 6** per-feature branches, propose an ADR introducing a feature contract/registry (interface + list registration) so new features stop growing the hub.

Count the branches in the hub's dispatch site(s); report the number even below threshold so growth is visible release over release.

## Check 4 — First real data integration (threshold: 1st occurrence)

The first time any feature replaces mock/sample data with a real source (API, DB, file), **stop**: define the data-layer pattern (e.g. repository + async streams) in a **single ADR** that applies to all features. Never let each feature improvise its own data access shape.

## Report format

One line per check, always:

```
Checkpoint: 1 garbage=clean · 2 copies(table)=2/3 · 3 hub(App.kt)=4/6 · 4 real-data=0 → no action
```

or, when something fires:

```
Checkpoint: 2 copies(table)=3/3 → TRIGGERED — proposal: promote shared <Component>, migrate consumers (own feature)
```
