# Agent Skills

Marketplace multi-plataforma para **Cursor**, **Claude Code** e **Codex** — skills reutilizaveis para entrega, planejamento, review e execucao em **qualquer projeto**.

Repo: [lucasAguiar11/agent-skills](https://github.com/lucasAguiar11/agent-skills)

- **Marketplace:** `agent-skills`
- **Plugins:** `workflow-kit`, `figma-to-code`
- **Skill orquestradora:** `feature-delivery`

## Instalar

### Cursor

Settings → Plugins → Add marketplace `lucasAguiar11/agent-skills` → Install **`workflow-kit`**

```text
/feature-delivery
```

### Claude Code

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install workflow-kit@agent-skills
/plugin install figma-to-code@agent-skills
/reload-plugins
```

```text
/workflow-kit:feature-delivery
/workflow-kit:review-plan
```

### Codex

```bash
codex plugin marketplace add lucasAguiar11/agent-skills
```

`/plugins` → **workflow-kit** → Install **workflow-kit**

```text
@workflow-kit
@feature-delivery
```

## Skills incluidas

### Plugin `workflow-kit`

- `feature-delivery` (orquestrador)
- `create-implementation-plan`
- `update-implementation-plan`
- `review-plan`
- `test-guide`
- `verification-before-completion`
- `prd`
- `create-architectural-decision-record`
- `commit`
- `pr-review`

### Plugin `figma-to-code`

- `figma-to-code` — Figma to code quase pixel perfect, independente de stack, com verificacao visual

## Estrutura

```text
agent-skills/
├── .agents/plugins/marketplace.json
├── .claude-plugin/marketplace.json
├── .cursor-plugin/marketplace.json
└── plugins/
    ├── workflow-kit/
    │   └── skills/
    └── figma-to-code/
        └── skills/
```

## Atualizar

```text
/plugin marketplace update agent-skills
/reload-plugins
```

```bash
codex plugin marketplace update agent-skills
```

## Licenca

MIT

Detalhes: [PUBLISH.md](./PUBLISH.md)
