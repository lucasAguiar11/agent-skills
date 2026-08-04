# External Wait

Optional gate **after** local delivery is green: poll something outside the repo until success, failure, or timeout.

Host- and model-agnostic. The contract is the same everywhere; only the wait primitive changes.

## When it runs

| Run | When |
|-----|------|
| **Yes** | User opened/asked for a PR and wants CI watched; deploy smoke; remote review bot; any external check still running |
| **No** | Plan, wave execute, Validator, `simplify`, `clean-comments`, local `verification-before-completion` — those are already synchronous loops |
| **Skip** | No PR/deploy/external target, or user declined |

Offer it when a PR (or deploy) exists and CI/checks are still pending. Do not invent a target.

## Placement in the flow

```
Post-execution Sequence (local)
  → status done (synced)
  → commit / create-pr   (if user asked)
  → External Wait        ← optional, only if there is an external target
  → report + stop wait
```

Never start External Wait **before** local verification is green. Never use it **inside** a wave.

## Contract (fill before starting)

```text
External Wait:
- target: <PR #n | run id | deploy URL | check name>
- success: <e.g. all checks green | HTTP 200 + smoke>
- fail: <e.g. any check red | deploy failed>
- interval: <e.g. 2m>   # only when no blocking CLI --watch
- timeout: <e.g. 45m>
- on success: report URL + evidence; stop waiting
- on fail: paste failing job/name + short log; stop waiting
- while running: one-line status only
- do not change code or re-open the feature
```

Defaults when the user does not specify: interval `2m`, timeout `45m`, target = the PR just opened.

## Mechanism preference (any harness)

1. **Blocking CLI with watch** — preferred when available (one process, no timer spam):
   - `gh pr checks <n> --watch`
   - `gh run watch <run-id>`
   - deploy CLI that blocks until ready
2. **Recurring prompt / scheduler** — when no watch CLI exists:
   - Grok: `/loop <interval> <contract>` or `scheduler_create`
   - Other hosts: host equivalent (scheduled task, background agent re-check, or explicit re-prompt)
3. **One-shot re-check** — user says "check again later"; do not invent a long poll without a target

Never `sleep` in a tight shell loop to poll. Prefer `--watch` or the host scheduler.

## Host mapping (examples, not exclusive)

| Host | Prefer | Fallback |
|------|--------|----------|
| Any with `gh` | `gh pr checks --watch` / `gh run watch` | — |
| Grok | same CLI, or `/loop` / `scheduler_create` | one-line status each tick |
| Claude Code / Cursor / Codex | CLI `--watch` in shell; or background Task that re-checks | ask user to re-run after N minutes if no scheduler |

Model choice does not matter: the **contract** is the prompt; the harness only supplies the wait tool.

## Rules

1. **Stop on terminal state.** Success, fail, or timeout — always cancel the loop/scheduler and report once.
2. **No code changes** during External Wait. No new commits, no "while we wait I'll refactor".
3. **No feature re-open.** Status `done` stays; a red CI is a **report**, not a silent return to execute. User decides next step (fix → new wave / new feature).
4. **Timeout is success of the wait, not of the CI.** On timeout: report "still running after <timeout>" with last known status; cancel wait.
5. **One wait per target.** Do not stack multiple loops on the same PR.
6. **Evidence, not vibes.** Green/red from CLI or API output, not "looks fine".

## Report shape

```md
## External Wait — <target>

Result: success | fail | timeout
Evidence:
- <command or check>
- <summary or log snippet>

Next: <none | user should fix CI | open follow-up>
```

Append a one-line note under the plan's `Post-execute Updates` when a wait ran (optional but useful): `External Wait PR #n → success|fail|timeout`.

## Anti-patterns

- Polling during plan/review/execute waves
- Using External Wait instead of local `verification-before-completion`
- Leaving `/loop` or a scheduler job running after green/red
- Changing code "because CI is red" inside the wait turn without user approval
- Hard-coding Grok `/loop` as the only mechanism in multi-host instructions
