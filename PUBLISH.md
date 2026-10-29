# Publicar

- **Marketplace:** `skill-forge`
- **Plugins:** `workflow-kit`, `figma-to-code`, `service-blueprint`, `i-have-adhd`, `yolo`
- **Skill orquestradora:** `feature-delivery`

## Instalar

### Cursor

Settings → Plugins → `lucasAguiar11/agent-skills` → Install `workflow-kit`

### Claude Code

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install workflow-kit@skill-forge
/plugin install figma-to-code@skill-forge
/plugin install service-blueprint@skill-forge
/plugin install i-have-adhd@skill-forge
/plugin install yolo@skill-forge
/reload-plugins
```

`i-have-adhd` e ativado automaticamente pelo hook `SessionStart` no Claude Code. Use `/i-have-adhd` em hosts sem esse hook e `stop adhd mode` ou `normal mode` para desativar na sessao atual.

### Codex

```bash
codex plugin marketplace add lucasAguiar11/agent-skills
```

`/plugins` → **workflow-kit** → Install **workflow-kit**
`/plugins` → **service-blueprint** → Install **service-blueprint**
`/plugins` → **i-have-adhd** → Install **i-have-adhd**

Use `$i-have-adhd` para ativar o modo no Codex.

### Hermes Agent

```bash
hermes plugins install lucasAguiar11/agent-skills#plugins/workflow-kit --enable
hermes plugins install lucasAguiar11/agent-skills#plugins/figma-to-code --enable
hermes plugins install lucasAguiar11/agent-skills#plugins/service-blueprint --enable
hermes plugins install lucasAguiar11/agent-skills#plugins/i-have-adhd --enable
hermes plugins install lucasAguiar11/agent-skills#plugins/yolo --enable
hermes gateway restart
```

Cada plugin precisa do `plugin.json` (Agent Plugins v1) na raiz; `hermes plugins validate plugins/<nome>` confere antes de publicar. Só as skills carregam no Hermes.

### OpenCode

Clone o repositorio e adicione os caminhos das skills no `opencode.json` do projeto:

```json
{
  "skills": {
    "paths": [
      "./agent-skills/plugins/workflow-kit/skills",
      "./agent-skills/plugins/figma-to-code/skills",
      "./agent-skills/plugins/service-blueprint/skills",
      "./agent-skills/plugins/i-have-adhd/skills",
      "./agent-skills/plugins/yolo/skills"
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
