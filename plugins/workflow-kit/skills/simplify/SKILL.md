---
name: simplify
description: Review changed code for reuse, quality, and efficiency, then fix any issues found. Use after implementing a feature, before commit/PR.
---

# Simplify: Cleanup Pass

Review all changed files for reuse, quality, and efficiency. Fix any issues found.

**Boundary:** this skill *applies* fixes, and only inside those three axes. It is not a full code review — correctness, security, architecture and performance judgment belong to `code-review-and-quality`, which reports findings and never edits code. Do not widen this skill's mandate to cover them; if a pass surfaces something outside the three axes, report it and leave it for that skill.

## Phase 1: Identify Changes

Run `git diff` (or `git diff HEAD` if there are staged changes) to see what changed. If there are no git changes, review the most recently modified files that the user mentioned or that were edited earlier in this session.

## Phase 2: Review From Three Angles

Launch three review passes in parallel as subagents when the platform supports concurrent subagent dispatch; otherwise run them sequentially in this order. Give each pass the full diff so it has complete context, plus the **Out of Scope** rules below — a pass that never sees them will report cosmetic rewrites as findings.

### 1. Code Reuse Review

For each change:

1. **Search for existing utilities and helpers** that could replace newly written code. Look for similar patterns elsewhere in the codebase — common locations are utility directories, shared modules, and files adjacent to the changed ones.
2. **Flag any new function that duplicates existing functionality.** Suggest the existing function to use instead.
3. **Flag any inline logic that could use an existing utility** — hand-rolled string manipulation, manual path handling, custom environment checks, ad-hoc type guards, and similar patterns are common candidates.

### 2. Code Quality Review

Review the same changes for hacky patterns:

1. **Redundant state**: state that duplicates existing state, cached values that could be derived, observers/effects that could be direct calls.
2. **Parameter sprawl**: adding new parameters to a function instead of generalizing or restructuring existing ones.
3. **Copy-paste with slight variation**: near-duplicate code blocks that should be unified with a shared abstraction.
4. **Leaky abstractions**: exposing internal details that should be encapsulated, or breaking existing abstraction boundaries.
5. **Stringly-typed code**: using raw strings where constants, enums (string unions), or branded types already exist in the codebase.
6. **Unnecessary JSX/view nesting**: wrapper elements that add no layout value — check if inner component props already provide the needed behavior.
7. **Unnecessary comments**: comments explaining WHAT the code does (well-named identifiers already do that), narrating the change, or referencing the task/caller — delete; keep only non-obvious WHY (hidden constraints, subtle invariants, workarounds).

### 3. Efficiency Review

Review the same changes for efficiency:

1. **Unnecessary work**: redundant computations, repeated file reads, duplicate network/API calls, N+1 patterns.
2. **Missed concurrency**: independent operations run sequentially when they could run in parallel.
3. **Hot-path bloat**: new blocking work added to startup or per-request/per-render hot paths.
4. **Recurring no-op updates**: state/store updates inside polling loops, intervals, or event handlers that fire unconditionally — add a change-detection guard so downstream consumers aren't notified when nothing changed. Also: if a wrapper function takes an updater/reducer callback, verify it honors same-reference returns (or whatever the "no change" signal is) — otherwise callers' early-return no-ops are silently defeated.
5. **Unnecessary existence checks**: pre-checking file/resource existence before operating (TOCTOU anti-pattern) — operate directly and handle the error.
6. **Memory**: unbounded data structures, missing cleanup, event listener leaks.
7. **Overly broad operations**: reading entire files when only a portion is needed, loading all items when filtering for one.

## Out of Scope (Do Not Change)

The three angles above are the whole mandate: reuse, quality (hack/bug/leak), efficiency. A rewrite that fits none of them is not a finding, no matter how much "cleaner" it looks. Do not:

1. **Destructure and remount the same object** to hand it to the next layer (`const { a, b } = body; execute({ a, b })`) when `execute(body)` — or the explicit field map already there — works.
2. **Reformat call sites for tidiness** — `async` vs `.then`, renaming to taste, reordering fields — with no reuse, quality, or efficiency finding behind it.
3. **Invent a local style** when a neighboring call site already shows the project's pattern (e.g. the same controller's `findAll` already does `execute(query)`).

If the only difference after the edit is the same data in a different shape, leave the code as the feature author wrote it. Shape-only rewrites cost review time and pull the code away from the repo's real pattern.

Touch that code only when:

1. the edit removes real duplication of an existing helper or pattern, or
2. the current form is a genuine bug risk (fields silently dropped, wrong mapping, drift when the DTO gains a field), or
3. the user explicitly asked for that refactor.

When 1 or 2 applies, follow the pattern the repo already uses at a sibling call site — do not introduce a third form.

## Phase 3: Fix Issues

Aggregate the findings from all three passes and fix each issue directly. Drop any finding that falls under **Out of Scope** before fixing anything. If a finding is a false positive or not worth addressing, note it and move on — do not argue with the finding, just skip it.

When done, briefly summarize what was fixed (or confirm the code was already clean).
