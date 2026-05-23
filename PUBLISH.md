# Publicar marketplace multi-plataforma

Repo: `lucasAguiar11/agent-skills`

- **Marketplace:** `agent-workflows`
- **Plugin:** `feature-delivery`

## Instalar

### Cursor

Settings → Plugins → Add marketplace `lucasAguiar11/agent-skills` → Install `feature-delivery`

### Claude Code

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install feature-delivery@agent-workflows
/reload-plugins
```

Invocar: `/feature-delivery:feature-delivery`

### Codex

```bash
codex plugin marketplace add lucasAguiar11/agent-skills
```

`/plugins` → marketplace **agent-workflows** → Install **feature-delivery**

Invocar: `@feature-delivery`

## Atualizar

```text
# Claude Code
/plugin marketplace update agent-workflows
/reload-plugins
```

```bash
# Codex
codex plugin marketplace update agent-workflows
```

Cursor: Settings → Plugins → update marketplace/plugin.

## Publicar nova versao

```bash
./scripts/bump-version.sh 1.x.x
# editar CHANGELOG.md
git commit -am "chore: release 1.x.x"
git tag v1.x.x
git push && git push --tags
```

## Estrutura

```text
agent-skills/
├── .agents/plugins/marketplace.json
├── .claude-plugin/marketplace.json
├── .cursor-plugin/marketplace.json
└── plugins/feature-delivery/
    ├── .codex-plugin/plugin.json
    ├── .claude-plugin/plugin.json
    ├── .cursor-plugin/plugin.json
    └── skills/
```
