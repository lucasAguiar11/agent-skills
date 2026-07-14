# Changelog

## 1.15.0 — 2026-07-14

- `pr-review`: separa revisão (chat) de postagem (PR/MR). Ação Final agora exige findings numerados, lista de postagem = subconjunto aprovado explicitamente, Review Summary opt-in (default só inline), prefixos textuais `[Bug]`/`[Melhoria]`/`[Nit]`, e IDs das notes/comments após postar
- `pr-review`: **nunca usa emoji** (revisão, rascunhos e postagem); tom direto; **preview obrigatório do payload completo** antes de postar + aprovação explícita (editar regenera o preview)
- `pr-review`: **prioridade de destino** — comentário **inline** no diff é o canal principal; note geral só como fallback (arquivo fora do diff); Review Summary continua opt-in
- `pr-review`: suporte GitLab via `glab` (detecção por URL; `diff_refs`, discussions posicionadas, `Content-Type: application/json` obrigatório, arquivo fora do diff → note geral, suggestions multi-linha). Etapas 1 e 5 usam "GitHub MCP ou glab, conforme a plataforma"

## 1.14.0 — 2026-07-07

- Skill `investigate-plan` renomeada para `quick-plan` no `workflow-kit` — nome reflete melhor que é o fluxo de planejamento leve (investigar → gate de design → plano aprovado), sem os artefatos do `feature-delivery`. Conteúdo inalterado.

## 1.13.0 — 2026-07-06

- Nova skill `investigate-plan` empacotada no `workflow-kit`: versão leve do discovery do `feature-delivery` para pedidos ambíguos que precisam de investigação e de um design decidido com o usuário, mas não do conjunto completo de artefatos (feature brief, ADR, `docs/plans/*.md`). Fluxo: investigar (leitura direta + `Explore` em paralelo por pergunta), gate de design (`advisor()` + só perguntas bloqueantes em lote + espaço pra ideia do usuário), plano via plan mode nativo (não arquivo) pedindo explicitamente checagem de regressão a um agente `Plan`, segundo `advisor()` focado só em regressão, e execução só após aprovação. Sem tracking de status, sem wave/subagent — escala pro `feature-delivery` quando a decisão é estrutural, cross-repo ou paralelizável

## 1.12.0 — 2026-07-03

- `feature-delivery`: novo passo `AGENTS.md improvements` na `## Post-execution Sequence` (roda após o Post-feature Checkpoint, antes do `test-guide`) — a partir do que a feature aplicou (diff, review findings, decisões), propõe adições duráveis ao `AGENTS.md` do projeto: convenção, comando, gotcha ou regra. Reporta mesmo quando `clean`; proposta vira mudança própria aprovada pelo usuário, nunca entra no commit da feature (novo Required Gate reforça o scope guard)
- Novo `references/agents-md-improvements.md`: critérios de *quando propor* (smell test + lista do que não qualifica) e de *como é um bom `AGENTS.md`* — enxuto (<~150 linhas, +~20% de custo acima disso), curado por humano e nunca auto-gerado (auto-geração baixa sucesso ~3% e infla custo 20%+), comandos com flags reais, snippet real > prosa, proibição pareada com alternativa, boundaries em três níveis, versões exatas; com fontes (estudo GitHub de 2.500+ repos, Phil Schmid, agents.md)
- `references/workflow-modes.md` (`execute`): lista inline da Post-execution Sequence sincronizada com o novo passo

## 1.11.0 — 2026-07-02

- Nova skill `simplify` empacotada no `workflow-kit`: revisão em 3 frentes (reuso, qualidade, eficiência) do diff da feature, com fix direto dos achados. Extraída da skill `/simplify` embutida no Claude Code para funcionar tambem em Cursor e Codex
- `feature-delivery`: `simplify` entra no fluxo, rodando logo apos a verificacao passar e antes do Post-feature Checkpoint; novo Required Gate proibe pular esse passo
- Nova secao `## Post-execution Sequence` no `SKILL.md` — ancora unica pra sequencia pos-verificacao (`simplify` → Post-feature Checkpoint → `test-guide` → `verification-before-completion` → sync de status → `done`). `Default Flow` e `references/workflow-modes.md` (`execute`) passam a apontar pra ela em vez de duplicar a lista — corrige um drift onde o Post-feature Checkpoint (1.8.0) nunca tinha sido propagado pro runbook de `execute`

