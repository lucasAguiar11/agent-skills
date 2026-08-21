---
name: code-review-and-quality
description: 'Code review multi-eixo (correção, legibilidade, arquitetura, segurança, performance) de qualquer mudança antes do merge — Pull/Merge Request (GitHub ou GitLab) ou diff local sem PR aberto. Use sempre que o usuário pedir para revisar um PR/MR, analisar mudanças de código, fazer code review, avaliar um pull/merge request, revisar uma branch, ou avaliar código escrito por outro agente/modelo antes de entrar na main. Também se aplica quando o usuário mencionar "revisar PR", "code review", "review PR", "analisa esse PR", "olha esse pull request", "revisa essa branch", "revisa esse diff", ou fornecer um link de PR/MR. Alias legado: `pr-review`. Inclui análise de padrões da codebase, validação de uso de libs via context7, e geração de comentários prontos para postar (somente o subconjunto aprovado pelo usuário).'
---

# Code Review and Quality

Skill para conduzir code review de forma estruturada, avaliando as mudanças contra cinco eixos (correção, legibilidade, arquitetura, segurança, performance) e contra os padrões e convenções já existentes na codebase.

## Modos

| Modo | Input | O que roda |
|---|---|---|
| **A. PR/MR remoto** | URL do PR/MR | Fluxo completo: coleta via plataforma, checkout, todas as etapas, geração e postagem de comentários |
| **B. Diff local** | Branch, range de commits ou working tree (sem PR aberto) | Etapas 2 a 4: padrões da codebase, context7, integridade dos testes, cinco eixos, revisão e veredicto. **Sem** etapa 1 de coleta e **sem** etapa 5 de postagem |

Modo B cobre o caso "outro agente (ou você) escreveu esse código e ele ainda não virou PR". A régua de julgamento é a mesma nos dois modos; só muda de onde vem o diff e para onde vai o resultado.

**Input do modo A:**
- **PR_URL** / **MR_URL**: URL do Pull Request (GitHub) ou Merge Request (GitLab)
  - GitHub: `https://github.com/org/repo/pull/123`
  - GitLab: `https://git.lab.example.com/group/repo/-/merge_requests/123`

**Input do modo B:** o range a revisar (`git diff main...HEAD`, `git diff HEAD`, ou os arquivos que o usuário apontou). Se não estiver claro, pergunte antes de revisar.

## Padrão de Aprovação

Aprove uma mudança quando ela **melhora a saúde geral do código**, mesmo que não esteja perfeita. Código perfeito não existe — o objetivo é melhoria contínua.

- Não bloqueie porque não é do jeito que você teria escrito.
- Se melhora a codebase e segue as convenções do projeto, aprove.
- O oposto também vale: "funciona" não é o padrão. Ver `## Racionalizações Comuns`.

## Etapas

### 1. Coleta de Dados e Checkout na Branch do PR (modo A)

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

No **modo B**, pule esta etapa: você já está na branch. Apenas delimite o escopo do diff e confirme com o usuário se houver dúvida.

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
- **Passagem de dados entre camadas**: como um call site vizinho já entrega payload para a camada de baixo (ex: `execute(dto)` direto vs field map explícito). É o baseline que separa "divergiu do padrão" de "é só um formato diferente do que eu escreveria".
- **Stack de banco de dados**: qual ORM/driver é usado (Prisma, TypeORM, Mongoose, etc.) e qual banco (PostgreSQL, MongoDB, etc.). Isso é crítico para não gerar findings incorretos (ex: Prisma+MongoDB não tem migrations, Mongoose não usa schema.prisma, etc.).

Isso serve como baseline para avaliar se as mudanças do PR estão alinhadas ou divergem dos padrões estabelecidos. Documente os padrões encontrados brevemente antes de prosseguir.

Para entender padrões, leia os arquivos **existentes** mais similares aos que foram alterados no PR. Leia **os arquivos completos na branch do PR** (não apenas o diff) para entender o contexto completo — isso evita findings baseados em suposições incorretas.

Se o repo tiver `AGENTS.md` / `CLAUDE.md` / guia de estilo, ele é autoridade sobre estilo — leia antes de julgar convenção.

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

Antes de olhar a implementação, leia os testes: eles revelam intenção e cobertura. Existem testes para a mudança? Testam comportamento (não detalhe de implementação)? Cobrem edge cases? Têm nome descritivo? Pegariam uma regressão se o código mudasse?

