---
name: comment-docs
description: >
  Limpa comentários narrativos e padroniza documentação de módulo: header curto
  no topo (papel/gotcha), JSDoc só para contrato/invariante, remove `// GET /path`,
  banners de seção e JSDoc que só repete o nome. Formaliza/atualiza a política em
  AGENTS.md se faltar. Roda no fim da entrega de feature (Post-execution) no diff
  da feature, ou standalone com inventário maior. Use when: "limpar comentários",
  "header de módulo", "comentários em excesso", "código sem comentários óbvios",
  "strip comments", "documentar módulos", ou `/comment-docs`.
---

# /comment-docs — Documentação de módulo (header + why)

Padroniza comentários no código-fonte: **um header por arquivo** com o essencial,
JSDoc só onde há contrato/gotcha, e remoção de narração que repete o óbvio.

Funciona em qualquer codebase. Idioma do header = idioma do projeto.

## Relação com outras skills

| Skill | Papel |
|-------|--------|
| `simplify` | Diff da feature: reuso, qualidade, eficiência; também apaga comentário WHAT óbvio |
| **`comment-docs`** | Headers de módulo + strip de ruído narrativo (`// GET /path`, banners, JSDoc espelho) |
| `feature-delivery` Post-execution | Após `simplify`, roda `comment-docs` **só nos arquivos do diff da feature** |

- **Não substitui** `simplify` (não faz review de reuso/eficiência).
- **Não é** inventário full-repo na Post-execution — isso seria caro e fora de escopo da feature.
- Standalone (`/comment-docs` sem feature): inventário maior é permitido; o usuário pode restringir paths.

## Princípio

**Teste único, aplicado a cada comentário:**

> Apague o comentário mentalmente. Alguém escreve um bug agora?
> **Não → apaga.** Sim → fica, condensado.

O default é **remover**. Manter é exceção e precisa de um motivo dizível em uma palavra:
escala, ordem, exclusividade, idempotência, legado, writer único. Se você não consegue
nomear o motivo, não é gotcha — é narração.

| Manter | Remover |
|--------|---------|
| Header de módulo (`/** papel + gotcha */`) | `// GET /path → …` espelhando action/endpoint |
| JSDoc de export/campo com **invariante** (escala, ordem, null semântico, legado) | Banners `// --- Seção ---`, `// ===== … =====`, `// ───` |
| Gotchas de uso (writer único, idempotência, exclusividade de campos) | JSDoc de hook/wrapper que só repete a action/service |
| Comentário de UI/intenção restrita se for *why* | Comentário que parafraseia o identificador |
| **Pragmas e diretivas** — `eslint-disable`, `@ts-expect-error`, `biome-ignore`, `prettier-ignore`, `@deprecated`, licença exigida (não são prosa: têm efeito) | `@param` / `@returns` que só repete nome e tipo já declarados |
| | Comentário inline que narra a linha seguinte (`// itera`, `// valida`, `// early return`) |
| | Histórico no código (`// antes usava X`, `// adicionado em 03/2024`) — git guarda isso |
| | Marcador de estrutura óbvia (`// props`, `// state`, `// handlers`) |
| | `TODO` / `FIXME` sem dono nem link de issue — apagar ou virar issue |
| | Código morto comentado (`// const`, `// import`, blocos desligados) — **apagar**, não comentar |

Referência rápida: `references/keep-vs-remove.md`.

## Modelos de header

```ts
/**
 * Faturamento — listagem, summary, pay e rebuild.
 * pay lança ALREADY_PAID; rebuild não sobrescreve linhas paid.
 */
'use server'
```

```ts
/** Envelopes HTTP/Action e escalares compartilhados (UUID, datas, decimal). */
export interface ApiResponse<T> { ... }
```

```ts
/**
 * Primitivos de preço compartilhados por simulação e planos.
 * Campos exclusivos: matrix vs byCoordinate — não enviar os dois.
 */
import type { Decimal } from "./common"
```

Regras do header:
- 1–4 linhas; idioma do projeto (PT se o resto for PT)
- Papel do módulo, não lista de exports
- Gotcha de módulo só se for transversal a vários exports
- **Posição:** no topo do arquivo, **preferencialmente antes** de `'use server'` / `'use client'` e imports. Se arquivos vizinhos já documentam logo após a use-directive, espelhar o vizinho
- Não colocar path HTTP completo nem `@file` / banners legais
- Arquivos minúsculos (≤~20 linhas, um único export óbvio) podem usar header de **uma** linha; não inventar prosa

## Modos de escopo

### A) Post-execution (feature-delivery) — default quando há feature em curso

