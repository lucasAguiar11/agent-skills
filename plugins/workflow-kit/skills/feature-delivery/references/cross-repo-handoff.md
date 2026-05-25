# Cross-Repo Handoff

When a feature in one repository depends on work in another repository (a new
endpoint, an event, a queue payload, a shared HTTP/contract change), the
dependency must not survive as a loose paragraph in the plan. The originating
side generates a ready-to-paste triage prompt for the other service, so the
counterpart feature starts with full context and the two sides stay coherent.

## When to generate

In `triage` or `plan`, the moment discovery shows the change requires work in
another repo, generate the handoff prompt. Signals:

- the plan calls an endpoint/event/queue that does not exist yet in the other repo;
- a gateway/port in this repo expects a contract the other repo must provide;
- the feature is only fully functional once the other repo ships something.

A fail-open or stub on this side does not remove the obligation — it hides it.
Generate the prompt anyway and record the dependency.

## What to generate

Output a single fenced block the user can copy into the other service's agent.
It must start with the orchestrator invocation for that platform
(`/feature-delivery`, `/workflow-kit:feature-delivery`, or `@feature-delivery`)
and embed everything the counterpart needs so it does NOT have to re-discover:

1. **Context & motivation** — which feature/repo originates this, and why the
   other repo is involved.
2. **Contract to honor (do not break)** — the exact shape this side consumes:
   route(s), method, request/response envelope, error codes, event name +
   payload, queue + routing key. Copy real field names from this repo's code.
3. **Proposed scope** — what the other repo should build, phrased as a
   suggestion ("adjust to that repo's architecture"), not a mandate.
4. **Decisions to confirm (do not assume)** — the open questions that belong to
   the other repo's domain (route shape, storage, cron cadence, auth).
5. **Constraints** — reuse existing patterns, do not duplicate integrations,
   keep the same `feature_id` linkage, register in that repo's `docs/features.md`.
6. **Instruction to triage first** — tell the counterpart to run triage +
   discovery before planning, and to report the plan before implementing.

## Prompt skeleton

```text
/feature-delivery <one-line goal of the counterpart feature>

## Context
Originating: <THIS-REPO> <FEATURE-ID> — <one line>. <Why the other repo is involved.>

## Contract this side expects (DO NOT BREAK)
- <route/event/queue with exact method + path/name>
- Success envelope: <shape with real field names>
- Error/absence: <how "not found"/error is signaled and how this side maps it>
- Minimum response fields: <list>

## Proposed scope (adjust to this repo's architecture)
- <what to build>
- <data/strategy suggestion, e.g. cache + cron, direct call>

## Decisions to confirm with me (do not assume)
- <route shape / storage / cadence / auth — whatever belongs to this repo's domain>

## Constraints
- Reuse existing <pattern/client> instead of duplicating.
- Same feature_id linkage; register in docs/features.md.
- Envelope/error conventions of this repo.

Run triage + discovery first, then show me the plan before implementing.
```

## After generating

- Record the dependency in this side's plan (a one-line note under `Tasks` for
  Level 0, or a `Dependencies` row otherwise): `cross-repo → <target-repo>,
  status: pending-counterpart`.
- Keep the link traceable: when the counterpart feature gets an ID, note it
  (`linked_feature_id`).
- The originating feature MAY reach `done` with the counterpart still pending
  (e.g. behind a fail-open), but the pending cross-repo dependency must be
  stated explicitly in the plan — never silently closed.