### 3.6. Revisão nos Cinco Eixos

Percorra cada arquivo alterado aplicando os cinco eixos descritos em `## Os Cinco Eixos`. Para cada arquivo, nesta ordem:

1. **Correção** — o código faz o que o teste diz que ele deveria fazer?
2. **Legibilidade** — dá pra entender sem o autor explicar?
3. **Arquitetura** — encaixa no sistema?
4. **Segurança** — introduz vulnerabilidade?
5. **Performance** — introduz gargalo?

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
- **Eixo**: Correção | Legibilidade | Arquitetura | Segurança | Performance
- **Severidade**: `[Bug]` | `[Melhoria]` | `[Nit]`
- **Descrição**: O que está errado ou pode melhorar, e por quê. Tom direto, sem rodeios.
- **Sugestão**:
  ```typescript
  // código sugerido, se aplicável
  ```
- **Justificativa**: Referência ao padrão da codebase ou à documentação da lib (via context7/web search).

#### Severidade

Três níveis, sempre textuais:

| Severidade | Significado | Ação do autor |
|---|---|---|
| `[Bug]` | Bloqueia o merge | Obrigatório: vulnerabilidade, perda de dados, funcionalidade quebrada, regressão estrutural |
| `[Melhoria]` | Recomendado | Deveria ser tratado, mas não bloqueia sozinho |
| `[Nit]` | Opcional | O autor pode ignorar: formatação, preferência de estilo |

Se o autor está acostumado com a nomenclatura `Critical` / `Required` / `Optional` / `FYI`, o mapeamento é: `Critical` e `Required` → `[Bug]`; `Optional` / `Consider` → `[Melhoria]`; `Nit` / `FYI` → `[Nit]`. **Não use duas taxonomias na mesma revisão** — rotule tudo com os três níveis acima.

Rotular é obrigatório: sem rótulo, o autor trata toda sugestão como mandatória e perde tempo em nit.

#### Regras para Findings

- Priorize **bugs e riscos reais** sobre preferências estéticas.
- **Lidere pelo que importa.** Ordene por alavancagem: correção e segurança primeiro, depois regressão estrutural e simplificação perdida, depois o resto. Se você tem um problema estrutural e dez nits, o problema estrutural **é** a revisão — não enterre ele embaixo dos nits.
- Poucos findings de alta convicção valem mais que uma lista longa.
- Se o código do PR segue os padrões da codebase, diga isso explicitamente — não invente problemas para preencher a revisão.
- Cada finding deve ser **acionável** — o autor do PR precisa saber exatamente o que fazer.
- Ao apontar problema estrutural, **proponha o movimento**, não só o problema (ver `## Remédios Estruturais`).
- Se um finding depende de contexto que você não tem (ex: regra de negócio), sinalize como **pergunta** em vez de afirmação.
- **Sem emoji** em título, severidade, tabela, veredicto, rascunhos ou postagem. Sempre texto puro.

### Tabela Resumo

| Severidade | Eixo | Item | Descrição |
|---|---|---|---|
| Bug / Melhoria / Nit | Correção / ... | Título curto | Descrição em 1 linha |

### Veredicto

- **Aprovado** — Nenhum finding `[Bug]`, e os `[Melhoria]` são opcionais.
- **Aprovado com ressalvas** — Sem `[Bug]`, mas há `[Melhoria]` que deveriam ser tratados.
- **Mudanças necessárias** — Há findings `[Bug]` que precisam ser resolvidos antes do merge.

---

No **modo B**, a revisão termina aqui. Não existe PR para comentar; entregue o relatório no chat e pare.

### 5. Gere Comentários Prontos para o PR (modo A)

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

## Os Cinco Eixos

A régua de julgamento. Vale nos dois modos.

### 1. Correção

O código faz o que ele afirma fazer?

- Atende à spec ou aos requisitos da task?
- Edge cases tratados (null, vazio, valores de fronteira)?
- Caminhos de erro tratados (não só o happy path)?
- Passa nos testes? Os testes estão testando a coisa certa?
- Há off-by-one, race condition (dois fluxos concorrentes disputando o mesmo estado) ou inconsistência de estado?

### 2. Legibilidade e Simplicidade

Outra pessoa (ou outro agente) entende esse código sem o autor explicar?

