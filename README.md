# Agent Workflows

Marketplace multi-plataforma para **Cursor**, **Claude Code** e **Codex** — skills reutilizaveis para entrega, planejamento, review e execucao em **qualquer projeto**.

## Compatibilidade

| Plataforma | Marketplace manifest | Plugin manifest | Instalar |
|---|---|---|---|
| **Cursor** | `.cursor-plugin/marketplace.json` | `.cursor-plugin/plugin.json` | Settings → Plugins |
| **Claude Code** | `.claude-plugin/marketplace.json` | `.claude-plugin/plugin.json` | `/plugin marketplace add` |
| **Codex** | `.agents/plugins/marketplace.json` | `.codex-plugin/plugin.json` | `codex plugin marketplace add` |

## Plugin

| Plugin | Skills | Descricao |
|---|---|---|
| `feature-delivery` | 10 skills | Entrega de features com waves e subagents |

Skills incluidas:

- `feature-delivery`
- `create-implementation-plan`
- `update-implementation-plan`
- `review-plan`
- `test-guide`
- `verification-before-completion`
- `prd`
- `create-architectural-decision-record`
- `commit`
- `pr-review`

## Estrutura

```text
agent-skills/
├── .agents/plugins/marketplace.json      # Codex
├── .claude-plugin/marketplace.json       # Claude Code
├── .cursor-plugin/marketplace.json       # Cursor
├── plugins/feature-delivery/
│   ├── .codex-plugin/plugin.json
│   ├── .claude-plugin/plugin.json
│   ├── .cursor-plugin/plugin.json
│   └── skills/
├── scripts/bump-version.sh
├── PUBLISH.md
└── CHANGELOG.md
```

## Instalar

Substitua `<repo>` por `lucasAguiar11/agent-skills` ou caminho local.

### Cursor

1. **Settings → Rules, Skills, Plugins**
2. Add marketplace: `<repo>`
3. Install `feature-delivery`
4. Invocar: `/feature-delivery`

### Claude Code

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install feature-delivery@agent-workflows
/reload-plugins
```

Invocar:

```text
/feature-delivery:feature-delivery
/feature-delivery:review-plan
```

### Codex

```bash
codex plugin marketplace add lucasAguiar11/agent-skills
```

Depois: `codex` → `/plugins` → instale `feature-delivery`.

Invocar:

```text
@feature-delivery
```

## Usar em um projeto

### No plugin (centralizado)

- workflow `feature-delivery` e skills auxiliares
- templates, subagent policy, wave schedule, handoff

### No projeto (local)

- `AGENTS.md` / `CLAUDE.md` — regras do repo
- documentacao de dominio
- planos, features e ADRs reais
- skills especificas do stack (ex.: framework, ORM)

### Migrar repo com skills duplicadas

1. Instale o plugin nas ferramentas que usar.
2. Remova de `.agents/skills/` as pastas agora fornecidas pelo plugin.
3. Atualize `AGENTS.md`:

```markdown
Use `/feature-delivery` via plugin `feature-delivery` (lucasAguiar11/agent-skills).
Regras do projeto continuam neste AGENTS.md.
```

## Versionar e publicar

```bash
./scripts/bump-version.sh 1.1.0
git commit -am "chore: release 1.1.0"
git tag v1.1.0
git push && git push --tags
```

Detalhes: [PUBLISH.md](./PUBLISH.md)

## Licenca

MIT