1. Liste arquivos do diff da feature (`git diff` / `git diff --cached` / range da branch vs base).
2. Considere só source tocado (não lockfiles, não artefatos gerados).
3. Aplique inventário + limpeza + headers **apenas nesses arquivos**.
3b. **O alvo primário são os comentários que a feature acabou de escrever** — as linhas `+` do diff,
   não só o arquivo. Rode o passo 2.1 (auto-review) antes de declarar limpo: uma passada que só
   procura banner/`// GET /path` no arquivo inteiro dá "limpo" enquanto a feature enche o diff de
   paráfrase nova.
4. Política em `AGENTS.md`: se já existir o bloco header+why, **não** reescrever. Se faltar, **propor** (ou aplicar só se o usuário pediu política) — na Post-execution preferir *propor* para não competir com o passo AGENTS.md improvements; se o bloco for a política canônica e o arquivo já está aberto por este passo, pode inserir o bloco mínimo de `references/agents-policy.md` quando o repo ainda não tem **nenhuma** regra de comentários.
5. Não varrer o monorepo inteiro.

### B) Standalone (`/comment-docs`)

1. Paths do usuário, ou inventário em hotspots da árvore de app (`src/`, `app/`, `lib/`, `packages/*/src`, …).
2. Pode ser multi-onda (types → services → hooks → UI opcional).

## Workflow

### 1. Escopo e política

1. Detecte o modo (Post-execution vs standalone) e fixe a lista de arquivos.
2. Leia `AGENTS.md` / `CLAUDE.md` / `Claude.md`.
3. Se **não** houver política de comentários e o modo for standalone (ou o usuário pediu política): acrescente o bloco de `references/agents-policy.md` sob Conventions. Se já existir “Código sem comentários óbvios” sem detalhe, **expanda** para o bloco completo.

### 2. Inventário (antes de editar)

Classifique **ruído vs gotcha**. No modo A, rode as buscas **restritas aos paths do diff**.

```bash
# Paths HTTP narrados (ajuste globs à linguagem do repo: *.go, *.py, …)
rg -n "^\s*//\s*(GET|POST|PUT|PATCH|DELETE)\s+/" --glob '*.{ts,tsx,js,jsx}' <paths>

# Banners de seção
rg -n "^\s*//\s*[-=─═]{3,}" --glob '*.{ts,tsx,js,jsx}' <paths>

# JSDoc que só repete tipo/nome
rg -n "^\s*\*\s*@(param|returns)\s" --glob '*.{ts,tsx,js,jsx}' <paths>

# TODO/FIXME sem dono nem issue
rg -n "//\s*(TODO|FIXME)" --glob '*.{ts,tsx,js,jsx}' <paths>

# Densidade por arquivo — atacar primeiro os acima de ~1 comentário/25 linhas
rg -c "^\s*//|/\*\*" --glob '*.{ts,tsx,js,jsx}' <paths> | sort -t: -k2 -nr | head -40
```

Não apague cegamente. Comentários mistos (HTTP + gotcha na mesma linha) → **reescrever** só o gotcha.
Pragmas (`eslint-disable`, `@ts-expect-error`, `biome-ignore`, `prettier-ignore`) **nunca** entram no strip — removê-los muda o build.

Os greps acima acham ruído **mecânico**. Eles não acham paráfrase — e paráfrase é o que uma feature
recém-escrita produz. Zero hits aqui **não** é "limpo": é só o fim do passo mecânico.

### 2.1 Auto-review: os comentários que você mesmo escreveu

Comentário que o autor acabou de escrever passa no teste único por um motivo falso: o autor ainda tem
o porquê na cabeça e o lê no texto. **Julgue como se outra pessoa tivesse escrito, sem contexto.**

```bash
# 1. Comentários ADICIONADOS pelo diff — a lista real a auditar (modo A)
git diff -U0 | rg "^\+\s*(//|\*|/\*)" | sort | uniq -c | sort -rn

# 2. Justificativa repetida: mesma frase em 2+ lugares do diff
git diff -U0 | rg -o "^\+\s*//\s*(.{15,60})" -r '$1' | sort | uniq -c | sort -rn | rg -v "^\s+1 "

# 3. Comentário colado numa linha que já diz a mesma coisa (paráfrase)
git diff -U0 -U1 | rg -B0 -A1 "^\+\s*//"
```

Três sinais de descarte, aplicados nessa ordem:

1. **Repetição** — a mesma justificativa aparece em N lugares (`FEAT-XXXX: <mesma frase>` no schema, na
   entity, no port, no DTO, no use case). Fica **uma**, no ponto menos dedutível; as outras saem.
   Justificativa repetida não é ênfase, é ruído multiplicado.
