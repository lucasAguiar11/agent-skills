---
name: fast-subagent-protocol
description: Decide quando delegar e coordena subagents com contexto pronto, checkpoints por papel, cancelamento seguro e validação centralizada. Use antes de lançar Workers, Scouts, Reviewers ou Validators.
---

# Protocolo rápido de subagents

Subagent precisa reduzir o tempo total, não apenas transferir trabalho.

## Prioridade obrigatória: velocidade e economia de tokens

Otimize o tempo total até uma entrega verificada e o volume total de contexto, incluindo inicialização, ferramentas, coordenação e retrabalho — não apenas o tamanho da resposta final.

- Use o menor número de agentes e chamadas que preserve a entrega. Paralelize somente trabalhos independentes autorizados; não crie agentes apenas para encaminhar contexto.
- Leia trechos necessários, reutilize evidências atuais e compartilhe paths com revisão/seção, não documentos ou logs inteiros. Inclua no prompt os contratos indispensáveis; não obrigue o destinatário a redescobri-los.
- Mensagens entre agentes devem ser orientadas à próxima ação: resultado primeiro, uma informação por linha, nomes exatos de arquivos/símbolos e evidência localizável. Use texto compacto; JSON somente quando a ferramenta ou contrato exigir. Sem preâmbulos, recapitulações ou justificativas já registradas.
- Após o checkpoint inicial, envie somente mudanças relevantes, bloqueios, decisões necessárias ou conclusão. Não faça polling repetido quando houver entrega automática; enquanto aguarda, execute trabalho independente útil.
- Economia nunca autoriza omitir critérios de aceite, riscos, falhas, testes obrigatórios ou escopo. Não comprima com siglas inventadas, caminhos ambíguos ou referências inacessíveis. Não afirme ganho medido sem comparar dados observados.

Inclua em cada atribuição: `Prioridade: menor tempo até entrega verificada e menor contexto total; reporte apenas resultado, evidência e próximo passo, sem omitir bloqueios ou critérios de aceite.`

## Decidir se delega

Delegue somente quando houver:

- duas ou mais frentes independentes com paralelismo real;
- uma frente isolada grande, com entrega verificável própria; ou
- necessidade explícita de revisão independente.

Implemente diretamente quando a mudança for pequena, única ou fortemente sequencial.

As regras do repositório e o gate do workflow prevalecem. Este protocolo não autoriza novos papéis nem amplia o escopo aprovado.

## Preparar uma vez

Antes de delegar, o coordenador:

1. consulta codebase-memory e cobertura quando exigidos pelo repositório;
2. usa LSP para referências e símbolos quando disponível;
3. identifica arquivos, contratos, invariantes e fronteiras de escrita;
4. define interfaces entre trabalhos paralelos;
5. passa ao Worker todos esses resultados, inclusive falhas já confirmadas.

Reutilize a investigação enquanto arquivos, contratos e ambiente permanecerem válidos. Passe fonte e revisão/data da evidência; se algo mudar ou houver contradição, revalide somente a parte afetada. Falha comprovada de LSP ou índice deve acompanhar o contexto com o fallback direcionado; tente novamente apenas quando houver indício de recuperação ou mudança de ambiente.

## Escrever o prompt

Inclua somente:

- objetivo observável;
- arquivos permitidos e não objetivos;
- contrato já confirmado;
- alterações exatas;
- critérios de aceite;
- validações reservadas ao coordenador;
- momento e formato do checkpoint.

Não transforme uma alteração localizada em nova auditoria arquitetural. Não carregue skills sem relação direta com a fatia.

## Exigir progresso observável

Workers enviam checkpoint após a primeira edição. Scouts, Reviewers e Validators somente leitura enviam após a primeira descoberta verificável, com localização e evidência; nunca editem só para cumprir o checkpoint.

```text
CHECKPOINT
Editado ou descoberto:
Evidência:
Feito:
Falta:
Bloqueio:
```

Na conclusão:

```text
HANDOFF
Resultado: completo | parcial | bloqueado — comportamento entregue
Arquivos: paths alterados ou examinados
Evidência: critério de aceite → localização/resultado
Validação: comando executado + resultado; ou não executado + motivo
Pendências/riscos: nenhum | itens concretos
Próximo passo: nenhum | ação/comando e responsável
```

Se houver exploração repetida sem avanço, peça um checkpoint e indique o próximo resultado esperado conforme o papel. Descoberta verificável, alteração relevante ou comando em execução com progresso são avanços; silêncio ou uma espera expirada, isoladamente, não provam travamento. Cancele se, após a orientação, persistir a repetição sem avanço, houver travamento confirmado ou o trabalho deixar de ser necessário.

## Cancelar com segurança

Peça checkpoint e interrupção em um ponto seguro, quando o agente responder. Se estiver travado, cancele pela ferramenta disponível sem depender de uma resposta. Não assuma a escrita até confirmar que ele parou; solicitação de cancelamento não é confirmação.

Depois de confirmar a parada:

1. recupere o diff ou artefato parcial, preservando mudanças preexistentes;
2. confira quais Workers ainda escrevem nos arquivos e dependências envolvidos;
3. coordene a propriedade desses arquivos antes de corrigir e migrar consumidores;
4. valide quando o conjunto afetado estiver estável; não compile o projeto enquanto outros Workers ainda alteram esse conjunto.

Nunca trate o plano devolvido como prova de implementação.

## Centralizar validação

Workers não executam suítes amplas, build ou lint do projeto. Testes focados exigidos pelo workflow podem rodar sobre arquivos e dependências estáveis ou em ambiente isolado, sem disputar recursos de build. Restrições mais fortes do ambiente prevalecem: se a execução concorrente proibir validação, reserve uma etapa posterior estável para esses testes e não declare conclusão antes de obter a evidência exigida. O coordenador valida o diff integrado sem duplicar comandos cujo resultado ainda seja válido. Mudanças posteriores exigem repetir a verificação afetada:

1. revisão do diff e do escopo;
2. testes focados necessários;
3. suíte relevante e build final;
4. exercício da interface ou fluxo real;
5. `git diff --check`;
6. conferência de todos os consumidores e critérios nomeados.

## Checklist do coordenador

```text
[ ] A delegação oferece paralelismo ou isolamento útil
[ ] O Worker recebeu paths, contratos e evidências prontas
[ ] A primeira edição ou descoberta verificável gerou CHECKPOINT
[ ] Nenhum subagent permanece ativo
[ ] Todos os consumidores previstos foram migrados
[ ] Testes, build e superfície real foram verificados
[ ] O diff pertence ao escopo autorizado
```
