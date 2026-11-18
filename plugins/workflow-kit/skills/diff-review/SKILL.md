---
name: diff-review
description: "Revisão de código em pt-BR do diff desde um ponto fixo (commit, branch, tag ou merge-base) em três eixos: Funcionalidade (a mudança faz o que se propõe e a feature faz sentido para quem usa?), Padrões (a mudança mantém a estrutura atual e segue as convenções que o repo já usa?) e Enxugamento (ponytail-review: o que dá pra cortar?). Só reporta o que tem evidência no código; zero findings é resultado válido. Tem modo rápido (passada única no agente `diff-reviewer`, modelo haiku). Use quando o usuário pedir em português para revisar branch, diff, PR ou trabalho em andamento, perguntar se a feature faz sentido, se a mudança segue os padrões ou se está over-engineered."
---

Revisão do diff entre um ponto fixo e o estado atual, em três eixos:

- **Funcionalidade**: a mudança faz o que se propõe, e o que ela faz tem sentido para quem usa?
- **Padrões**: a mudança mantém a estrutura presente e segue as convenções que o repo já usa?
- **Enxugamento**: o que dá pra cortar, no formato do `ponytail-review`.

Fora de escopo: segurança e performance (use `code-review-and-quality`). Esta skill só lista; não aplica correções nem roda o código. Postar na PR só quando o usuário pedir (seção `Comentários na PR`).

## Regra zero: não inventar problema

Vale para tudo abaixo e ganha de qualquer outra instrução desta skill.

1. **Sem evidência, sem finding.** Cada item cita a linha do diff (número da linha no arquivo novo) **e** a prova: a regra documentada (arquivo + trecho) ou o código existente que mostra o padrão (`arquivo:linha`). No eixo Funcionalidade a prova é o cenário seguido no código: entrada ou estado, o caminho (`arquivo:linha`) e o resultado. Prova que você não leu nesta sessão não conta.
2. **Leia antes de afirmar.** Abra o arquivo inteiro, não só o hunk. Antes de dizer "falta X" ou "já existe Y", confirme com grep/read.
3. **Só o que o diff tocou.** Código pré-existente fora do diff não entra, nem como nit. Cenário de Funcionalidade só vale se passa por linha alterada.
4. **A régua é o repo, não seu gosto.** Smell genérico, "boa prática" de fora ou o jeito que você escreveria não viram finding sem padrão do repo que os sustente. "Eu faria a feature de outro jeito" também não.
5. **Formato diferente não é problema.** Mesma informação em outra forma (destructuring vs objeto, ordem de campos, `async` vs `.then`) só vira item se divergir de padrão verificado em código vizinho.
6. **Ferramenta ganha.** O que lint, formatter ou `tsc` já garantem fica de fora.
7. **Suposição encadeada vira pergunta.** Se a conclusão depende de regra de negócio ou de duas ou mais suposições, vai para `Perguntas` ou é descartada.
8. **Zero é resposta válida.** "Faz o que se propõe.", "Segue os padrões." e "Já está enxuto. Pode subir." são saídas completas. Nunca preencha lista para parecer útil.

## Processo

### 1. Fixar o ponto

Use o ponto que o usuário deu. Se não deu, use a branch padrão (`git symbolic-ref --short refs/remotes/origin/HEAD`, fallback `main`) e diga qual escolheu.

- `git rev-parse <ponto>` precisa resolver.
- Diff: `git diff $(git merge-base <ponto> HEAD)` (commits + mudanças não commitadas) e `git log --oneline <ponto>..HEAD`.
- Arquivos não rastreados (`git status --short`) entram só se forem parte da mudança; diga quais ignorou.
- Diff vazio: diga e pare.

### 2. Montar a régua

Antes de julgar, registre o que a mudança se propõe a fazer e como o repo já faz as coisas.

**Intenção** (régua do eixo Funcionalidade): o que a mudança entrega para quem usa, em uma ou duas frases, com a fonte. Procure nesta ordem e pare na primeira que responder: pedido do usuário nesta conversa; descrição da PR (`gh pr view`) e issue linkada; brief, PRD ou plano que o diff ou os commits citam; mensagens de commit. Sem nenhuma, infira do diff e marque `(inferida do diff)`.

**Contrato** (régua dos dados de fora, eixo Funcionalidade): para cada campo vindo de fora (API, banco, arquivo, fila) que o diff lê, converte ou formata, anote o formato real pela fonte do produtor: doc de contrato da API, schema, DTO ou handoff, inclusive em outro repo local. Exemplo da PR, KDoc ou teste do próprio diff não vale como formato: foi escrito pelo autor e herda o mesmo engano. Antes de aceitar parser ou formatador novo, procure no repo um que já trate o mesmo campo (grep pelo nome do campo e pelo exemplo do contrato).

