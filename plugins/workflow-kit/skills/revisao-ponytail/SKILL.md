---
name: revisao-ponytail
description: "Revisão de código em pt-BR do diff desde um ponto fixo (commit, branch, tag ou merge-base) em dois eixos: Padrões (a mudança mantém a estrutura atual e segue as convenções que o repo já usa?) e Enxugamento (ponytail-review: o que dá pra cortar?). Só reporta o que tem evidência no código; zero findings é resultado válido. Use quando o usuário pedir em português para revisar branch, diff, PR ou trabalho em andamento, perguntar se a mudança segue os padrões ou se está over-engineered."
---

Revisão do diff entre um ponto fixo e o estado atual, em dois eixos:

- **Padrões**: a mudança mantém a estrutura presente e segue as convenções que o repo já usa?
- **Enxugamento**: o que dá pra cortar, no formato do `ponytail-review`.

Fora de escopo: aderência à spec, segurança e performance (use `code-review-and-quality`). Esta skill só lista; não aplica correções.

## Regra zero: não inventar problema

Vale para tudo abaixo e ganha de qualquer outra instrução desta skill.

1. **Sem evidência, sem finding.** Cada item cita a linha do diff (número da linha no arquivo novo) **e** a prova: a regra documentada (arquivo + trecho) ou o código existente que mostra o padrão (`arquivo:linha`). Prova que você não leu nesta sessão não conta.
2. **Leia antes de afirmar.** Abra o arquivo inteiro, não só o hunk. Antes de dizer "falta X" ou "já existe Y", confirme com grep/read.
3. **Só o que o diff tocou.** Código pré-existente fora do diff não entra, nem como nit.
4. **A régua é o repo, não seu gosto.** Smell genérico, "boa prática" de fora ou o jeito que você escreveria não viram finding sem padrão do repo que os sustente.
5. **Formato diferente não é problema.** Mesma informação em outra forma (destructuring vs objeto, ordem de campos, `async` vs `.then`) só vira item se divergir de padrão verificado em código vizinho.
6. **Ferramenta ganha.** O que lint, formatter ou `tsc` já garantem fica de fora.
7. **Suposição encadeada vira pergunta.** Se a conclusão depende de regra de negócio ou de duas ou mais suposições, vai para `Perguntas` ou é descartada.
8. **Zero é resposta válida.** "Segue os padrões." e "Já está enxuto. Pode subir." são saídas completas. Nunca preencha lista para parecer útil.

## Processo

### 1. Fixar o ponto

Use o ponto que o usuário deu. Se não deu, use a branch padrão (`git symbolic-ref --short refs/remotes/origin/HEAD`, fallback `main`) e diga qual escolheu.

- `git rev-parse <ponto>` precisa resolver.
- Diff: `git diff $(git merge-base <ponto> HEAD)` (commits + mudanças não commitadas) e `git log --oneline <ponto>..HEAD`.
- Arquivos não rastreados (`git status --short`) entram só se forem parte da mudança; diga quais ignorou.
- Diff vazio: diga e pare.

### 2. Montar a régua

Antes de julgar, registre como o repo já faz as coisas. Essa lista é a **única** régua do eixo Padrões.

- **Documentada**: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, ADRs. Configs de lint/format/tsconfig só para saber o que a ferramenta já garante.
- **Viva**: para cada arquivo alterado, leia um ou dois vizinhos do mesmo tipo (outro use case, outro repositório, outro controller, outro teste). Anote camada/pasta, nome de arquivo e classe, injeção de dependência, tratamento de erro, validação, mapeamento entre camadas e estilo de teste.

Cada entrada com fonte: `regra — arquivo:linha`. Regra documentada ganha de padrão vivo quando divergem.

### 3. Eixo Padrões

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

### 4. Eixo Enxugamento

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

### 5. Diff grande

Acima de ~400 linhas ou ~10 arquivos, rode os eixos 3 e 4 em dois sub-agentes paralelos. Cada prompt leva o comando do diff, a régua do passo 2 e a **Regra zero colada na íntegra** (o sub-agente não tem outro acesso a ela). Ao receber, descarte qualquer item sem a evidência exigida.

### 6. Filtro final

Para cada item: tem linha do diff? Tem prova que eu li? Sobrevive se o autor perguntar "mostra onde"? Qualquer "não" → apague. Item repetido nos dois eixos fica só em Padrões.

## Saída

Sem emoji. Exatamente esta estrutura:

```markdown
## Revisão — `<ponto>`..HEAD

**Arquivos:** <N> | **+<add> / -<del>**

### Régua
- <regra> — `<fonte>:<linha>`

### Padrões
- `arquivo.ts:L10-18` [Quebra] <o que diverge>. Regra: `AGENTS.md` "<trecho>". Ajuste: <o que fazer>.
- `arquivo.ts:L30` [Desvio] <o que diverge>. Padrão: `vizinho.ts:L42` <como é feito lá>. Ajuste: <o que fazer>.

### Enxugamento
- `arquivo.ts:L52-71`: delete: <o quê>. <substituto>.

net: -<N> linhas possíveis.

### Perguntas
- <dúvida real que depende de contexto>

**Resumo:** Padrões: <n> (<pior item>). Enxugamento: <n> (<pior item>).
```

- **Régua**: só as regras que você de fato usou para julgar, inclusive para aprovar; no máximo ~8 linhas.
- **Padrões** vazio: `Segue os padrões.`
- **Enxugamento** vazio: `Já está enxuto. Pode subir.` no lugar da lista e do `net`.
- **Perguntas** vazio: omita a seção.
- **Resumo** com eixo zerado: só o número, sem `(<pior item>)`.
- Não reordene nem misture eixos.