2. **Paráfrase da linha seguinte** — `// rascunho não vira contrato` sobre `if (status !== 'approved') throw`,
   `// ADMIN-only` sobre `@Roles(Role.ADMIN)`, `// idempotente` sobre um early-return óbvio. O código
   já diz; o comentário só traduz.
3. **Só o ID da feature** — `// FEAT-20260727: …` que, tirado o ID, não sobra invariante nenhuma.
   Rastreabilidade é trabalho do git/plano, não do código.

Teste final por comentário sobrevivente: **nomeie o motivo em uma palavra** (escala, ordem,
exclusividade, idempotência, legado, writer único, acoplamento, intenção). Não conseguiu nomear em uma
palavra? Não é gotcha — é narração, apaga.

### 3. Limpeza mecânica segura

Automatize **somente**:
- linhas que são só banner de seção (`// ---`, `// =====`, `// ───`)
- linhas que são só `// METHOD /path …` sem invariante extra

Após strip, colapse 3+ newlines em 2. **Não** use regex para apagar todo JSDoc.

### 4. Headers e JSDoc

Para cada arquivo no escopo:

1. **Adicionar/atualizar** `/** … */` de módulo se faltar ou for só label de seção.
2. **Remover** JSDoc de export que só renomeia a função/tipo ou repete o path da API.
3. **Condensar** gotchas de campo: 1 linha quando bastar; multi-linha só para invariante densa.
4. **Mover** gotcha de função para o header do módulo se for o único motivo do arquivo existir (evita header + JSDoc duplicado).
5. Conferir JSDoc **colado no campo certo** (não no símbolo anterior).

Ondas (standalone / repos grandes):
1. types/DTOs + política AGENTS (se aplicável)
2. actions/services + API client/endpoints
3. hooks + utils
4. UI (opcional)

### 5. Verificação

1. Gate de tipos/build do projeto — leia `AGENTS.md` / scripts do `package.json` etc. Rode o gate real do repo.
2. `git diff` — **sem** mudança de lógica/comportamento; só comentários e (se aplicável) política em AGENTS.md.
3. Re-checar o escopo: zero banners de seção e zero `// METHOD /path` puro nos arquivos tocados; headers presentes onde faltavam.
   Cada comentário sobrevivente passa no teste único — se você não sabe dizer o motivo dele em uma palavra, ele ainda não devia estar lá.
   Rodar de novo o passo 2.1 sobre o diff final: nenhuma justificativa repetida, nenhuma paráfrase da
   linha seguinte, nenhum comentário cujo conteúdo seja só o ID da feature. Declarar "limpo" só depois
   desse re-check — "os greps mecânicos não acharam nada" não é evidência de limpeza.
   Confirmar que nenhum pragma sumiu: `git diff -U0 | rg "^-.*(eslint-disable|ts-expect-error|biome-ignore|prettier-ignore)"` deve vir vazio.
4. Resumir: modo, arquivos, o que saiu, gotchas preservados, AGENTS.md, resultado do gate.

### 6. Commit

Só se o usuário pedir. Na Post-execution, o commit da feature (skill `commit`) pode incluir essas edições de comentário no mesmo conjunto de commits da entrega, se o usuário autorizar o commit.

Mensagens típicas (standalone):

```
docs: padronizar headers de módulo e limpar comentários narrativos
```

```
chore: limpar comentários narrativos e padronizar headers de módulo
```

## Anti-padrões

- Reescrever código “aproveitando” a passada de comentários
- Apagar JSDoc de escala, exclusividade de campos, ou compat legado
- Headers genéricos (`/** Types */`, `/** Utils */`) sem papel real
- Duplicar a mesma prosa no header do service e no hook que o chama
- Inventar `@module` / `@file` se o repo não usa
- Full-repo scan na Post-execution de uma feature
- Pular `comment-docs` na Post-execution porque “o simplify já limpou comentários” — papéis diferentes
- Declarar “limpo” com base só nos greps mecânicos, sem o auto-review do passo 2.1
- Poupar os comentários que você mesmo acabou de escrever — é onde mora a paráfrase, justamente porque
  o autor ainda tem o porquê na cabeça

## Saída esperada

1. Modo (Post-execution | standalone) e escopo (lista/paths)
2. Política AGENTS.md: intacta / proposta / atualizada
3. Contagem aproximada: banners/paths removidos; arquivos com header novo
4. Gotchas preservados (lista curta)
5. Resultado do typecheck/build
