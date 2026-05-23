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
