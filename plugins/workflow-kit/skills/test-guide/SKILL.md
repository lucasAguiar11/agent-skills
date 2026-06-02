---
name: test-guide
description: Audit and design useful tests for this project. Use when writing tests, reviewing test quality, deciding unit vs integration vs E2E, avoiding placebo tests, or when feature-delivery review/execute touches domain rules, persistence, validation, or API behavior.
---

# Test Guide

Use this skill to decide whether tests are worth adding or keeping.

The goal is not more tests. The goal is evidence that catches bugs the project actually cares about.

## Default Rule

Before adding or approving a test, answer:

- What bug would this test catch?
- Which boundary does it verify: domain rule, application use case, API contract, persistence integration, or full flow?
- Is the same behavior already covered at a stronger layer?
- Would this test fail if the implementation were wrong, or is it only mirroring the implementation?

If the answer is unclear, do not add the test yet. Call it a gap or ask for the intended risk.

## Worth Testing

Prioritize:

- domain rules with branching;
- hierarchy, lifecycle, multi-tenancy, permission, financial, or persistence invariants;
- data integrity transformations and transaction boundaries;
- validation rules that protect business behavior, not generic library behavior;
- critical create/update/archive/move flows;
- error paths and blocked transitions;
- integration points where repository, Prisma, schema, or controller contracts can drift.

## Usually Not Worth Testing

Avoid:

- framework behavior;
- one-line getters/setters/delegations;
- tests that only assert a mocked dependency was called;
- tests that duplicate the implementation shape;
- repeated variants with no new branch;
- static field existence or DTO shape tests unless they guard a real regression;
- broad smoke tests that pass while the business rule can still be broken.

## Layers

- Unit: pure domain policies, entity invariants, use case branching with in-memory fakes.
- Integration: API/schema/use case/repository with real or realistic dependencies.
- E2E: full user/API flow when several layers must prove they work together.

Prefer the lowest layer that proves the behavior without mocking away the risk. Use integration tests for transaction and Prisma behavior when a fake repository cannot prove the issue.

## Project Rules

- Existing project: add tests only when they protect changed behavior or an explicit review finding.
- Do not add tests for optics.
- It is acceptable to remove weak tests after they served as temporary scaffolding.
- If a test creates false confidence, say so directly and either delete it or replace it with a useful boundary test.
- For `feature-delivery`, any execution that changes domain rules, validation, archive/status behavior, hierarchy movement, Prisma schema, or API contracts should include a test-quality check before completion.
- Do not add, remove, or rewrite tests during a test-quality review unless the user explicitly approves the proposed changes.

## Test Integrity Gate

A red test exists to stop you. Making it green by editing the test instead of the code defeats its purpose. There are only two honest ways to turn a red test green: fix the production code, or change the test because the contract it asserts genuinely changed. The second is the exception and must be justified — never the default escape hatch.

### Baseline is protected

The green baseline is the set of tests that pass before your change — concretely, the tests on the base branch. Use `git` to establish it: `git diff --stat <base>...HEAD -- '**/*test*' '**/*spec*'` shows which test files you touched, and `git diff <base>...HEAD -- <test-file>` shows exactly how. If you cannot see a test in the diff, you did not change it; if you can, you must classify why (below).

During execution (especially `feature-delivery` `execute`), a baseline test must not be deleted, skipped, or weakened to make a change pass. "Weakening" includes:

- removing or commenting out assertions;
- loosening matchers (`toEqual` → `toBeDefined`, exact → partial);
- adding `skip` / `only` / `xit` / `it.todo` / `return` early-outs;
- widening tolerances or timeouts to swallow a failure;
- turning the body into a no-op;
- changing an expected value to match the wrong output the code now produces;
- weakening outside the test file: lowering `coverageThreshold`, adding `testPathIgnorePatterns` / `exclude` globs, narrowing the test match pattern, or disabling a suite in CI config. The test runner config and CI workflow are part of the baseline too.

### Classify every baseline test change

When a baseline test must change, classify why and tie it to evidence:

- `feature-driven`: the asserted behavior changed on purpose and a plan task / feature brief documents that contract change. Allowed. The change must map to that task, and the new assertion must be at least as strong as the old one.
- `test-was-wrong`: the test asserted incorrect behavior (a bug in the test itself). Allowed only with explicit user approval — flag it, do not silently rewrite.
- `escape-hatch`: changing the test to dodge a real failure of the code. Forbidden. Stop and fix the code, or report the failure.

A test change that does not map to a documented contract change is an `escape-hatch` by default. Do not reclassify it as `feature-driven` without pointing to the specific task.

### Strength must not decrease

A changed test must catch the same class of bug or a stronger one — never fewer assertions for the same behavior. Net meaningful coverage may not drop without explicit user approval.

### Prove `feature-driven` changes red-green

A test rewritten for a new contract must fail against the old implementation and pass against the new one. If it passes against both, it is not testing the new contract — it is shaped to pass, and does not count as evidence.

### Flaky tests are not an escape hatch

"It's flaky" is the most common cover story for an `escape-hatch`. A genuinely flaky test unrelated to the change has exactly one honest path: prove the flake (show it failing and passing on unchanged code, or identify the non-determinism), then quarantine it explicitly — with user approval, a tracking note/issue, and a reason — never a silent `skip` buried in the diff. If the test fails deterministically because of your change, it is not flaky; it caught something.

### Evidence must come from the full suite

A skipped or filtered test reads as green. Completion evidence must come from the full suite (or the full relevant project/package), not from a filtered run of only the tests you touched. Report the suite total (`N passed, M skipped`) and account for every skip — an unexplained jump in skipped count is a regression in coverage, not a pass.

### Default actions

- Red test during execution → fix the code, not the test.
- Need to delete, skip, or weaken a baseline test → stop and ask for explicit approval, with the reason classified above.
- Cannot map a test edit to a planned contract change → treat it as `escape-hatch` and surface it instead of applying it.

## Approval Gate

Use two phases unless the user explicitly asks for direct implementation:

1. Diagnose:
   - inspect changed production behavior and current tests;
   - classify existing tests as `keep`, `improve`, `remove`, or `missing`;
   - propose exact test changes with file paths, test names, and what bug each test would catch;
   - state whether each proposed test is unit, integration, API contract, or E2E;
   - stop and ask for approval.
2. Apply:
   - only after explicit approval, edit tests in the approved scope;
   - run focused tests first, then broader verification;
   - report any remaining missing tests separately from passing commands.

Approval request format:

```text
Proposta de ajustes de teste:
- [add|update|remove] path: test name - boundary - bug caught

Posso aplicar esses ajustes?
```

If the user approves only part of the proposal, apply only that part.

## Review Output

When reviewing tests, classify each relevant test as:

- `keep`: catches a real bug or guards an important contract;
- `improve`: useful intent but wrong layer, too mocked, or missing assertions;
- `remove`: placebo, duplicate, or framework-only;
- `missing`: important behavior has no useful coverage.

Keep the report concise and list missing tests in priority order.
