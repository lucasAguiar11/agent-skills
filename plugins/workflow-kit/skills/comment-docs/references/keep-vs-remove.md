# Keep vs remove — comentários

## Remover (ruído)

```ts
// GET /invoices → envelope paginado { success, payload }
// ─── Hierarquia ──────────────────────────────────────────────
// ===== Import CSV (POST /imports/csv) =====
// ---- fábricas de estruturas zeradas ----

/** Listagem paginada de `GET /items`. */
export function useItemsPage(...) { ... }

/** Carrega o detalhe agregado do recurso. */
export async function getResourceDetail(...) { ... }

// Auth (401)
// Not Found (404)
// Mapeamento direto

// props
// handlers
// itera sobre os itens
for (const item of items) { ... }

/**
 * @param id - o id
 * @returns o usuário
 */
export function getUser(id: UUID): User { ... }

// TODO: melhorar isso depois
// antes usava fetch direto, migrado em 03/2024
```

## Manter / reescrever (gotcha)

```ts
/**
 * Faturamento — listagem, summary, pay e rebuild.
 * pay lança ALREADY_PAID; rebuild não sobrescreve linhas paid.
 */

/** Fração (0.0239 = 2,39%), não percentual 0–100. */
rate: Decimal

/**
 * Merge por caminho: o máximo é por dimensão (ex.: bandeira/parcela),
 * não por linha inteira — não existe "vencedor único" da linha.
 */

/** Exclusivo com parentId; null desvincula. */
parentId?: UUID | null

// Único ponto de escrita da URL: filtros + paginação no mesmo replaceState.

// eslint-disable-next-line react-hooks/exhaustive-deps -- ref estável, refetch manual
// @ts-expect-error lib sem types; shape validado em runtime pelo Zod acima
```

Pragmas têm efeito no build/lint. Não são prosa e não entram no strip, mesmo sem motivo escrito.

## Teste único

> Apague o comentário. Alguém escreve um bug agora?  
> **Não → apaga.** Sim → fica, em 1 linha.

Manter exige um motivo em uma palavra: escala, ordem, exclusividade, idempotência,
legado, writer único. Sem motivo nomeável, é narração — sai.