- Nomes descritivos e consistentes com a convenção do projeto? (Nada de `temp`, `data`, `result` sem contexto.)
- Fluxo de controle direto (sem ternário aninhado, sem callback profundo)?
- Código organizado logicamente (coisas relacionadas juntas, fronteira de módulo clara)?
- Há truque "esperto" que deveria ser simplificado?
- **Dava pra fazer em menos linhas?** 1000 linhas onde 100 bastam é falha.
- **A abstração está pagando a complexidade que cobra?** Não generalize antes do terceiro caso de uso.
- Um comentário ajudaria a esclarecer intenção não óbvia? (Mas não comente o óbvio — ver skill `clean-comments`.)
- Sobrou código morto: variável no-op (`_unused`), shim de retrocompatibilidade, comentário `// removido`?
- **Um `if` novo foi parafusado em um fluxo que não é dele?** Isso é design smell, não nit — empurre a lógica para um helper, um estado ou uma policy própria em vez de embaralhar um caminho existente.
- **Aparecem condicionais repetidas sobre a mesma forma de dado?** Sinalizam modelo ou dispatcher faltando. Branch "temporário" costuma ser permanente.

### 3. Arquitetura

A mudança encaixa no design do sistema?

- Segue um padrão existente ou introduz um novo? Se novo, está justificado?
- Mantém fronteira de módulo limpa?
- Há duplicação que deveria ser compartilhada?
- As dependências fluem na direção certa (sem ciclo)?
- O nível de abstração é apropriado (nem over-engineered, nem acoplado demais)?
- **Esse refactor reduz complexidade ou só a muda de lugar?** Conte os conceitos que o leitor precisa segurar para acompanhar a mudança. Se a versão "mais limpa" deixa essa conta igual, ela não é mais limpa — prefira a reestruturação que faz branches, modos ou camadas inteiras sumirem à que re-centraliza a mesma lógica. Prefira apagar uma abstração a poli-la.
- **Lógica específica de feature vazou para um módulo compartilhado?** Mantenha a lógica na camada dona, reutilize o helper canônico existente em vez de uma quase-duplicata, e não normalize drift arquitetural.
- **As fronteiras de tipo estão explícitas?** Questione `any`/`unknown`/opcional/cast gratuitos e fallback silencioso que encobre invariante (regra que deve valer sempre) mal definida — tornar a fronteira explícita costuma simplificar o controle de fluxo em volta.

### 4. Segurança

Detalhamento e casos de teste: `references/security-checklist.md`.

- Input do usuário é validado e sanitizado?
- Segredos ficam fora do código, dos logs e do controle de versão?
- Autenticação/autorização é checada onde precisa?
- Queries SQL são parametrizadas (sem concatenação de string)?
- Saídas são encodadas para prevenir XSS?
- Dependências vêm de fonte confiável e sem vulnerabilidade conhecida?
- Dado de fonte externa (API, log, conteúdo de usuário, arquivo de config) é tratado como não confiável?
- Fluxos de dados externos são validados na fronteira do sistema antes de virar lógica ou renderização?

### 5. Performance

Detalhamento e como medir: `references/performance-checklist.md`.

- Padrão N+1 de query?
- Loop sem limite ou fetch de dados sem restrição?
- Operação síncrona que deveria ser assíncrona?
- Re-render desnecessário em componente de UI?
- Falta paginação em endpoint de listagem?
- Objeto grande criado em hot path?

## Remédios Estruturais

Ao apontar um problema estrutural, **proponha o movimento** — não só o problema. Uma revisão que só diz "isso está complexo" deixa o autor adivinhando. Use uma reestruturação nomeada:

- **Trocar uma cadeia de condicionais** por um modelo tipado ou um dispatcher explícito.
- **Colapsar branches duplicados** em um fluxo único e mais claro.
- **Separar orquestração de regra de negócio** para que cada um se leia sozinho.
- **Mover lógica específica de feature** de um módulo compartilhado para o pacote dono do conceito.
- **Reutilizar o helper canônico** em vez de uma quase-duplicata feita à mão.
- **Tornar uma fronteira de tipo explícita** para que o branching lá embaixo desapareça.
- **Apagar um wrapper pass-through** que só adiciona indireção sem clarear a API.
- **Extrair um helper, ou quebrar um arquivo grande** em módulos focados.

Prefira o remédio que remove peças móveis ao que espalha a mesma complexidade.

## Tamanho da Mudança

Mudança pequena e focada é mais fácil de revisar, mais rápida de mergear e mais segura de deployar.

