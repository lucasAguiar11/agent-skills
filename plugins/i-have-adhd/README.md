# i-have-adhd

ADHD-friendly output skill from [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd).

## Use

Claude Code loads the rules automatically through the `SessionStart` hook.

Hosts without this hook can activate it explicitly:

- Cursor, Grok and OpenCode: `/i-have-adhd`
- Codex: `$i-have-adhd`
- Pi: `/i-have-adhd`

The rules stay active for the session. Use `stop adhd mode` or `normal mode` to turn them off.

The hook is unconditional: installing and enabling this plugin activates the rules at the start of each Claude Code session.

## License

MIT. See `LICENSE`.
