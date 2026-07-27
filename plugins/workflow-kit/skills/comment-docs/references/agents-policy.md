# Bloco de política para AGENTS.md

Inserir sob `## Conventions` (ou equivalente) se o repo ainda não formalizar comentários:

```markdown
- **Comentários — header + why, não narração**
  - **Teste:** apague o comentário — alguém escreve um bug? Não → não escreva. O default é não ter comentário.
  - No topo do módulo: um `/** … */` curto com o **papel** do arquivo (e gotcha de módulo, se houver). Não repetir o path HTTP nem o nome do export.
  - JSDoc em export/campo **só** para contrato, invariante ou gotcha não óbvio (escala 0–1 vs 0–100, ordem de cascata, campo legado, null com semântica).
  - **Remover / não escrever:** `// GET /path → …` espelhando a action; banners `// --- Seção ---` / `// ===== … =====` sem invariante; JSDoc de hook que só repete a action; comentário que parafraseia o identificador.
  - Código morto comentado (`// const …`, blocos desligados) não entra no tree — apagar, não comentar. Idem histórico (`// antes usava X`) e `TODO` sem dono: git e issue tracker já guardam isso.
  - Pragmas (`eslint-disable`, `@ts-expect-error`, `biome-ignore`) são exceção: mantidos sempre, de preferência com o motivo na mesma linha.
```

Se já existir “Código sem comentários óbvios”, **substituir/expandir** por este bloco em vez de deixar as duas regras competindo.