## 1.10.0 — 2026-06-30

- `feature-delivery`: nova skill `supersede-feature` — funde features antigas/superadas na que as substituiu, condensa o historico relevante no brief da sucessora, marca as antigas `deprecated` com `superseded_by`, e remove (`git rm`) os planos mortos (recuperaveis via git history; ADRs e briefs ficam preservados)

## 1.9.0 — 2026-06-29

- `feature-delivery`: nova seção `## Validation` no template de plano — self-check (V-001..V-006) com `status: draft|needs-resolve|clean` e loop "corrige o plano até clean". Mora dentro do plano, nunca em arquivo separado. Novo passo 7 no Default Flow e novo Required Gate (não marca `planned` enquanto não estiver `clean`)
- `feature-delivery`: nova seção `## Traceability Matrix` no template de plano (REQ → design/task → teste), preenchida de features médias pra cima; linha `gap` = requisito sem teste, bloqueia `clean` (checada por V-006 e pelo gate)
- `feature-delivery`: ADR ganha frontmatter `scope`; passo 4 do Default Flow varre ADRs anteriores por `scope`/`tags` antes de finalizar, para não re-decidir o que já foi resolvido
- `subagent-policy`: `Scout` agora cobre **context offload** explicitamente — ler doc grande (plano/PRD/ADR/inventário) e devolver digest compacto, mantendo o thread principal enxuto
- `feature-delivery`: nova seção `## Libraries` no template de plano (lib + versão + doc ref + motivo) — registra a resolução de doc/versão pra não re-decidir e pegar drift; checada por V-007 no `Validation`
- `feature-delivery`: **modos auto-guiados** — tabela `Mode preconditions` (plan/review/execute/update) com a ação exata pra rodar quando a pré-condição falta, em vez de o agente improvisar; novo Required Gate reforça o stop
- `feature-delivery`: `scope` do ADR agora **obrigatório** (non-empty); Required Gate proíbe finalizar ADR sem scope, senão fica invisível pro `adr-correlator`
- `feature-delivery`: seis **Reader agents** empacotados em `agents/` (Claude Code, auto-discovery) para offload de contexto — cada um lê um doc grande e devolve digest de forma fixa, nunca o arquivo inteiro: `plan-reader` (Goal/Tasks/Validation/Traceability), `plan-detail-reader` (1 Task p/ Worker no execute), `feature-reader` (brief/PRD), `adr-reader` (1 ADR), `adr-correlator` (correlaciona ADRs por scope/tags — pareia com o passo 4), `feature-index-reader` (features relacionadas/deps). Novo papel `Reader` na subagent-policy; passo 4 e flow do SKILL apontam pros readers. Outros hosts (Cursor/Codex/OpenCode) leem inline — readers não portam, o resto do kit sim

## 1.8.0 — 2026-06-09

- Novo `Post-feature Checkpoint` no `feature-delivery` (`references/post-feature-checkpoint.md`): checagem barata ao fim de toda feature, com acoes que so disparam em limiares (esporadicas por construcao)
- Check 1 (toda feature): lixo — marcadores esquecidos (`TEMP-`/`TODO`/`FIXME`), declaracoes privadas orfas no diff e duplicacao dentro do diff
- Check 2 (limiar 3a copia): duplicacao estrutural entre modulos → propor promocao ao layer compartilhado como feature propria
- Check 3 (limiar ~6 branches): crescimento de hub central (app shell/router/registry) → propor ADR de contrato de feature
- Check 4 (1a ocorrencia): primeira integracao de dados real → definir camada de dados em ADR unico para todas as features
- `Default Flow` ganha o passo 11 (checkpoint pos-verificacao, pre-commit/PR) e novo Required Gate: entrega nao conclui sem reportar o checkpoint (clean ou triggered); acao disparada vira proposta, nunca expansao silenciosa de escopo
- `AGENTS.md` do projeto pode sobrescrever metricas/limiares (secao `Architecture Checkpoint`); os defaults do plugin valem na ausencia

