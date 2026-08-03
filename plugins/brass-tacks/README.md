# brass-tacks

Always-on **output style** plugin: next action first, numbered steps, plain English, no preamble.

Based on [SkytheWitcher/brass-tacks](https://github.com/SkytheWitcher/brass-tacks). Delivered as a plugin so the style loads at session start — you do not have to remember `/brass-tacks`.

## What it does

When the plugin is **installed, enabled, and trusted**, hooks do two things:

### 1. Inject context (Claude Code + Codex)

| Hook | Why |
|------|-----|
| `SessionStart` | Official path: `additionalContext` becomes developer/session context |
| `UserPromptSubmit` (once per session) | Fallback if SessionStart stdout is ignored |

### 2. Materialize host rules (Grok + Claude)

SessionStart also **writes** the style file to disk:

| Path | Host |
|------|------|
| `~/.grok/rules/brass-tacks.md` | Grok — rules load every session (even if hook stdout is ignored) |
| `~/.claude/rules/brass-tacks.md` | Claude Code compatibility |

That is the Grok fix: Grok docs treat SessionStart stdout as passive, but the hook still **runs**, so copying into `~/.grok/rules/` makes always-on reliable.

Also ships the skill for:

- `/brass-tacks` — re-enable after you stopped it
- `stop brass tacks mode` / `stop adhd mode` / `normal mode` — turn off for the rest of the session

## Host matrix

| Host | Always-on path | What you need |
|------|----------------|---------------|
| **Codex** | Hook `additionalContext` | Install plugin + `/hooks` trust |
| **Claude Code** | Hook inject + `~/.claude/rules/` | Install/trust plugin |
| **Grok** | `~/.grok/rules/` (written by hook) | Install + enable + trust; **new session** after first run |

## Install

### skill-forge marketplace

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install brass-tacks@skill-forge
```

Trust the plugin so hooks run.

**Grok**

```bash
grok plugin install brass-tacks --trust
# ensure enabled in ~/.grok/config.toml → [plugins].enabled
```

**Codex**

```text
/plugins → install brass-tacks@skill-forge
/hooks → trust brass-tacks SessionStart / UserPromptSubmit
```

### Local path (dev)

```bash
grok plugin install /path/to/agent-skills/plugins/brass-tacks --trust
```

## Opt out

| Level | How |
|-------|-----|
| This session only | Say `stop brass tacks mode` |
| Plugin off | Disable/uninstall in `/plugins` |
| Hard off | Create empty file `$PLUGIN_DATA/disabled` (or `$GROK_PLUGIN_DATA` / `$CLAUDE_PLUGIN_DATA`) — next SessionStart **removes** the host rules files |
| Manual cleanup | `rm -f ~/.grok/rules/brass-tacks.md ~/.claude/rules/brass-tacks.md` |

## Token cost

~14k characters once per session (hook inject). Host rules files are the same content on disk for Grok/Claude auto-load. Disable the plugin if you need long exploratory prose without the style contract.

## License

MIT — skill content originally from SkytheWitcher/brass-tacks.
