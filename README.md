# Skill Forge

Marketplace multi-plataforma para **Cursor**, **Claude Code**, **Codex** e **OpenCode** — skills reutilizaveis para entrega, planejamento, review e execucao em **qualquer projeto**.

Repo: [lucasAguiar11/agent-skills](https://github.com/lucasAguiar11/agent-skills)

- **Marketplace:** `skill-forge`
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
/plugin install workflow-kit@skill-forge
/plugin install figma-to-code@skill-forge
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

### OpenCode

Dentro deste repositorio as skills ja estao disponiveis automaticamente via `opencode.json`.

Para usar em outro projeto, adicione os caminhos no `opencode.json`:

```json
{
  "skills": {
    "paths": [
      "/caminho/para/agent-skills/plugins/workflow-kit/skills",
      "/caminho/para/agent-skills/plugins/figma-to-code/skills"
    ]
  }
}
```

Ou via referencia no `opencode.json` do projeto:

```json
{
  "references": {
    "skill-forge": {
      "path": "/caminho/para/agent-skills",
      "description": "Skills reutilizaveis de entrega e workflow"
    }
  }
}
```

Depois de editar o config, **reinicie o OpenCode** para carregar as skills.

## Skills incluidas

### Plugin `workflow-kit`

- `feature-delivery` (orquestrador)
- `investigate-plan` (investigacao leve: explorar -> gate de design -> plano aprovado, sem artefatos)
- `create-implementation-plan`
- `update-implementation-plan`
- `review-plan`
- `test-guide`
- `verification-before-completion`
- `simplify`
- `prd`
- `create-architectural-decision-record`
- `commit`
- `pr-review`
- `supersede-feature`

**Reader agents** (Claude Code — auto-discovery em `agents/`, context offload): `plan-reader`, `plan-detail-reader`, `feature-reader`, `adr-reader`, `adr-correlator`, `feature-index-reader`. Cada um lê um doc grande e devolve um digest de forma fixa, mantendo o thread principal enxuto. Nos demais hosts (Cursor/Codex/OpenCode) os docs são lidos inline.

### Plugin `figma-to-code`

- `figma-to-code` — Figma to code quase pixel perfect, independente de stack, com verificacao visual

## Fluxo (feature-delivery)

O orquestrador escolhe o menor conjunto de artefatos para a mudança e avança por portões verificáveis. Os passos pesados (waves, subagents) só aparecem quando há trabalho paralelo real; um micro-change usa só `Goal / Tasks / Verification / Risks`.

```text
triage   → classifica o pedido, registra a feature em docs/features.md
   │        (precondição de cada modo é auto-guiada: se faltar, para e diz o comando exato)
plan     → feature brief / PRD / ADR (quando estrutural) + plano
   │        ADR exige `scope` → adr-correlator linka decisões anteriores (não re-decide)
   │        plano preenche Traceability (REQ→design→teste) e Libraries (lib+versão+doc)
   ▼
Validation  ┌─ self-check V-001..V-007 ─────────────┐
do plano    │  algum fail? → status: needs-resolve  │
            │  corrige → re-checa                    │──┐ loop até clean
            └───────────────────────────────────────┘◄─┘
   │        só vira `planned`/aprovável com status: clean (sem gap, libs com doc ref)
review   → findings dentro do plano; pós-execute inclui test-guide (keep/improve/remove/missing)
execute  → Integration Coordinator: waves, handoffs, verificação por wave
   │        precondição: plano `approved` + Validation `clean`
checkpoint → Post-feature Checkpoint (lixo + checagens por limiar) antes de commit/PR
```

**Portões de validação do plano:**

| Check | Pega |
|---|---|
| V-001 | REQ sem Task |
| V-002 | Task sem comando de verificação |
| V-003 | decisão blocking em aberto |
| V-004 | write paths sobrepostos em paralelo |
| V-005 | Worker no Launch Spec sem Task |
| V-006 | requisito sem teste (gap na Traceability) |
| V-007 | lib nova/pinada sem doc ref |

Em docs grandes, o `plan`/`review`/`execute` no Claude Code delega a leitura a um Reader agent (digest), em vez de carregar o arquivo inteiro no contexto.

## Estrutura

```text
agent-skills/
├── .agents/plugins/marketplace.json
├── .claude-plugin/marketplace.json
├── .cursor-plugin/marketplace.json
├── opencode.json
└── plugins/
    ├── workflow-kit/
    │   ├── agents/        # Reader agents (Claude Code)
    │   └── skills/
    └── figma-to-code/
        └── skills/
```

## Atualizar

```text
/plugin marketplace update skill-forge
/reload-plugins
```

```bash
codex plugin marketplace update skill-forge
```

## Licenca

MIT

Detalhes: [PUBLISH.md](./PUBLISH.md)
