---
name: pr-review
description: Skill para revisão automatizada de Pull Requests/Merge Requests (GitHub ou GitLab). Use sempre que o usuário pedir para revisar um PR/MR, analisar mudanças de código, fazer code review, ou avaliar um pull/merge request. Também se aplica quando o usuário mencionar "revisar PR", "code review", "review PR", "analisa esse PR", "olha esse pull request", ou fornecer um link de PR/MR. Inclui análise de padrões da codebase, validação de uso de libs via context7, e geração de comentários prontos para postar (somente o subconjunto aprovado pelo usuário).
---

# PR Review Skill

Skill para conduzir revisões de Pull/Merge Requests de forma estruturada, analisando apenas o diff do PR/MR contra os padrões e convenções existentes na codebase.

## Input

O usuário fornecerá:
- **PR_URL** / **MR_URL**: URL do Pull Request (GitHub) ou Merge Request (GitLab)
  - GitHub: `https://github.com/org/repo/pull/123`
  - GitLab: `https://git.lab.example.com/group/repo/-/merge_requests/123`

## Etapas

### 1. Coleta de Dados e Checkout na Branch do PR

1. Extraia da URL: plataforma (GitHub vs GitLab), `owner`/`project`, `repo` e `pr_number`/`mr_iid`.
2. Use **GitHub MCP ou `glab`, conforme a plataforma detectada**, para obter os dados do PR/MR em paralelo:
   - **GitHub** (`pull_request_read`):
     - method `get` — detalhes gerais (título, autor, branch base/head, estado)
     - method `get_diff` — diff completo
     - method `get_files` — lista de arquivos alterados
   - **GitLab** (`glab`):
     - `glab api projects/:id/merge_requests/:iid` — detalhes + `diff_refs`
     - `glab api projects/:id/merge_requests/:iid/changes` (ou `glab mr diff`) — diff/arquivos
3. Identifique a branch base e a branch do PR/MR (head ref).
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

### 3.5. Integridade dos Testes (Test Integrity)

Antes de produzir a revisão, inspecione **as mudanças em arquivos de teste e na config de teste/CI** no diff. O risco aqui é o PR ter ficado verde "movendo a trave" — alterando o teste em vez de corrigir o código. Procure por:

- testes **removidos ou comentados** sem que a feature/comportamento correspondente tenha sido removido;
- assertions deletadas ou matchers afrouxados (`toEqual` → `toBeDefined`, exato → parcial);
- `skip` / `only` / `xit` / `it.todo` / early `return` adicionados a um teste que antes rodava;
- valor esperado alterado para casar com a nova saída — confirme que isso reflete uma **mudança intencional de contrato** descrita no PR, não um ajuste para mascarar bug;
- enfraquecimento fora do arquivo de teste: `coverageThreshold` reduzido, `testPathIgnorePatterns`/`exclude` adicionado, match pattern estreitado, suite desabilitada no CI.

Para cada mudança de teste, classifique:
- **legítima** (`feature-driven`/`test-was-wrong`): mapeia para uma mudança de comportamento descrita no PR. Não é finding.
- **suspeita** (`escape-hatch`): não há mudança de comportamento que justifique. Levante como finding `[Bug]` e pergunte ao autor o que o teste deveria proteger e por que foi enfraquecido.

Não trate refator legítimo de teste (renomear, deduplicar, mover de camada mantendo a força) como escape-hatch. O gatilho é **perda de força de detecção sem contrato que justifique**.

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
- **Severidade**: `[Bug]` | `[Melhoria]` | `[Nit]`
- **Descrição**: O que está errado ou pode melhorar, e por quê. Tom direto, sem rodeios.
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
- **Sem emoji** em título, severidade, tabela, veredicto, rascunhos ou postagem. Sempre texto puro.

### Tabela Resumo

| Severidade | Item | Descrição |
|---|---|---|
| Bug / Melhoria / Nit | Título curto | Descrição em 1 linha |

### Veredicto

- **Aprovado** — Nenhum finding `[Bug]`, e os `[Melhoria]` são opcionais.
- **Aprovado com ressalvas** — Sem `[Bug]`, mas há `[Melhoria]` que deveriam ser tratados.
- **Mudanças necessárias** — Há findings `[Bug]` que precisam ser resolvidos antes do merge.

