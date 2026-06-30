# Publicar

- **Marketplace:** `skill-forge`
- **Plugins:** `workflow-kit`, `figma-to-code`
- **Skill orquestradora:** `feature-delivery`

## Instalar

### Cursor

Settings → Plugins → `lucasAguiar11/agent-skills` → Install `workflow-kit`

### Claude Code

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install workflow-kit@skill-forge
/plugin install figma-to-code@skill-forge
/reload-plugins
```

### Codex

```bash
codex plugin marketplace add lucasAguiar11/agent-skills
```

`/plugins` → **workflow-kit** → Install **workflow-kit**

### OpenCode

Clone o repositorio e adicione os caminhos das skills no `opencode.json` do projeto:

```json
{
  "skills": {
    "paths": [
      "./agent-skills/plugins/workflow-kit/skills",
      "./agent-skills/plugins/figma-to-code/skills"
    ]
  }
}
```

Ou use `references` apontando para o repo clonado. Reinicie o OpenCode apos configurar.

## Release

```bash
./scripts/bump-version.sh 1.x.x
git commit -am "chore: release 1.x.x"
git tag v1.x.x
git push && git push --tags
```