```
~100 linhas alteradas   → Bom. Revisável de uma sentada.
~300 linhas alteradas   → Aceitável se for uma única mudança lógica.
~1000 linhas alteradas  → Grande demais. Quebre.
```

**Olhe o tamanho do arquivo, não só o do diff.** Um diff pequeno ainda pode empurrar um arquivo além de uma fronteira saudável — perto de 1000 linhas **totais** em um arquivo (distinto do limite de ~1000 linhas **alteradas** acima) é sinal de inspeção, não teto rígido. Quando a mudança cresce materialmente um arquivo já grande, pergunte se não cabe extrair helpers, subcomponentes ou módulos **antes** de empilhar mais. Decomponha, depois adicione.

**O que conta como "uma mudança":** uma modificação autocontida que resolve uma coisa, inclui os testes relacionados, e mantém o sistema funcionando depois de submetida. Uma parte da feature — não a feature inteira.

**Estratégias de split quando a mudança é grande demais:**

| Estratégia | Como | Quando |
|---|---|---|
| **Stack** | Submete uma mudança pequena e começa a próxima em cima dela | Dependência sequencial |
| **Por grupo de arquivo** | Mudanças separadas para grupos que precisam de revisores diferentes | Preocupação transversal |
| **Horizontal** | Cria código/stubs compartilhados primeiro, depois os consumidores | Arquitetura em camadas |
| **Vertical** | Quebra em fatias full-stack menores da feature | Trabalho de feature |

**Quando mudança grande é aceitável:** deleção completa de arquivo e refactor automatizado onde o revisor só precisa verificar a intenção, não cada linha.

**Separe refactor de feature.** Uma mudança que refatora código existente **e** adiciona comportamento novo são duas mudanças — submeta separadas. Limpeza pequena (renomear variável) pode entrar a critério do revisor.

## Descrição da Mudança

Toda mudança precisa de uma descrição que se sustente sozinha no histórico. Detalhamento: skill `commit`.

- **Primeira linha:** curta, imperativa, autossuficiente. "Remove o RPC de FizzBuzz", não "Removendo o RPC de FizzBuzz". Informativa o bastante para quem busca no histórico entender sem abrir o diff.
- **Corpo:** o que está mudando e por quê. Contexto, decisões e raciocínio que não aparecem no código. Link para issue, benchmark ou design doc quando houver. Reconheça limitações da abordagem quando existirem.
- **Anti-padrões:** "Fix bug", "Fix build", "Add patch", "Move código de A pra B", "Fase 1", "Add convenience functions".

## Higiene de Código Morto

Depois de qualquer refactor ou mudança de implementação, cheque o que ficou órfão:

1. Identifique o código agora inalcançável ou sem uso.
2. Liste explicitamente.
3. **Pergunte antes de apagar:** "Posso remover esses elementos agora sem uso: [lista]?"

Não deixe código morto largado — confunde leitor e agente futuro. Mas não apague em silêncio o que você não tem certeza. Na dúvida, pergunte.

```
CÓDIGO MORTO IDENTIFICADO:
- formatLegacyDate() em src/utils/date.ts — substituído por formatDate()
- Componente OldTaskCard em src/components/ — substituído por TaskCard
- Constante LEGACY_API_URL em src/config.ts — sem referências restantes
→ Posso remover?
```

## Disciplina de Dependências

Parte do code review é revisar dependência.

**Antes de adicionar qualquer dependência:**
1. A stack existente já resolve isso? (Quase sempre resolve.)
2. Qual o tamanho da dependência? (Cheque o impacto no bundle.)
3. É mantida ativamente? (Último commit, issues abertas.)
4. Tem vulnerabilidade conhecida? (`npm audit`)
5. Qual a licença? (Precisa ser compatível com o projeto.)

**Regra:** prefira biblioteca padrão e utilitário existente a dependência nova. Toda dependência é um passivo.

**Atualizar uma dependência existente** é uma mudança de código como outra qualquer, e o upgrade mais arriscado é o que entra em massa com a mensagem "bump deps". Revise com a mesma disciplina:

