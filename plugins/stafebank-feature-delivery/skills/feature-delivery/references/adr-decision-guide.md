# ADR Decision Guide

Create an ADR only when the decision is important enough that future developers or agents must understand why it was made.

## ADR Required

Create an ADR when the decision:
- is hard or expensive to reverse;
- affects multiple features, modules, services, or teams;
- defines a public or semi-public contract;
- changes persistence, auth, messaging, deployment, observability, or integration strategy;
- introduces a new architectural pattern;
- rejects a tempting alternative that will likely come up again.

## ADR Usually Not Needed

Do not create an ADR for:
- local implementation details inside one module;
- naming choices;
- small UI changes;
- obvious library usage already standard in the repo;
- temporary workarounds captured in the implementation plan;
- choices that can be reversed by editing one file with no external impact.

## ADR Prompt Inputs

Before invoking `create-architectural-decision-record`, gather:
- decision title;
- context/problem;
- chosen decision;
- alternatives considered;
- stakeholders/owners;
- consequences;
- implementation notes;
- related feature IDs.

## Status Rule

Start new ADRs as `Proposed` unless the user explicitly accepts the decision.

