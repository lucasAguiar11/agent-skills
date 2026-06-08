---
name: figma-to-code
description: Workflow Figma → código quase pixel perfect, independente de stack. Use quando o usuário fornecer uma URL do Figma e pedir para implementar/replicar uma tela, modal, componente ou fluxo, ou mencionar "pixel perfect", "implementar do Figma", "extrair design", "replicar tela do Figma". Extrai o design via MCP do Figma, gera spec com proveniência, mapeia tokens/componentes para o design system do projeto e implementa na stack definida pelas convenções do repo (.agents/figma-to-code/conventions.md), com loop de verificação visual até convergir.
---

# Figma → código (quase pixel perfect)

Workflow em 7 fases (0–6), independente de stack. Não pular fases; cada uma tem gate de saída explícito.

Tudo que é específico do projeto (stack, comandos, caminhos, design system, captura de tela) vem do **arquivo de convenções** `.agents/figma-to-code/conventions.md` do repo — resolvido na Fase 0. A skill nunca assume stack; na ausência de convenções, detecta e propõe.

**Entrada esperada:** URL do Figma com `node-id` + nome curto da feature (kebab-case). Se faltar a URL ou o node-id, perguntar antes de começar. Se faltar o nome, derivar do nome do frame.

**Regras transversais:**
- Respeitar as regras do repo (CLAUDE.md/AGENTS.md), inclusive guarda de escopo e prefixos de comando. Tokens/componentes novos no design system exigem aprovação explícita antes de criar.
- Nunca expor valores de tokens/API keys em respostas, docs ou commits.

## Fase 0 — Preflight + convenções

Rodar o checklist em [references/preflight-checklist.md](references/preflight-checklist.md): ferramentas disponíveis e **resolução das convenções do projeto**. Sem `conventions.md`, detectar a stack, propor convenções via [references/conventions-template.md](references/conventions-template.md) e oferecer salvá-las no repo.

**Gate:** checks bloqueantes verdes + convenções resolvidas (arquivo existente ou proposta aprovada); degradações registradas.

## Fase 1 — Proveniência e escopo

Parse da URL (`fileKey`, `nodeId` com conversão `-`→`:`), `get_metadata` para confirmar frame/página/dimensões, e confirmação com o usuário de **qual frame/estado exato** está no escopo (listar o que fica fora). Detalhes: [references/extraction.md](references/extraction.md).

**Gate:** escopo confirmado (frame(s) exato(s) + nome da feature).

## Fase 2 — Extração

Extrair na ordem definida em [references/extraction.md](references/extraction.md): screenshots de referência, tokens (`get_variable_defs`), layout/medidas/textos (`get_design_context`), metadata complementar. Textos 100% verbatim. Exportar PNGs para o diretório de assets das convenções se houver token REST; sem token, seguir com renders em contexto.

**Gate:** renders + tokens + medidas de todas as telas/estados do escopo em mãos.

## Fase 3 — Spec doc + mapeamento no design system

Escrever a spec no local definido nas convenções, seguindo [references/spec-template.md](references/spec-template.md): proveniência, telas com textos verbatim, tabela de tokens (Figma → tema do projeto), tabela de componentes (reuso > extensão > novo), e plano curto de implementação.

**Gate:** spec escrita + mapeamento aprovado pelo usuário (especialmente tokens/componentes novos). **Parar e aguardar aprovação antes da Fase 4.**

## Fase 4 — Implementação

1. Seguir a estrutura de código e padrões definidos nas convenções (arquitetura de feature, separação estado/visual, localização dos arquivos).
2. Componentes/estados reutilizáveis primeiro, depois a composição da tela. Evitar tela monolítica.
3. Medidas exatas da spec **via tokens do tema do projeto**, nunca valores mágicos. Textos verbatim.
4. Compilar/checar cedo e frequentemente com o comando de verificação rápida das convenções.

**Gate:** compila/builda sem erro e a tela renderiza com dados mock.

## Fase 5 — Loop de verificação visual

Seguir o loop em [references/visual-verification.md](references/visual-verification.md): subir o app conforme as convenções → screenshot pelo método das convenções → comparação com o render do Figma (tool de diff visual ou em contexto) → corrigir → repetir. Máximo 4 iterações por tela/estado; cobrir todos os estados do escopo.

**Gate:** convergiu ou 4 iterações com diffs residuais documentados.

## Fase 6 — Verificação final e entrega

Obrigatório antes de declarar pronto (evidência antes de afirmação):

1. Rodar os comandos de verificação das convenções (testes + build) frescos; reportar comandos e resultados.
2. `git diff --name-only` — todo arquivo alterado deve pertencer ao escopo aprovado nas Fases 1/3. Arquivo fora do escopo → parar e pedir autorização.
3. Atualizar índices/docs do projeto se as convenções exigirem.
4. Resumo final: o que foi implementado, mapa spec → arquivos, diffs visuais residuais (se houver), degradações usadas, comandos de verificação.

Não fazer commit a menos que o usuário peça.
