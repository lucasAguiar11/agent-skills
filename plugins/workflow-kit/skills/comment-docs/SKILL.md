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

| Manter | Remover |
|--------|---------|
| Header de módulo (`/** papel + gotcha */`) | `// GET /path → …` espelhando action/endpoint |
| JSDoc de export/campo com **invariante** (escala, ordem, null semântico, legado) | Banners `// --- Seção ---`, `// ===== … =====`, `// ───` |
| Gotchas de uso (writer único, idempotência, exclusividade de campos) | JSDoc de hook/wrapper que só repete a action/service |
| Comentário de UI/intenção restrita se for *why* | Comentário que parafraseia o identificador |
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

# Densidade por arquivo
rg -c "^\s*//|/\*\*" --glob '*.{ts,tsx,js,jsx}' <paths> | sort -t: -k2 -nr | head -40
```

Não apague cegamente. Comentários mistos (HTTP + gotcha na mesma linha) → **reescrever** só o gotcha.

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

## Saída esperada

1. Modo (Post-execution | standalone) e escopo (lista/paths)
2. Política AGENTS.md: intacta / proposta / atualizada
3. Contagem aproximada: banners/paths removidos; arquivos com header novo
4. Gotchas preservados (lista curta)
5. Resultado do typecheck/build