**Padrões**: a lista abaixo é a **única** régua do eixo Padrões.

- **Documentada**: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, ADRs. Configs de lint/format/tsconfig só para saber o que a ferramenta já garante.
- **Viva**: para cada arquivo alterado, leia um ou dois vizinhos do mesmo tipo (outro use case, outro repositório, outro controller, outro teste). Anote camada/pasta, nome de arquivo e classe, injeção de dependência, tratamento de erro, validação, mapeamento entre camadas e estilo de teste.

Cada entrada com fonte: `regra — arquivo:linha`. Regra documentada ganha de padrão vivo quando divergem.

### 3. Eixo Funcionalidade

A mudança faz o que se propõe, e o que ela faz tem sentido para quem usa? Julgue o comportamento, não o código. A régua é a intenção do passo 2 e o comportamento que o produto já tem.

Para cada comportamento novo ou alterado, siga o caminho no código, da entrada (rota, comando, clique, job, evento) até o efeito, e pergunte:

- Entrega a intenção inteira? O que a intenção pede e não está no diff?
- Quem usa consegue chegar nela? (rota registrada, botão visível, flag ligada, comando exportado)
- O que acontece nos casos que o próprio diff abre: entrada vazia ou inválida, dado que já existia antes da mudança, erro no meio, ação repetida?
- Em caso igual, o produto já se comporta de outro jeito? (cite o comportamento vizinho: `arquivo:linha`)
- Duplica uma feature que já existe ou contradiz decisão documentada (ADR, README, brief)?
- Muda o resultado para algum chamador ou dado que já existia?

Rótulos:

- `[Falha]`: há um cenário concreto em que a mudança não entrega a intenção ou quebra comportamento que existia. Cite o cenário (entrada ou estado → o que acontece → o que deveria), o caminho no código e a fonte do "deveria".
- `[Lacuna]`: funciona no caminho principal, mas deixa um caso sem tratar ou diverge do comportamento vizinho. É julgamento; o autor pode ter motivo.

Limites:

- Você leu, não rodou. Cenário que depende do que o código não mostra (lib externa, banco, rede, dado de produção) vai para `Perguntas`, a não ser que o **Contrato** do passo 2 mostre o dado: aí o cenário usa o exemplo do contrato e pode virar `[Falha]`.
- "Essa feature deveria existir?" e "quem usa não ia preferir X?" são decisão de produto: vão para `Perguntas`. Só viram item quando o repo prova a duplicata ou a contradição.
- Intenção inferida do diff não sustenta `[Falha]` por "não entrega a intenção"; nesse caso `[Falha]` só para quebra de comportamento que existia.

### 4. Eixo Padrões

Para cada hunk, pergunte só o que a régua responde:

- Arquivo novo está na camada/pasta que já abriga coisas iguais?
- A direção de dependência documentada continua intacta?
- Reusa o helper, tipo, exceção ou porta que já existe, ou criou quase-duplicata? (cite o existente)
- Nomes e sufixos batem com os vizinhos?
- Erro, validação, DI, config e log usam o mesmo mecanismo dos vizinhos?
- Teste no mesmo lugar e estilo dos vizinhos? Se o repo exige teste para aquele tipo de mudança, ele existe?
- Introduz um **segundo jeito** de fazer algo que já tem jeito estabelecido?
- Mexe em estrutura fora do escopo (renomeia, move, reorganiza) sem que a mudança precise?

Rótulos:

- `[Quebra]`: viola regra documentada. Cite arquivo + trecho da regra.
- `[Desvio]`: diverge de padrão vivo. Cite o `arquivo:linha` do vizinho. É julgamento; o autor pode ter motivo.

### 5. Eixo Enxugamento

Aplique a skill `ponytail-review` ao diff (carregue-a se estiver instalada). Sem ela, use o mesmo contrato: uma linha por item, `` `arquivo.ts:L<linha>`: <tag>: <o que cortar>. <o que entra no lugar>. ``, com as tags:

- `delete`: código morto, flexibilidade sem uso, feature especulativa. Nada entra no lugar.
- `stdlib`: algo feito à mão que a biblioteca padrão já tem. Nomeie a função.
- `native`: dependência ou código fazendo o que a plataforma já faz. Nomeie o recurso.
- `yagni`: abstração com uma implementação, config que ninguém muda, camada com um único chamador.
- `shrink`: mesma lógica em menos linhas. Mostre a forma curta.

