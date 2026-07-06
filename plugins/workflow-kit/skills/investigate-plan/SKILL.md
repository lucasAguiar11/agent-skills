---
name: investigate-plan
description: Investigate an ambiguous bug/feature request, converge on a design with the user, then hand off a plan for approval — no docs/features.md, ADR, or plan file required. Use when the request has more than one plausible design (e.g. "we have two ways X can happen, what should we do") and a wrong guess would be expensive to unwind. Skip for single-file, unambiguous changes.
---

# Investigate → Design Gate → Plan

A lean version of `feature-delivery`'s discovery step, for changes that need real investigation and a design decision but not the full artifact set (feature brief, ADR, `docs/plans/*.md`). The output is an approved plan turn (native plan mode), not a file on disk. Escalate to `feature-delivery` if investigation reveals the change is structural, cross-repo, or hard to reverse.

## 0. Should this even run?

If the change touches one file and has one obvious implementation, just make it — this skill is for when there's a real fork in the design (multiple valid interpretations, a bug whose root cause isn't yet clear, a "how should this behave" question).

## 1. Investigate

Read whatever files the user already pointed at directly — don't spend an agent dispatch on files you can just open.

For everything else the design depends on (related repositories/services, conventions elsewhere in the codebase, existing exceptions/utilities to reuse), fan out one background `Explore` agent per question, in parallel, not one broad agent doing all of it sequentially. Let them run in the background and keep going once dispatched.

## 2. Design gate

Once investigation results are in:

1. Call `advisor()` once, before presenting any design — this is "before committing to an interpretation," not a formality.
2. Split open questions into **blocking** (changes the shape of the solution, expensive to reverse later) and everything else. Ask the user only the blocking ones, batched into one `AskUserQuestion` call — don't interview them on things you can safely default.
3. Present your recommended design in a few lines: the fix, why, the one tradeoff worth naming. Not a survey of every option considered. Explicitly leave room for the user's own idea — if they have one, fold it in before locking the design, don't just validate your own.

## 3. Plan

With the design confirmed, produce the plan via the platform's native plan mode (`EnterPlanMode`/`ExitPlanMode` or equivalent) — not a written file. For anything with real surface area, dispatch a `Plan` agent, and explicitly ask it to check: *does every case that works today still work after this change?* That framing is what catches regressions a first pass misses (e.g. a filter that narrows correctly for the new case but silently drops an existing one).

## 4. Regression gate

Before presenting the plan to the user, call `advisor()` a second time — framed specifically as "does this plan preserve all currently-working behavior, or could it regress something?" This is a different question than step 2's advisor call; don't skip it as a duplicate.

## 5. Execute

Only after the user approves the plan turn. No status tracking, no `docs/plans/*.md`, no wave/subagent launch spec — those belong to `feature-delivery` when the work is actually parallel or large enough to need them.

## Escalate instead of continuing here when

- The decision changes persistence, a public/cross-service contract, auth, or a migration — use `feature-delivery` (ADR + plan) instead.
- The work is genuinely parallelizable across owners — `feature-delivery` has the wave/subagent machinery this skill deliberately omits.