---

### 5. Gere Comentários Prontos para o PR

Simule um code review real, gerando comentários prontos para copiar/colar ou postar via **GitHub MCP ou `glab`, conforme a plataforma detectada**.

**Importante:** a revisão completa da etapa 4 é para o USUÁRIO ler no chat. Os comentários desta etapa são rascunhos. **O que vai para o PR/MR é decidido só na Ação Final** (subconjunto aprovado).

#### Prioridade de destino (obrigatório)

A forma **principal** de postagem é o **comentário inline** no arquivo/linha do diff. Tudo o mais é secundário.

| Prioridade | Destino | Quando usar |
|---|---|---|
| 1 (principal) | **Inline** no arquivo:linha do diff | Sempre que o finding tiver linha no diff do PR/MR |
| 2 (fallback) | **Note geral** no PR/MR | Só se a API recusar posição (arquivo fora do diff, seed, config não alterado, etc.) — e no corpo indique `arquivo:função/linha` |
| 3 (opt-in) | **Review Summary** (comentário geral de resumo) | Só se o usuário pedir explicitamente |

Regras:
- **Default de postagem = só inline.** Não postar summary nem note geral "por completude".
- Ancore cada finding em **arquivo + linha do diff** sempre que possível (já na etapa 4 e nos rascunhos).
- Preferir várias discussions inline a um único comentário longo no topo do PR.
- Inclua `suggestion` no inline quando a correção for uma mudança concreta de código.

#### Inline Comments (rascunhos) — canal principal

Para cada finding, gere o comentário formatado com prefixos textuais (sem emoji), **pensado para ir inline**:

```
`<caminho/do/arquivo>` (L<linha_inicio>-L<linha_fim>)

[Bug|Melhoria|Nit] **<título curto>**

<comentário detalhado, direto, sem emoji, explicando o problema e a sugestão>

\```suggestion
<código sugerido que o autor pode aceitar com um clique>
\```
```

- **GitHub**: bloco `suggestion` nativo — aceitável com "Apply suggestion"; poste via pending review + inline comments.
- **GitLab**: suggestions multi-linha usam a sintaxe ````suggestion:-N+M`; poste via `discussions` com `position`.
- Use suggestion sempre que a sugestão for uma mudança concreta no código.

#### Review Summary (comentário geral) — opt-in, não prioritário

Gere só como **rascunho opcional** se o usuário pedir summary. **Não** é o canal principal e **não** se posta por default.

Exemplo (sempre textual; **nunca** emoji):

```markdown
## Review Summary

Este PR implementa o endpoint de webhook para eventos de pagamento, integrando com o serviço de notificações.

**Pontos positivos:** Boa separação entre controller e service, testes cobrindo os cenários principais.

**Findings:**
- [Bug] `src/webhook/webhook.service.ts` L45-52 — Race condition no processamento de eventos duplicados
- [Melhoria] `src/webhook/webhook.controller.ts` L12 — Validação do payload poderia usar class-validator (padrão do projeto)
- [Nit] `src/webhook/dto/event.dto.ts` L8 — Typo no nome da propriedade