Texto em pt-BR, tags como estão; o placar sai traduzido conforme a seção `Saída`. Teste mínimo (um smoke ou self-check com `assert`) nunca é `delete`.

Ajustes desta skill:

- **Padrão do repo ganha do corte.** Abstração exigida por regra documentada (ex.: porta + adapter em Clean Architecture, DTO por camada) não é `yagni`, mesmo com uma implementação.
- `shrink` só com a forma curta escrita e equivalente. Se não consegue escrevê-la, não é finding.
- `stdlib`/`native` nomeiam a função ou recurso exato e só valem se existirem na versão de runtime declarada pelo repo.

### 6. Diff grande

Acima de ~400 linhas ou ~10 arquivos, rode os eixos 3, 4 e 5 em três sub-agentes paralelos. Cada prompt leva o comando do diff, a intenção e a régua do passo 2 e a **Regra zero colada na íntegra** (o sub-agente não tem outro acesso a ela). Ao receber, descarte qualquer item sem a evidência exigida.

### 7. Filtro final

Para cada item: tem linha do diff? Tem prova que eu li? Sobrevive se o autor perguntar "mostra onde"? Qualquer "não" → apague. Item repetido em mais de um eixo fica só no primeiro (Funcionalidade, depois Padrões).

Depois, releia no HEAD as linhas de cada item que sobrou (inclusive os vindos de sub-agente) e copie o trecho que vai na saída. Se o trecho não mostra o problema sozinho, apague o item.

### Modo rápido

Quando o usuário pedir revisão rápida (`rápido`, `fast`): delegue ao agente `diff-reviewer` (modelo `haiku`) passando só o ponto, e mostre a saída dele sem reescrever. Se o host ignora o `model` do agente, passe o modelo rápido do host na chamada; sem o agente no host, rode a passada única você mesmo.

Passada única: mesmos passos, Regra zero e Saída, com quatro cortes:

- Passo 2, régua viva: um vizinho por tipo de arquivo alterado, não por arquivo.
- Passo 3: só as duas primeiras perguntas (entrega a intenção, dá para chegar nela). Casos fora do caminho principal e comparação com comportamento vizinho ficam de fora.
- Passo 6 não roda: nenhum sub-agente, mesmo em diff grande.
- Passo 7: o filtro continua; a releitura final no HEAD sai e os trechos vêm das leituras já feitas.

## Saída

Sem emoji. Exatamente esta estrutura:

````markdown
## Revisão — `<ponto>`..HEAD

**Arquivos:** <N> | **+<add> / -<del>**

### Intenção
<o que a mudança se propõe a fazer, 1–2 frases> — fonte: <PR #n | pedido do usuário | `docs/...` | commits | inferida do diff>

### Régua
- <regra> — `<fonte>:<linha>`

### Funcionalidade

#### 1. [Falha] <título curto>

`arquivo.ts:L40-52` Cenário: <entrada ou estado> → <o que acontece>. Esperado: <o que deveria>, por <intenção ou `arquivo:linha` do comportamento que existia>. Ajuste: <o que fazer>.

`arquivo.ts:40-52`
```ts
<linhas do arquivo novo por onde o cenário passa>
```

#### 2. [Lacuna] <título curto>

`arquivo.ts:L60` Cenário: <entrada ou estado> → <o que acontece>. <Caso sem tratar, ou em que diverge do vizinho>. Ajuste: <o que fazer>.

`arquivo.ts:58-61`
```ts
<linhas do arquivo novo>
```
Comportamento vizinho em `outro.ts:20-24`:
```ts
<linhas que mostram como o produto já se comporta em caso igual>
```

### Padrões

#### 1. [Quebra] <título curto>

`arquivo.ts:L10-18` <o que diverge>. Regra: `AGENTS.md` "<trecho>". Ajuste: <o que fazer>.

`arquivo.ts:10-18`
```ts
<linhas do arquivo novo que mostram o problema>
```

#### 2. [Desvio] <título curto>

`arquivo.ts:L30` <o que diverge>. Ajuste: <o que fazer>.

`arquivo.ts:28-31`
```ts
<linhas do arquivo novo>
```
Padrão em `vizinho.ts:40-44`:
```ts
<linhas do vizinho que mostram o jeito do repo>
```

### Enxugamento

#### 1. delete: <título curto>

`arquivo.ts:L52-71`: delete: <o quê>. <substituto>.

`arquivo.ts:52-71`
```ts
<linhas a cortar>
```

#### 2. shrink: <título curto>

`arquivo.ts:L80-84`: shrink: <o quê>.

`arquivo.ts:80-84`
```ts
<forma atual>
```
Fica assim:
```ts
<forma curta equivalente>
```

net: -<N> linhas possíveis.

