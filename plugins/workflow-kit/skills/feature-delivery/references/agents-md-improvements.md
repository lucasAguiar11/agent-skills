# AGENTS.md Improvements

Run at the end of **every** feature: after the Post-feature Checkpoint, before commit/PR. Look at **what the feature actually applied** (the diff, the review findings, the decisions taken) and propose durable additions to the project `AGENTS.md` so the next feature/agent inherits the knowledge instead of rediscovering it.

Same two hard rules as the checkpoint:

- **Always report the result**, even when nothing qualifies (`clean` is a valid, required outcome).
- **A proposal is never an execution.** Edits to `AGENTS.md` become their own change for the user to approve — they must not expand the scope of the feature being delivered (scope guard). Do not write to `AGENTS.md` inside the feature's commit.

## What qualifies as a proposal

Propose only a fact that is **durable**, **reusable**, and **not already** in `AGENTS.md`. Concretely, one of:

- **Convention** the feature established that later work should follow (naming, layering, error shape, folder placement).
- **Command** the feature introduced (how to run, test, migrate, or seed the new thing) that isn't obvious from `package.json`/scripts.
- **Gotcha** discovered during implementation — a non-obvious constraint or footgun the next agent would hit blind.
- **Rule** that would have prevented a review finding this feature actually hit (turn the fix into a standing rule).

## What does NOT qualify (drop it)

- Anything **derivable from the code** by reading it (types, signatures, obvious structure) — `AGENTS.md` is for what the code can't tell you.
- **One-off** details specific to this feature with no bearing on future work.
- Something **already covered** by `AGENTS.md`, even loosely — don't restate.
- Restating this skill's own workflow rules — repo `AGENTS.md` holds domain rules, not workflow mechanics.

Smell test: if the next agent would waste time or repeat a mistake *without* this line, propose it. Otherwise drop it.

## What a good AGENTS.md looks like

Every proposal must fit an `AGENTS.md` that stays good — shape the proposed line to these rules, and drop it if it can't. (Data below from an analysis of 2,500+ repositories and practitioner guides — see Sources.)

- **Every line ships in every session — keep it lean.** Files over ~150 lines show diminishing returns and raise inference cost ~20% with no accuracy gain. Prefer well under that. If a proposal pushes the file past its budget, propose **tightening/replacing** an existing line, not just appending.
- **Human-curated, never auto-generated.** Agent-written / `/init`-generated `AGENTS.md` measurably *lowers* task success (~3%) and inflates cost (20%+). This is why this step **proposes** and the user curates — a proposal is a candidate line for a human to accept, edit, or reject, never an auto-commit.
- **Commands with real flags, listed early.** `npm test --coverage`, not "run the tests". Tools that appear in `AGENTS.md` get used far more often — name the non-obvious one (`uv` not `pip`, the real migrate command) explicitly.
- **One real code snippet beats three paragraphs.** Show the pattern; don't describe it.
- **Pair every prohibition with the alternative.** "Don't instantiate HTTP clients directly → use the shared `apiClient` from `lib/http`." A bare "don't" leaves the agent guessing.
- **Boundaries in three tiers:** *Always do* / *Ask first* / *Never do* (e.g. never commit secrets, never delete failing tests, ask before production changes).
- **Be specific:** exact versions and names ("React 18 + Vite + TS", not "a React project"). Generic guidance is noise.

Beyond the "does not qualify" list above, one more thing that makes the file worse: code-style rules a linter/formatter already enforces — let the tool do it, deterministically and for free. Keep the always-on instruction count low; frontier models reliably track only ~150–200 total.

## Report format

One line, always:

```
AGENTS.md: 0 proposals → clean
```

or, when something qualifies (proposals only — the user approves and applies as its own change):

```
AGENTS.md: 2 proposals → (1) convention: repos return domain errors, never throw · (2) gotcha: migration must run before seed
```

## Sources

- [How to write a great agents.md: lessons from 2,500+ repositories — GitHub Blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Writing a Good AGENTS.md — Phil Schmid](https://www.philschmid.de/writing-good-agents)
- [agents.md — the open format](https://agents.md/)