**Veredicto:** Request Changes
```

#### Ação Final — Preview, Aprovação e Postagem

A revisão completa (etapa 4) é para o USUÁRIO ler no chat — ela **NÃO** é a lista de postagem.
O que vai para o PR/MR é decidido em um fluxo separado. **Nunca poste sem preview + aprovação explícita.**

1. **Apresente os findings NUMERADOS** (F1, F2, F3...) e pergunte quais devem ser postados.
   Indique o destino planejado de cada um (`inline path:line` por padrão; `note geral` só se não der inline).

2. **Lista de postagem = somente os itens que o usuário aprovou explicitamente**, na última
   forma acordada durante a conversa (severidade, texto e teto de valores podem ter mudado).
   - Item discutido mas não aprovado → **NÃO** posta.
   - Item que o usuário mandou "tirar" → **NÃO** posta, mesmo que pareça importante.
   - **NUNCA** adicione itens além da lista aprovada, nem "aproveite" para incluir nits.

3. **Destino default = inline.** Review Summary e note geral só entram se o usuário pedir ou se inline for tecnicamente impossível (e aí avise no preview).

4. **Formato dos comentários postados** (obrigatório):
   - **Nunca use emoji** — nem no corpo, nem no título, nem no summary, nem no veredicto.
   - Use prefixos textuais: `[Bug]`, `[Melhoria]`, `[Nit]`.
   - Tom **direto e objetivo** (sem floreio, sem "ótimo trabalho!", sem ícones).

5. **Preview obrigatório antes de postar** (bloqueante):
   - Mostre o **payload completo** do que será enviado, não só a lista de títulos:
     - Para cada item: destino (**prefira** `[inline] arquivo:linha`; use `[note geral]` só com motivo), texto final do comentário, e se inclui `suggestion`.
     - Se summary estiver no escopo (opt-in): texto final do summary.
   - Formato sugerido do preview (uma seção por item):

     ```text
     PREVIEW DE POSTAGEM (nada foi enviado ainda)

     1. [inline] path/file.ts:42
        [Bug] Título
        <corpo completo do comentário>

     2. [note geral] (motivo: arquivo fora do diff)
        ...

     Confirmar postagem destes N itens? (sim / editar / cancelar)
     ```

   - **Poste somente** após o usuário responder de forma explícita (ex: "sim", "pode postar", "confirma").
   - "ok", "beleza" ou silêncio **não** contam se ainda não houve preview com o payload.
   - Se o usuário editar qualquer texto no preview, regenere o preview e peça confirmação de novo.

6. **Após postar**: liste o que foi criado com os IDs das notes/comments (e se cada um foi inline ou geral), para permitir edição ou deleção rápida se algo saiu errado.

Se a ferramenta de postagem não estiver disponível, apresente os comentários formatados para o usuário copiar e colar manualmente — ainda assim priorizando o formato inline e respeitando a lista aprovada (não despeje todos os findings) e o preview.

#### Plataforma: GitHub vs GitLab

Detecte pela URL do PR/MR (`github.com` vs domínio GitLab, ex: `git.lab.*`):

- **GitHub** → MCP do GitHub: priorize pending review + **inline comments** na linha do diff; summary só se opt-in.
- **GitLab** → `glab` CLI:
  - Dados do MR: `glab api projects/:id/merge_requests/:iid` (pegue `diff_refs`).
  - **Canal principal** — comentário inline: `POST .../discussions` com `position` (`position_type: text`,
    `base_sha`/`head_sha`/`start_sha` do `diff_refs`, `old_path`, `new_path`, `new_line`).
  - **IMPORTANTE**: `glab api --input` exige `-H "Content-Type: application/json"` (senão HTTP 415).
  - Arquivo **FORA** do diff (ex: seed, config) não aceita comentário posicionado →
    **fallback** note geral (`POST .../notes`) indicando arquivo/função no corpo — e declare o motivo no preview.
  - Suggestions multi-linha usam a sintaxe ````suggestion:-N+M` do GitLab.

---

## Regras Gerais

- **Escopo**: Analise APENAS o diff do PR. Não comente código pré-existente que não foi tocado.
- **Idioma**: Responda no mesmo idioma que o usuário usou na solicitação.
- **Sem emoji**: Nunca use emoji na revisão (chat), nos rascunhos nem no que for postado no PR/MR. Severidade e veredicto são sempre textuais (`[Bug]`, `[Melhoria]`, `[Nit]`, Aprovado, etc.).
- **Tom direto**: Seja objetivo. Sem floreio, sem celebração, sem ícones decorativos.
- **Inline primeiro**: o canal principal de postagem é comentário **inline** no diff. Note geral e Review Summary são secundários (fallback / opt-in).
- **Postagem com preview**: Nunca poste no PR/MR (nem via MCP/`glab`/API) sem mostrar o preview do payload e obter aprovação explícita do usuário.
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
6. **Não extrapole o diff para inferir problemas que não são demonstráveis.** Se o diff não mostra um bug claro e você precisa de 3+ suposições encadeadas para chegar à conclusão, formule como **pergunta**, não como finding `[Bug]`.
7. **Cada finding `[Bug]` deve ser reproduzível** — descreva o cenário exato que causa o bug (input → comportamento esperado vs real). Se não consegue descrever o cenário, rebaixe para `[Melhoria]`.
