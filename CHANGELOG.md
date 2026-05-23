# Changelog

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