1. **Leia o changelog, não só o número da versão.** Semver é uma promessa que o mantenedor pode não ter cumprido — um "patch" pode carregar mudança de comportamento. Em major, leia as notas de migração e ache o que quebra.
2. **Uma dependência por mudança.** Suba e mergeie uma de cada vez (ou em grupos pequenos e relacionados). Quando um bump em massa quebra o build, você perdeu qual pacote fez isso; com uma só, a causa é óbvia e o revert é limpo.
3. **Deixe os testes decidirem.** O upgrade é verificado por suite verde antes **e** depois, não por "instalou". Se a cobertura em volta do comportamento da dependência é fraca, esse buraco é o finding de verdade — adicione o teste primeiro.
4. **Olhe o grafo transitivo.** A maioria dos pacotes instalados não foi escolhida por ninguém diretamente. Revise o diff do lockfile, não só do `package.json`; um bump direto pode puxar dezenas de mudanças indiretas.
5. **Mantenha o lockfile honesto.** Commite, revise o diff dele e nunca edite à mão. O lockfile é o que de fato fixa o que vai pro ar.

Para triagem de `npm audit` e risco de supply chain (typosquatting, mantenedor comprometido), veja `references/security-checklist.md`.

## Honestidade na Revisão

Revisando código — seu, de outro agente ou de outra pessoa:

- **Sem carimbo.** "LGTM" sem evidência de revisão não ajuda ninguém.
- **Não suavize problema real.** "Isso talvez seja uma preocupação menor" quando é um bug que vai pra produção é desonesto.
- **Quantifique quando der.** "Esse N+1 adiciona ~50ms por item da lista" é melhor que "isso pode ficar lento".
- **Empurre de volta abordagens com problema claro.** Bajulação é modo de falha em review. Se a implementação tem problema, diga direto e proponha alternativa.
- **Aceite override com elegância.** Se o autor tem contexto completo e discorda, prevalece o julgamento dele. Comente o código, não a pessoa.

### Resolvendo Desacordos

Hierarquia:

1. **Fato técnico e dado** vencem opinião e preferência.
2. **Guia de estilo** é autoridade absoluta em matéria de estilo.
3. **Design de software** se avalia por princípio de engenharia, não gosto pessoal.
4. **Consistência com a codebase** é aceitável quando não degrada a saúde geral.

**Não aceite "eu limpo depois".** Limpeza adiada raramente acontece. Exija a limpeza antes do merge, salvo emergência real. Se o problema em volta não cabe nesta mudança, exija a abertura de uma issue com dono.

## Revisão por Outro Modelo

Modelos diferentes têm pontos cegos diferentes. Quando o código foi escrito por um agente, revise com outro:

```
Modelo A escreve → Modelo B revisa (correção + arquitetura) → Modelo A trata os findings → humano decide
```

Prompt de exemplo para o agente revisor:

```
Revise esta mudança quanto a correção, segurança e aderência às convenções
do projeto. A spec diz [X]. A mudança deveria [Y]. Classifique cada finding
como [Bug], [Melhoria] ou [Nit].
```

No `feature-delivery`, esse papel já existe como o agente `task-validator` (QA adversarial por workstream) — não duplique a validação aqui quando ela já rodou.

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
- **Esta skill revisa, não conserta.** Ela produz findings; quem aplica é o autor (ou a skill `simplify`, no diff local, dentro do mandato dela).

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
8. **Formato diferente não é finding.** Se a única diferença entre o código do PR e o "seu jeito" é a mesma informação em outra forma (destructure vs passar o objeto, ordem de campos, `async` vs `.then`), não é finding — nem `[Nit]`. Só vira finding com duplicação real, risco de bug, ou divergência de um padrão que você **verificou** em um call site vizinho (etapa 2).

## Checklist de Revisão

```markdown
## Revisão: [título do PR/mudança]

### Contexto
- [ ] Entendi o que a mudança faz e por quê

### Correção
- [ ] Atende à spec/requisitos da task
- [ ] Edge cases tratados
- [ ] Caminhos de erro tratados
- [ ] Testes cobrem a mudança adequadamente
- [ ] Nenhum teste foi enfraquecido sem contrato que justifique

### Legibilidade
- [ ] Nomes claros e consistentes
- [ ] Lógica direta
- [ ] Sem complexidade desnecessária

### Arquitetura
- [ ] Segue os padrões existentes
- [ ] Sem acoplamento ou dependência desnecessária
- [ ] Nível de abstração apropriado
- [ ] Refactor reduz complexidade em vez de relocá-la
- [ ] Sem lógica de feature em módulo compartilhado; arquivo dentro de tamanho saudável

### Segurança
- [ ] Sem segredo no código
- [ ] Input validado na fronteira
- [ ] Sem vulnerabilidade de injeção
- [ ] Checagem de auth no lugar
- [ ] Fonte de dado externa tratada como não confiável

### Performance
- [ ] Sem padrão N+1
- [ ] Sem operação sem limite
- [ ] Paginação em endpoint de listagem

### Verificação
- [ ] Testes passam
- [ ] Build passa
- [ ] Verificação manual feita (se aplicável)
- [ ] Upgrade de dependência revisado contra changelog, isolado por pacote, com diff do lockfile revisado

### Veredicto
- [ ] **Aprovado** — pronto pro merge
- [ ] **Aprovado com ressalvas**
- [ ] **Mudanças necessárias** — há `[Bug]` a resolver
```