## 1.6.0 — 2026-06-02

- Novo `Test Integrity Gate` no `test-guide`: baseline verde protegido, definicao de "enfraquecer" (inclui config-level como `coverageThreshold`, `testPathIgnorePatterns` e CI), e classificacao obrigatoria de toda mudanca de teste em `feature-driven` / `test-was-wrong` / `escape-hatch`
- Baseline de testes definido concretamente via `git diff` contra a branch base; mudanca `feature-driven` exige prova red-green
- "Flaky" deixa de ser desculpa: quarentena so com prova e aprovacao; evidencia de conclusao precisa vir da suite completa com skips contabilizados
- `feature-delivery`: novo Required Gate proibindo apagar/skipar/enfraquecer teste do baseline no `execute`; propagacao da regra para subagents via `subagent-task.md` (secao Test Integrity, campo `Test changes` no handoff, stop condition) e auditoria pelo Coordinator em `subagent-handoff.md`
- `verification-before-completion`: padrao de Tests exige suite completa e sinaliza filtrar/skipar teste como red flag
- `pr-review`: nova etapa de Integridade dos Testes detecta testes removidos/skipados/enfraquecidos e config afrouxada no diff, classificando legitimo vs escape-hatch

## 1.5.0 — 2026-05-25

- Nova referencia `references/cross-repo-handoff.md`: quando uma feature depende de outro repo, o flow gera um prompt de triage pronto para colar no outro servico (contexto, contrato a nao quebrar, escopo, decisoes em aberto, restricoes)
- `triage` e `plan` passam a emitir esse prompt quando a discovery detecta dependencia cross-repo
- Default Flow ganha passo dedicado para o handoff cross-repo
- Dependencia cross-repo deve ser registrada no plano (`pending-counterpart`), nunca fechada silenciosamente

## 1.4.0 — 2026-05-25

- Novo nivel de artefato `Level 0` (micro-change): plano inline com apenas `Goal`, `Tasks`, `Verification`, `Risks`
- Nova `Plan Weight Rule` em `references/artifact-policy.md`: peso do plano segue o tamanho da mudanca; planos single-workstream omitem `Wave Schedule`/`Subagent Launch Spec`/`Wave Execution Log`
- `SKILL.md`: opcao micro-change na selecao de artefatos e gate proibindo secoes de wave em plano single-workstream
- `review-checklist.md` e `workflow-modes.md` alinhados ao Level 0 (review nao cobra secoes ausentes por design)
- `templates/implementation-plan.md`: nota condicional sobre quais secoes omitir

## 1.3.0 — 2026-05-22

- Model tiers abstratos (`fast`, `standard`, `high`) para subagents
- Nova referencia `references/model-tier-policy.md`: defaults por role, gatilhos de risco, escalonamento e mapeamento Cursor/Claude/Codex
- `Subagent Launch Spec` exige coluna `model_tier` em planos paralelizaveis
- Coordinator resolve tier em launch e registra modelo/fallback no `Wave Execution Log`
- Templates e checklists atualizados (`subagent-task`, `implementation-plan`, review, workflow-modes)

## 1.2.0 — 2026-05-22

- Rename marketplace e plugin para `workflow-kit`
- Skill orquestradora permanece `feature-delivery`
- Claude: `/workflow-kit:feature-delivery`
- Paths: `plugins/workflow-kit/`
- Changelog neutro, sem referencias a marcas ou projetos especificos

## 1.1.0 — 2026-05-22

- Marketplace renomeado para catalogo generico multi-plataforma
- Plugin renomeado antes de consolidar em `workflow-kit`
- Branding generico para qualquer workflow/projeto
- Licenca MIT no plugin

## 1.0.0 — 2026-05-22

- Marketplace multi-plataforma: Cursor, Claude Code e Codex
- Plugin inicial com feature-delivery e skills auxiliares
- Waves, launch spec e Integration Coordinator
