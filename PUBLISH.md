# Publicar marketplace multi-plataforma

Este repo publica o mesmo catalogo para **Cursor**, **Claude Code** e **Codex**.

## Pre-requisitos

- Git remoto acessivel (GitHub/GitLab)
- Bump de versao em todos os manifests antes de publicar

```bash
./scripts/bump-version.sh 1.0.1
```

Atualize tambem `CHANGELOG.md`.

## Estrutura exigida

```text
agent-skills/
├── .agents/plugins/marketplace.json   # Codex
├── .claude-plugin/marketplace.json    # Claude Code
├── .cursor-plugin/marketplace.json    # Cursor
└── plugins/stafebank-feature-delivery/
    ├── .codex-plugin/plugin.json
    ├── .claude-plugin/plugin.json
    ├── .cursor-plugin/plugin.json
    └── skills/
```

## Cursor Marketplace

1. Push do repo
2. [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
3. Informe a URL do repositorio Git
4. Checklist:
   - `.cursor-plugin/marketplace.json` na raiz
   - plugin em `./plugins/stafebank-feature-delivery`
   - cada skill com `name` e `description` no frontmatter

Instalacao local/dev:

- Cursor Settings → Plugins → Add marketplace
- Caminho local ou URL Git do repo

## Claude Code Marketplace

1. Push do repo
2. No Claude Code:

```text
/plugin marketplace add owner/repo
/plugin marketplace update stafebank-agent-skills
/plugin install stafebank-feature-delivery@stafebank-agent-skills
/reload-plugins
```

Local path:

```text
/plugin marketplace add /Volumes/Externo/www/privates/agent-skills
/plugin install stafebank-feature-delivery@stafebank-agent-skills
```

Skills invocadas com namespace do plugin:

```text
/stafebank-feature-delivery:feature-delivery
/stafebank-feature-delivery:review-plan
```

Publicacao comunitaria (opcional): submeter ao fluxo `anthropics/claude-plugins-community` se quiser catalogo publico Anthropic.

## Codex Marketplace

1. Push do repo
2. Adicionar marketplace:

```bash
codex plugin marketplace add owner/repo
# ou caminho local
codex plugin marketplace add /Volumes/Externo/www/privates/agent-skills
```

3. Instalar plugin:

```bash
codex
# /plugins → marketplace stafebank-agent-skills → Install stafebank-feature-delivery
```

Ou via CLI quando disponivel:

```bash
codex plugin install stafebank-feature-delivery@stafebank-agent-skills
```

Invocacao:

```text
@stafebank-feature-delivery
@feature-delivery
```

Codex tambem aceita marketplace legado em `.claude-plugin/marketplace.json`; mantemos os dois (`/.agents/plugins/` e `/.claude-plugin/`) por compatibilidade.

## Validacao antes de publicar

Checklist manual:

- [ ] `./plugins/stafebank-feature-delivery/.codex-plugin/plugin.json` tem `interface.displayName`
- [ ] `./plugins/stafebank-feature-delivery/skills/*/SKILL.md` tem frontmatter valido
- [ ] `source` dos tres marketplaces aponta para `./plugins/stafebank-feature-delivery`
- [ ] `version` igual em todos os manifests
- [ ] README descreve instalacao nas tres plataformas

## Atualizacao nos projetos consumidores

Depois de publicar nova versao:

| Plataforma | Acao |
|---|---|
| Cursor | Atualizar plugin em Settings |
| Claude Code | `/plugin marketplace update stafebank-agent-skills` + `/reload-plugins` |
| Codex | Reinstalar ou atualizar marketplace/plugin no `/plugins` |

Remover copias locais duplicadas em `.agents/skills/` dos repos manager-v3 quando o plugin estiver instalado.
