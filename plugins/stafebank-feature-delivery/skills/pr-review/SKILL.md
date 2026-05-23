---
name: pr-review
description: Skill para revisão automatizada de Pull Requests no GitHub. Use sempre que o usuário pedir para revisar um PR, analisar mudanças de código, fazer code review, ou avaliar um pull request. Também se aplica quando o usuário mencionar "revisar PR", "code review", "review PR", "analisa esse PR", "olha esse pull request", ou fornecer um link de PR do GitHub. Inclui análise de padrões da codebase, validação de uso de libs via context7, e geração de comentários prontos para postar no GitHub.
---

# PR Review Skill

Skill para conduzir revisões de Pull Requests de forma estruturada, analisando apenas o diff do PR contra os padrões e convenções existentes na codebase.

## Input

O usuário fornecerá:
- **PR_URL**: URL do Pull Request no GitHub (ex: `https://github.com/org/repo/pull/123`)

## Etapas

### 1. Coleta de Dados e Checkout na Branch do PR

1. Extraia `owner`, `repo` e `pr_number` da URL fornecida.
2. Use o MCP do GitHub para obter os dados do PR em paralelo:
   - `pull_request_read` com method `get` — detalhes gerais (título, autor, branch base/head, estado)
   - `pull_request_read` com method `get_diff` — diff completo
   - `pull_request_read` com method `get_files` — lista de arquivos alterados
3. Identifique a branch base e a branch do PR (head ref).
4. **OBRIGATÓRIO — Checkout na branch do PR**: Antes de qualquer análise de código, faça:
   ```bash
   git fetch origin <head_ref> && git checkout <head_ref>
   ```
   Isso garante que a codebase local reflita exatamente o estado do PR. **Nunca analise apenas o diff remoto** — sempre leia os arquivos reais da branch para ter contexto completo (código antes e depois das mudanças, imports, dependências entre arquivos).
5. Se o diff for muito grande, priorize arquivos de lógica de negócio sobre configs, locks e assets.

### 2. Analise Padrões da Codebase (na branch do PR)

Antes de julgar as mudanças, entenda como o projeto já funciona. **Leia os arquivos reais da branch** (use Read, Glob, Grep) — nunca baseie findings apenas no diff. Identifique:

- **Estrutura de pastas e camadas**: controllers, services, repositories, DTOs, modules, etc.
- **Naming conventions**: camelCase vs snake_case, prefixos/sufixos em arquivos e classes.
- **Error handling**: como erros são capturados e propagados (exceptions customizadas, filtros, etc.).
- **Logging**: qual lib é usada, qual o padrão de log (structured, levels, contexto).
- **Validação**: como inputs são validados (class-validator, zod, joi, manual, etc.).
- **Testes**: se existem, qual framework, qual padrão de organização.
- **Imports e injeção de dependência**: padrão de imports, uso de DI container, barrel exports.
- **Configuração**: como env vars e configs são gerenciadas.
- **Stack de banco de dados**: qual ORM/driver é usado (Prisma, TypeORM, Mongoose, etc.) e qual banco (PostgreSQL, MongoDB, etc.). Isso é crítico para não gerar findings incorretos (ex: Prisma+MongoDB não tem migrations, Mongoose não usa schema.prisma, etc.).

Isso serve como baseline para avaliar se as mudanças do PR estão alinhadas ou divergem dos padrões estabelecidos. Documente os padrões encontrados brevemente antes de prosseguir.

Para entender padrões, leia os arquivos **existentes** mais similares aos que foram alterados no PR. Leia **os arquivos completos na branch do PR** (não apenas o diff) para entender o contexto completo — isso evita findings baseados em suposições incorretas.

### 3. Validação de Libs via Context7 (se disponível)

Para cada **lib adicionada ou que teve seu uso modificado** no PR:

1. Use o MCP context7 (`resolve-library-id` + `query-docs`) para buscar a documentação atualizada da lib.
2. Valide se:
   - A API da lib está sendo usada corretamente e de forma atualizada.
   - Existem abordagens mais idiomáticas ou performáticas recomendadas pela doc.
   - Há deprecation warnings ou breaking changes relevantes na versão usada.
3. Se o context7 não estiver disponível, use web_search como fallback para validar uso das libs.

**IMPORTANTE**: Faça a validação via context7 **ANTES** de formular findings. Se um finding depende do comportamento de uma lib (ex: decorators, validators, ORM features), confirme via documentação primeiro. Nunca afirme que algo é bug baseado apenas em suposição sobre como a lib funciona.

Não chame context7 para libs que não foram tocadas no PR — foco apenas no que mudou.

### 4. Produza a Revisão

Use exatamente esta estrutura:

---

## Revisão do PR #<número> — "<título>"

**Branch:** `<head>` → `<base>`
**Autor:** <login> | **Arquivos:** <N> | **+<additions> / -<deletions>**

---

### Resumo

O que o PR faz, em 2-3 frases objetivas. Inclua o contexto de negócio se identificável.

### Pontos Positivos

Liste o que o PR faz bem (se houver). Pode ser: boa cobertura de testes, separação de responsabilidades, uso correto de padrões existentes, etc. Se não houver nada de destaque, omita esta seção — não invente elogios.

### Findings

Para cada achado, use este formato:

#### [Título curto descritivo]

- **Arquivo**: `caminho/do/arquivo.ts` (L{linha_inicio}-L{linha_fim})
- **Severidade**: 🔴 Bug/Risco | 🟡 Melhoria | 🟢 Nit/Estilo
- **Descrição**: O que está errado ou pode melhorar, e por quê.
- **Sugestão**:
  ```typescript
  // código sugerido, se aplicável
  ```
- **Justificativa**: Referência ao padrão da codebase ou à documentação da lib (via context7/web search).