### Perguntas

#### <dúvida real que depende de contexto>

`arquivo.ts:12-15`
```ts
<trecho que motiva a dúvida, quando ela cita código>
```

**Resumo:** Funcionalidade: <n> (<pior item>). Padrões: <n> (<pior item>). Enxugamento: <n> (<pior item>).

**Veredito:** <Aprovar | Não aprovar> — <motivo em uma linha>
````

Trechos de código:

- Copie do arquivo no HEAD, lido nesta sessão. Não reescreva nem resuma o código; marque linhas omitidas com `...`. Acima de cada bloco, `arquivo:linha-inicial-final` do trecho.
- Mostre só as linhas que provam o item, até ~15 por bloco. Use a linguagem certa no bloco (`ts`, `sql`, `md`, `json`).
- `[Falha]`/`[Lacuna]`: trecho do código novo por onde o cenário passa. Quando o "deveria" vem de comportamento que já existe, o trecho dele também.
- `[Quebra]`: trecho do código novo. Mostre também o trecho da regra (doc, arquivo de config) quando ela não couber na frase.
- `[Desvio]`: trecho do código novo e trecho do vizinho citado.
- `shrink`: forma atual e a forma curta em blocos separados. `delete`/`yagni`: trecho a cortar, mais uma frase com a prova de que não tem uso (grep, chamador único).
- Duplicata: os dois trechos, o novo e o que já existe.
- Item que não é código (estrutura de pastas, seção de doc): mostre a árvore ou o trecho do doc no lugar do código.

Estrutura:

- **Intenção**: uma ou duas frases e a fonte. Não é item; se a intenção está errada, o autor corrige e a revisão roda de novo.
- **Régua**: só as regras que você de fato usou para julgar, inclusive para aprovar; no máximo ~8 linhas.
- Itens numerados por eixo, começando em 1, na ordem de gravidade (`[Falha]` antes de `[Lacuna]`, `[Quebra]` antes de `[Desvio]`).
- **Funcionalidade** vazio: `Faz o que se propõe.`
- **Padrões** vazio: `Segue os padrões.`
- **Enxugamento** vazio: `Já está enxuto. Pode subir.` no lugar dos itens e do `net`.
- **Perguntas** vazio: omita a seção.
- **Resumo** com eixo zerado: só o número, sem `(<pior item>)`.
- **Veredito**: `Não aprovar` se houver algum `[Falha]` ou `[Quebra]`; senão `Aprovar`. `[Lacuna]`, `[Desvio]`, Enxugamento e Perguntas não bloqueiam; o motivo cita o `[Falha]` ou `[Quebra]`, ou quantos ajustes opcionais ficaram.
- Não reordene nem misture eixos.

## Comentários na PR

Só quando o usuário pedir para postar. A revisão no chat continua completa; o comentário na PR é curto e direto.

- Antes de postar, mostre o preview no chat e espere aprovação explícita. Ajuste pedido muda o preview e ele é mostrado de novo; só poste a versão aprovada, sem mudar nada.
- Uma review, um comentário inline por item, na linha que mostra o problema. Corpo da review: uma linha (`<N> ajustes, comentados inline.`), sem repetir os itens.
- Comentário: 1–2 frases. O problema e o ajuste, com a referência (o cenário em uma frase, o `arquivo:linha` do padrão ou a regra do `AGENTS.md` em poucas palavras). Sem rótulo, sem título, sem explicar o óbvio.
- Código só se a frase não basta, até ~5 linhas.
- Bloco `suggestion` só se o item inteiro se resolve nas linhas comentadas e o arquivo compila depois de aplicar. Se precisa de import, outra linha, outro arquivo ou mover arquivo: sem `suggestion`, descreva o ajuste. Nunca divida um item em várias sugestões.
- Errou um comentário: edite o comentário. Nunca abra uma segunda review para corrigir a primeira.
- Perguntas de regra de negócio não vão para a PR sem pedido explícito.

Preview (exatamente o que vai ser enviado):

````markdown
**PR #<n>** · evento: `<REQUEST_CHANGES se Não aprovar | APPROVE se Aprovar>` · commit `<sha curto>`

**Corpo da review:** <uma linha>

1. `arquivo.ts:L34`
   > <texto do comentário, como vai aparecer>

2. `arquivo.ts:L35-43`
   > <texto do comentário>
   ```suggestion
   <linhas que substituem L35-43>
   ```

Posto assim?
````

Exemplo:

```markdown
`ACTIONS` duplica `PERMISSION_ACTIONS` (`src/domain/enums/screen.enum.ts:98`). Importe de `@domain/enums` e apague esta linha.
```
