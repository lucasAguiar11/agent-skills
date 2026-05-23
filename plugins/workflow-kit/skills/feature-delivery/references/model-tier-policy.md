# Model Tier Policy

Use abstract **model tiers** in plans and launch specs. The Integration Coordinator resolves each tier to a concrete model slug for the host platform when launching subagents.

Tiers optimize cost and latency without sacrificing quality on high-risk work.

## Tiers

| Tier | Intent | Typical use |
|---|---|---|
| `fast` | Low judgment, high volume, read-only or command output | Scout discovery, Verifier runs, checklist review |
| `standard` | Balanced implementation and review | Planner, most Workers, most Reviewers |
| `high` | Deep reasoning, cross-cutting risk, recovery | Critical Workers, domain-heavy review, failed-wave retry |

Do not treat `fast` as "cheap Worker." Workers that mutate code default to `standard` unless the slice is trivial and low-risk.

## Default Tier by Role

| Role | Default tier | Override up to `high` when |
|---|---|---|
| Scout | `fast` | Cross-repo architecture audit spans many domains |
| Planner | `standard` | Blocking persistence/API/multi-tenant decisions |
| Worker | `standard` | See risk triggers below |
| Reviewer | `standard` | Financial, auth, migration, or contract review |
| Verifier | `fast` | Never; escalate interpretation to Coordinator |
| CI investigator | `standard` | Flaky/multi-system CI with large logs |

## Risk Triggers (minimum `high`)

Set `model_tier = high` when any applies to the workstream:

- pricing, fees, splits, wallet, or ledger behavior;
- multi-tenancy, hierarchy moves, or ownership boundaries;
- authentication, authorization, personification, or secrets;
- Prisma migrations, unique constraints, or transactional invariants;
- public or semi-public HTTP/event contract changes;
- integration with external providers or webhooks;
- Worker failed verification twice in the same wave;
- replanning after `blocked` due to contract or domain mismatch.

Record the trigger in the launch spec `Notes` column or task stop conditions.

## Escalation Rules

The Coordinator may escalate tier at launch time:

1. `fast` → `standard` when the Scout must synthesize architecture or trade-offs, not just list files.
2. `standard` → `high` when risk triggers appear during the wave or prior handoff was `blocked`.
3. Never downgrade below the plan's `model_tier` without updating the plan in `update` mode or user approval.

If the host rejects an explicit model slug, launch with platform default for that `subagent_type` and record the fallback in `Wave Execution Log`.

## Platform Resolution

Resolve tiers at launch time. Prefer explicit slugs only when the host documents them.

### Cursor (Task tool)

| Tier | Preferred slug | Fallback |
|---|---|---|
| `fast` | `composer-2.5-fast` | omit `model` (platform default) |
| `standard` | `claude-4.6-sonnet-medium-thinking` or `gpt-5.5-medium` | omit `model` |
| `high` | `claude-opus-4-7-thinking-xhigh` or `gpt-5.3-codex-high-fast` | `standard` slug |

Pass `model` only when launching through Task with a supported slug. If the user named a model directly, that overrides the tier unless it violates role policy (for example `fast` Worker on migration work — escalate to `standard` minimum).

### Claude Code

| Tier | Guidance |
|---|---|
| `fast` | Haiku-class or default for read-only `/workflow-kit` subtasks |
| `standard` | Sonnet-class default |
| `high` | Opus-class or extended thinking for domain-heavy Workers |

Claude Code may not expose model selection on every subagent path. When unavailable, document tier intent in the prompt and use the host default.

### Codex

| Tier | Guidance |
|---|---|
| `fast` | Spark/fast profile when available for Scout/Verifier |
| `standard` | Default Codex model for implementation |
| `high` | High-reasoning profile for risk triggers |

When Codex cannot set model per subagent, state tier in the task prompt header: `Model tier: high — reason: migration + domain rules`.

## Plan and Launch Requirements

When a plan includes `Subagent Launch Spec`, every row must include `model_tier`.

Optional `model_override` column: explicit slug or host model name when the planner or user already chose one.

Coordinator launch checklist:

1. Read `model_tier` from the launch spec row.
2. Apply risk triggers; escalate if needed.
3. Resolve slug via platform table above.
4. Pass `model` to Task when supported.
5. Record resolved model or fallback in `Wave Execution Log` notes.

## Examples

```md
| Workstream | Role | subagent_type | model_tier | Wave | ... |
| B | Scout | explore | fast | 0 | ... |
| P | Planner | generalPurpose | standard | 0 | ... |
| A | Worker | generalPurpose | standard | 1 | ... |
| C | Worker | generalPurpose | high | 1 | pricing override rules |
| V | Verifier | shell | fast | 2 | ... |
| R | Reviewer | generalPurpose | high | 3 | domain + API contract |
```
