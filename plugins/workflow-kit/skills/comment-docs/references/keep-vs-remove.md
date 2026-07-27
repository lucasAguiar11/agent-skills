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
```

## Checklist mental (1 frase)

> Se o código e os nomes já dizem o mesmo, o comentário sobra.  
> Se apagar muda o risco de bug futuro (escala, ordem, exclusividade, legado), fica.