## Racionalizações Comuns

| Racionalização | Realidade |
|---|---|
| "Funciona, tá bom" | Código que funciona mas é ilegível, inseguro ou arquiteturalmente errado gera dívida que compõe. |
| "Eu escrevi, então sei que tá certo" | Autor é cego para as próprias suposições. Toda mudança ganha com outro par de olhos. |
| "A gente limpa depois" | Depois não chega. A revisão é o gate — use. Exija a limpeza antes do merge. |
| "Código gerado por IA provavelmente tá ok" | Código de IA precisa de mais escrutínio, não menos. Ele é confiante e plausível mesmo quando errado. |
| "Os testes passam, então tá bom" | Teste é necessário, não suficiente. Não pega problema de arquitetura, segurança nem legibilidade. |
| "O refactor deixou mais limpo" | Relocar complexidade não é reduzir. Se o leitor ainda segura o mesmo número de conceitos, a estrutura não melhorou — procure a versão em que branches desaparecem. |
| "É só uma adiçãozinha nesse arquivo" | Diff pequeno ainda empurra arquivo além do tamanho saudável e parafusa branch em fluxo alheio. Julgue a estrutura resultante, não o tamanho do diff. |
| "É só um bump de versão" | Bump é mudança de comportamento que você não escreveu. Leia o changelog; semver não garante ausência de quebra. |
| "Subo tudo num PR só pra ganhar tempo" | Bump em massa que quebra o build esconde qual pacote causou. Uma dependência por mudança mantém causa e revert limpos. |

## Red Flags

- PR mergeado sem nenhuma revisão
- Revisão que só checa se o teste passa (ignorando os outros eixos)
- "LGTM" sem evidência de revisão real
- Mudança sensível a segurança sem revisão focada em segurança
- PR grande demais para revisar direito (peça split)
- Correção de bug sem teste de regressão
- Comentário de revisão sem rótulo de severidade — deixa dúvida sobre o que é obrigatório
- Aceitar "arrumo depois" — nunca acontece
- Refactor que move código sem reduzir o número de conceitos que o leitor segura
- Mudança que engorda um arquivo já grande em vez de decompor
- `if` novo espalhado em caminho de código não relacionado (abstração faltando)
- Helper feito à mão que duplica um canônico existente, ou lógica de feature em módulo compartilhado
- PR "bump dependencies" em massa, sem revisão de changelog e sem isolamento por pacote
- Lockfile editado à mão, não commitado, ou mergeado sem revisar o diff

## Verificação

Ao fim da revisão:

- [ ] Todos os `[Bug]` foram resolvidos (ou o veredicto é "Mudanças necessárias")
- [ ] Os `[Melhoria]` foram resolvidos ou adiados com justificativa explícita
- [ ] Testes passam e build passa
- [ ] A história de verificação está documentada (o que mudou, como foi verificado)
- [ ] Upgrade de dependência revisado contra changelog, isolado por pacote, verificado por suite verde e com diff do lockfile revisado

**Bloqueadores presuntivos** — levante e proponha o design mais simples para cada um destes; escale para `[Bug]` só quando a mudança piora a estrutura ativamente:

- refactor que reloca complexidade em vez de reduzir;
- mudança que empurra arquivo além da fronteira de tamanho sem decompor;
- lógica de feature adicionada a módulo compartilhado;
- quase-duplicata de um helper canônico existente;
- fallback silencioso que esconde invariante mal definida.

## See Also

- `references/security-checklist.md` — checklist detalhado do eixo Segurança
- `references/performance-checklist.md` — checklist detalhado do eixo Performance
- `simplify` — aplica correções de reuso/qualidade/eficiência no diff local (esta skill só aponta)
- `clean-comments` — limpeza de comentário narrativo
- `commit` — mensagem de commit e descrição da mudança
- `test-guide` — cobertura e qualidade de teste
