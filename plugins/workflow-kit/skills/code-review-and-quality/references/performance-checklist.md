# Checklist de Performance

Detalhamento do eixo 5 do `SKILL.md`. Use durante a etapa 3.6, nos arquivos do diff.

## Regra de entrada

**Otimização prematura também é finding ruim.** Um finding de performance precisa de:

1. **onde** — o caminho de código (por requisição, por render, por item de lista, no startup);
2. **quanto** — ordem de grandeza estimada, com a conta à vista ("lista de 200 itens → 201 queries", "+40ms por request");
3. **o que muda no mundo real** — latência do endpoint, tempo de tela, custo de banco, memória do processo.

Sem os três, é `[Nit]` ou nem isso. Não gaste review em microotimização de caminho frio.

## 1. Banco de Dados

- [ ] **N+1**: query dentro de loop, ou `map` que chama repositório por item. Sinal: `for (const x of items) await repo.find(...)`. Fix: uma query com `in`/`join`, ou o `include`/`with` do ORM.
- [ ] **Índice ausente**: campo novo usado em `where`/`orderBy`/`join` tem índice? Migration nova cria coluna que já entra em filtro sem índice?
- [ ] **Paginação**: endpoint de listagem novo tem limite? `findMany` sem `take` cresce com a tabela.
- [ ] **Projeção**: busca a linha inteira quando usa dois campos? (`select` explícito em tabela larga ou com blob.)
- [ ] **Contagem cara**: `count()` em tabela grande a cada request — vale cache ou contagem aproximada?
- [ ] **Transação longa**: chamada de rede (HTTP, fila) dentro de transação segura conexão do pool.
- [ ] **Escrita em loop**: N `insert`/`update` que caberiam em `createMany`/`updateMany` ou em um `upsert` em lote.

## 2. Rede e I/O

- [ ] **Chamadas sequenciais independentes**: dois `await` que não dependem um do outro → `Promise.all`.
- [ ] **`await` dentro de loop** sobre coleção: serializa tudo. Se as iterações são independentes, use `Promise.all` (com limite de concorrência quando a coleção for grande).
- [ ] **Timeout**: chamada externa nova tem timeout? Sem ele, um terceiro lento vira indisponibilidade sua.
- [ ] **Retry**: retry sem backoff nem teto amplifica incidente.
- [ ] **Payload**: resposta nova carrega objeto inteiro quando o cliente usa três campos?
- [ ] **Leitura de arquivo repetida**: mesmo arquivo lido a cada request, quando cabe leitura única no boot.
- [ ] **Cache**: resultado caro e estável recalculado a cada chamada. Se cachear, tem invalidação e limite?

## 3. CPU e Memória

- [ ] **Complexidade**: laço aninhado sobre coleções que crescem juntas (O(n²)). Um `Map` costuma resolver.
- [ ] **Trabalho em hot path**: parse, compilação de regex, criação de client/conexão, ou objeto grande dentro de handler de request/render — mova para fora.
- [ ] **Estrutura sem limite**: array/Map de cache, buffer de eventos, ou lista de sessões que só cresce. Precisa de teto ou TTL.
- [ ] **Leak de listener**: `addEventListener`/`on(...)`/`subscribe` sem o `off`/`unsubscribe` correspondente no cleanup.
- [ ] **Cópia desnecessária**: spread de coleção grande dentro de loop (`[...acc, item]` em `reduce` é O(n²)).
- [ ] **Bloqueio do event loop** (Node): hash/criptografia/parse pesado síncrono no caminho da requisição.

## 4. Frontend

- [ ] **Re-render**: valor novo criado inline (objeto, array, função) passado como prop quebra memoização do filho.
- [ ] **Dependência de efeito**: `useEffect` com dependência instável dispara a cada render.
- [ ] **`key` de lista**: índice como `key` em lista que reordena força remount.
- [ ] **Lista longa**: centenas de itens renderizados de uma vez sem virtualização nem paginação.
- [ ] **Estado no lugar errado**: estado que muda a cada tecla morando no topo da árvore re-renderiza tudo.
- [ ] **Bundle**: import novo puxa lib pesada inteira (`import _ from 'lodash'`)? Prefira import pontual ou carregamento sob demanda.
- [ ] **Imagem/asset**: dimensão e formato adequados, carregamento adiado fora da primeira dobra.

## 5. Startup e Caminho Quente

- [ ] Trabalho novo no boot (leitura de arquivo, migration, warmup, chamada externa) atrasa readiness?
- [ ] Middleware novo roda em **toda** requisição — o custo dele é proporcional ao valor?
- [ ] Log em hot path: serializar objeto grande a cada request custa, mesmo com o nível desligado (o argumento é avaliado antes).

## Como medir antes de afirmar

| Suspeita | Como confirmar barato |
|---|---|
| N+1 | Ligue log de query do ORM e conte as queries em uma chamada |
| Índice ausente | `EXPLAIN`/`EXPLAIN ANALYZE` na query — procure varredura sequencial |
| Endpoint lento | Trace/APM existente, ou timestamp em volta do handler |
| Re-render | React DevTools Profiler, ou contador de render temporário |
| Regressão de bundle | Compare o output do build antes/depois |
| Vazamento de memória | Heap snapshot antes/depois de N iterações |

Se não dá para medir dentro da revisão, escreva o finding como **pergunta com a conta à vista**: "essa lista costuma ter quantos itens? Se passa de ~100, isso vira 101 queries por request."

## Como escrever o finding de performance

```
[Bug] N+1 na listagem de pedidos

Arquivo: src/orders/list-orders.usecase.ts (L22-29)

Onde: por requisição de GET /orders (endpoint da tela inicial).
Quanto: 1 query da lista + 1 por pedido para buscar o cliente.
Com a página default de 50, são 51 queries; com 200, são 201.
Impacto: ~15ms por query no ambiente atual → +750ms na página default.

Fix: incluir o cliente na query da lista (include/join) ou buscar os
clientes em uma query com `in` e montar o map em memória.
```

## Falsos positivos comuns

| Achado | Por que costuma não ser finding |
|---|---|
| "Esse loop poderia ser mais rápido" | Coleção com 5 itens em caminho frio. Sem impacto. |
| "Falta cache" | Cache adiciona invalidação e bug de dado velho. Só é finding com custo medido. |
| "Deveria ser assíncrono" | Se a operação é rápida e o caminho é de boot, síncrono é mais simples e igual. |
| "N+1" em query dentro de loop de 1-2 iterações | Custo idêntico, complexidade maior no fix. |
| "Falta índice" em tabela pequena e estável | Índice tem custo de escrita. Confirme o tamanho antes. |
| "Isso aloca objeto" | Alocação em caminho frio não é problema. Só conta em hot path. |