#### Regras para Findings

- Priorize **bugs e riscos reais** sobre preferências estéticas.
- Se o código do PR segue os padrões da codebase, diga isso explicitamente — não invente problemas para preencher a revisão.
- Cada finding deve ser **acionável** — o autor do PR precisa saber exatamente o que fazer.
- Se um finding depende de contexto que você não tem (ex: regra de negócio), sinalize como **pergunta** em vez de afirmação.

### Tabela Resumo

| Severidade | Item | Descrição |
|---|---|---|
| 🔴/🟡/🟢 | Título curto | Descrição em 1 linha |

### Veredicto

- ✅ **Aprovado** — Nenhum finding 🔴, e os 🟡 são opcionais.
- ⚠️ **Aprovado com ressalvas** — Sem 🔴, mas há 🟡 que deveriam ser tratados.
- ❌ **Mudanças necessárias** — Há findings 🔴 que precisam ser resolvidos antes do merge.

---

### 5. Gere Comentários Prontos para o PR

Simule um code review real no GitHub, gerando comentários prontos para copiar/colar ou postar via MCP.

#### Review Summary (comentário geral do PR)

Gere um texto em Markdown pronto para colar como **Review Summary** no GitHub, contendo:
- Resumo do que o PR faz (1-2 frases)
- Pontos positivos (se houver, em 1 frase)
- Lista compacta dos findings com severidade
- Veredicto final: `Approve` | `Request Changes` | `Comment`

Exemplo:

```markdown
## Review Summary

Este PR implementa o endpoint de webhook para eventos de pagamento, integrando com o serviço de notificações.

**Pontos positivos:** Boa separação entre controller e service, testes cobrindo os cenários principais.

**Findings:**
- 🔴 `src/webhook/webhook.service.ts` L45-52 — Race condition no processamento de eventos duplicados
- 🟡 `src/webhook/webhook.controller.ts` L12 — Validação do payload poderia usar class-validator (padrão do projeto)
- 🟢 `src/webhook/dto/event.dto.ts` L8 — Typo no nome da propriedade

**Veredicto:** ❌ Request Changes
```

#### Inline Comments

Para cada finding, gere o comentário formatado como apareceria no GitHub:

```
📁 `<caminho/do/arquivo>` (L<linha_inicio>-L<linha_fim>)

<emoji_severidade> **<título curto>**

<comentário detalhado explicando o problema e a sugestão>

\```suggestion
<código sugerido que o autor pode aceitar com um clique no GitHub>
\```
```

O bloco `suggestion` é o formato nativo do GitHub — quando colado num inline review, renderiza como sugestão que pode ser aceita com "Apply suggestion". Use sempre que a sugestão for uma mudança concreta no código.

#### Ação Final

Após apresentar todos os comentários:

1. Pergunte: **"Quer que eu poste esses comentários no PR via GitHub MCP?"**
2. Se o usuário confirmar E o MCP do GitHub estiver disponível, poste automaticamente:
   - O Review Summary como comentário geral
   - Cada inline comment no arquivo/linha correspondente
   - Com o status adequado (APPROVE, REQUEST_CHANGES, ou COMMENT)
3. Se o MCP do GitHub NÃO estiver disponível, apresente os comentários formatados para o usuário copiar e colar manualmente.

---

## Regras Gerais

- **Escopo**: Analise APENAS o diff do PR. Não comente código pré-existente que não foi tocado.
- **Idioma**: Responda no mesmo idioma que o usuário usou na solicitação.
- **Context7**: Use apenas para libs que foram adicionadas ou tiveram uso modificado no PR.
- **Web Search**: Use como fallback quando context7 não estiver disponível ou não retornar resultados úteis.
- **Neutralidade**: Se não tiver certeza sobre algo (ex: regra de negócio), formule como pergunta, não como crítica.
- **Eficiência**: Se o PR for trivial (typo fix, bump de versão), a revisão também deve ser curta e proporcional.

## Regras Anti-Falsos-Positivos

Estas regras existem para evitar findings incorretos que minam a credibilidade da revisão:

1. **Sempre faça checkout na branch do PR antes de analisar.** Ler apenas o diff remoto leva a findings baseados em suposições sobre o código que não foram verificadas.
2. **Leia os arquivos completos, não apenas o diff.** O diff mostra o que mudou, mas o contexto ao redor (imports, métodos adjacentes, lógica de fluxo) é essencial para entender se algo é realmente um bug.
3. **Verifique a stack antes de fazer findings sobre infra.** Exemplos de erros comuns:
   - Prisma + MongoDB **não tem migrations** — não peça migration.
   - Mongoose não usa `schema.prisma` — não referencie.
   - Projetos sem TypeORM não têm `@Entity()` decorators.
   - Verifique o `datasource` no `schema.prisma` ou o driver no `package.json` antes de afirmar algo sobre o banco.
4. **Confirme o comportamento de libs via context7/docs antes de afirmar que é bug.** Se um finding depende de como um decorator, validator, ou middleware funciona, valide primeiro. Não suponha.
5. **Verifique se a lógica que você critica realmente existe no código.** Antes de dizer "esse teste verifica lógica inexistente", leia o código inteiro do use case/service para confirmar. Antes de dizer "falta tratamento de X", confirme que X não é tratado em outro lugar.
6. **Não extrapole o diff para inferir problemas que não são demonstráveis.** Se o diff não mostra um bug claro e você precisa de 3+ suposições encadeadas para chegar à conclusão, formule como **pergunta**, não como finding 🔴.
7. **Cada finding 🔴 deve ser reproduzível** — descreva o cenário exato que causa o bug (input → comportamento esperado vs real). Se não consegue descrever o cenário, rebaixe para 🟡.
