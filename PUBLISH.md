# Publicar

- **Marketplace:** `workflow-kit`
- **Plugins:** `workflow-kit`, `figma-to-code`
- **Skill orquestradora:** `feature-delivery`

## Instalar

### Cursor

Settings → Plugins → `lucasAguiar11/agent-skills` → Install `workflow-kit`

### Claude Code

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install workflow-kit@workflow-kit
/plugin install figma-to-code@workflow-kit
/reload-plugins
```

### Codex

```bash
codex plugin marketplace add lucasAguiar11/agent-skills
```

`/plugins` → **workflow-kit** → Install **workflow-kit**

## Release

```bash
./scripts/bump-version.sh 1.x.x
git commit -am "chore: release 1.x.x"
git tag v1.x.x
git push && git push --tags
```
