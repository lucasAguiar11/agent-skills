# Changelog

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
