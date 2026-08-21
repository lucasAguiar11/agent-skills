# Skill Forge

Marketplace multi-plataforma para **Cursor**, **Claude Code**, **Codex** e **OpenCode** — skills reutilizaveis para entrega, planejamento, review e execucao em **qualquer projeto**.

Repo: [lucasAguiar11/agent-skills](https://github.com/lucasAguiar11/agent-skills)

- **Marketplace:** `skill-forge`
- **Plugins:** `workflow-kit`, `figma-to-code`, `brass-tacks`, `yolo`
- **Skill orquestradora:** `feature-delivery`

## Instalar

### Pi Agent

```bash
pi install git:github.com/lucasAguiar11/agent-skills
```

Reinicie o Pi (ou rode `/reload`) e use as skills normalmente. Para instalar só
neste projeto, execute o mesmo comando com `-l`.

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
/plugin install brass-tacks@skill-forge
/plugin install yolo@skill-forge
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
      "/caminho/para/agent-skills/plugins/figma-to-code/skills",
      "/caminho/para/agent-skills/plugins/yolo/skills"
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
- `quick-plan` (investigacao leve: explorar -> gate de design -> plano aprovado, sem artefatos)
- `create-implementation-plan`
- `update-implementation-plan`
- `review-plan`
- `test-guide`
- `verification-before-completion`
- `simplify`
- `clean-comments` (limpa comentários ruído; mantém só gotcha/header mínimo)
- `prd`
- `create-architectural-decision-record`
- `commit`
- `code-review-and-quality` (review multi-eixo de PR/MR ou de diff local; ex-`pr-review`)
- `supersede-feature`

**Reader agents** (Claude Code — auto-discovery em `agents/`, context offload): `plan-reader`, `plan-detail-reader`, `feature-reader`, `adr-reader`, `adr-correlator`, `feature-index-reader`. Cada um lê um doc grande e devolve um digest de forma fixa, mantendo o thread principal enxuto. Nos demais hosts (Cursor/Codex/OpenCode) os docs são lidos inline.

### Plugin `figma-to-code`

- `figma-to-code` — Figma to code quase pixel perfect, independente de stack, com verificacao visual

### Plugin `brass-tacks`

- Output style always-on (hooks `SessionStart` + `UserPromptSubmit` once): acao primeiro, passos numerados, linguagem simples
- Skill `/brass-tacks`; desliga com `stop brass tacks mode`
- Baseado em [SkytheWitcher/brass-tacks](https://github.com/SkytheWitcher/brass-tacks)

### Plugin `yolo`

- Skill `/yolo` — executa o pedido sem confirmação no chat (`.env`, `git add -f`, commit, push)
- Prevalece sobre a skill `commit`. Não desliga deny/hooks do host

## Fluxo (feature-delivery)

O orquestrador escolhe o menor conjunto de artefatos para a mudança e avança por portões verificáveis. Os passos pesados (waves, subagents) só aparecem quando há trabalho paralelo real; um micro-change usa só `Goal / Tasks / Verification / Risks`.

```text
triage   → escolhe explicitamente fast-contract, standard ou full
   │        registra evidência do roteamento, cost profile e write scope
   │
plan     → feature brief / PRD / ADR (quando estrutural) + plano
   │        ADR exige `scope` → adr-correlator linka decisões anteriores
   │        plano preenche Traceability (REQ→design→teste) e Libraries
   ▼
Validation  ┌─ self-check V-001..V-007 ─────────────┐
do plano    │  algum fail? → status: needs-resolve  │
            │  corrige → re-checa                    │──┐ loop até clean
            └───────────────────────────────────────┘◄─┘
   │        só vira `planned`/aprovável com status: clean
review   → uma revisão consolidada; nova rodada só com decisão blocking nova
execute  → Integration Coordinator: waves, handoffs, verificação focada
   │        precondição: plano `approved` + Validation `clean`
freeze   → após focused checks + bundle pós-execução; aceitar só P0/P1
   │        P2 (refactor, otimização, cobertura extra) vira follow-up
final    → um Validator por workstream + um build integrado no diff congelado
checkpoint → Post-feature Checkpoint antes de commit/PR
```

Por padrão, `feature-delivery` usa o perfil `balanced`. Para reduzir custo e
latência, use `Cost profile: economy`: modelos solicitados pelo usuário ficam
restritos a Workers, Readers/Verifiers usam o tier mínimo, a espera é orientada
por eventos e a suíte completa fica para a verificação final. Em `full`, o
roteamento exige uma revisão consolidada do plano e um Validator por
workstream; revalidação ocorre somente no workstream refutado por evidência.

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
    ├── figma-to-code/
    │   └── skills/
    ├── brass-tacks/
    │   ├── hooks/           # SessionStart + UserPromptSubmit
    │   ├── hooks-handlers/
    │   └── skills/
    └── yolo/
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
