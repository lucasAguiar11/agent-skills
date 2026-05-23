# Stafebank Agent Skills

Marketplace multi-plataforma para **Cursor**, **Claude Code** e **Codex** com skills compartilhadas entre projetos `manager-v3`.

## Compatibilidade

| Plataforma | Marketplace manifest | Plugin manifest | Instalar |
|---|---|---|---|
| **Cursor** | `.cursor-plugin/marketplace.json` | `.cursor-plugin/plugin.json` | Settings → Plugins |
| **Claude Code** | `.claude-plugin/marketplace.json` | `.claude-plugin/plugin.json` | `/plugin marketplace add` |
| **Codex** | `.agents/plugins/marketplace.json` | `.codex-plugin/plugin.json` | `codex plugin marketplace add` |

Codex tambem le `.claude-plugin/marketplace.json` por compatibilidade legada.

## Plugin

| Plugin | Skills | Descricao |
|---|---|---|
| `stafebank-feature-delivery` | 10 skills | Entrega de features com waves e subagents |

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
├── plugins/stafebank-feature-delivery/
│   ├── .codex-plugin/plugin.json
│   ├── .claude-plugin/plugin.json
│   ├── .cursor-plugin/plugin.json
│   └── skills/
├── scripts/bump-version.sh
├── PUBLISH.md
└── CHANGELOG.md
```

## Instalar

Substitua `<repo>` pelo caminho local ou `owner/repo` no Git.

### Cursor

1. **Settings → Rules, Skills, Plugins**
2. Add marketplace: `<repo>`
3. Install `stafebank-feature-delivery`
4. Invocar: `/feature-delivery`

### Claude Code

```text
/plugin marketplace add <repo>
/plugin install stafebank-feature-delivery@stafebank-agent-skills
/reload-plugins
```

Invocar com namespace do plugin:

```text
/stafebank-feature-delivery:feature-delivery
/stafebank-feature-delivery:review-plan
```

### Codex

```bash
codex plugin marketplace add <repo>
```

Depois abra `codex` → `/plugins` → instale `stafebank-feature-delivery`.

Invocar:

```text
@stafebank-feature-delivery
@feature-delivery
```

## Desenvolvimento local

```bash
cd /Volumes/Externo/www/privates/agent-skills

# Cursor
# Settings → Plugins → add este diretorio

# Claude Code
/plugin marketplace add /Volumes/Externo/www/privates/agent-skills

# Codex
codex plugin marketplace add /Volumes/Externo/www/privates/agent-skills
```

## Usar em projetos manager-v3

### Centralizado no plugin

- workflow `feature-delivery` e skills auxiliares
- templates, subagent policy, wave schedule, handoff

### Local no projeto

- `AGENTS.md` / `CLAUDE.md`
- `docs/codebase-research-v1/`
- planos, features e ADRs reais
- `nestjs-best-practices`, `prisma-expert` (upstream separado)

### Migrar repo com skills duplicadas

1. Instale o plugin nas tres ferramentas que usar.
2. Remova de `.agents/skills/` as pastas agora fornecidas pelo plugin.
3. Mantenha em `AGENTS.md`:

```markdown
Use `/feature-delivery` via plugin `stafebank-feature-delivery`.
Regras de dominio continuam neste AGENTS.md.
```

4. No Claude Code, se a skill nao carregar automaticamente, invoque
   `/stafebank-feature-delivery:feature-delivery`.

## Versionar e publicar

```bash
./scripts/bump-version.sh 1.0.1
# editar CHANGELOG.md
git commit -am "chore: release 1.0.1"
git tag v1.0.1
git push && git push --tags
```

Detalhes: [PUBLISH.md](./PUBLISH.md)

## Licenca

Uso interno Stafebank.
