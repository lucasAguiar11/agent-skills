---
name: review-plan
description: Revisa documentos de plano/implementação em loop até não encontrar problemas. Verifica consistência, ordem, referências cruzadas, e completude. Use quando quiser validar um plano antes de executar.
---

# Review Plan - Revisão Iterativa de Planos

Skill para revisar documentos de plano de implementação em loop até que nenhum problema seja encontrado.

**IMPORTANTE:**
- Revisar o documento **completo** a cada iteração — não pular seções
- Cada iteração deve produzir uma **tabela de problemas** encontrados
- Continuar iterando até uma iteração retornar **zero problemas**
- Corrigir todos os problemas encontrados antes da próxima iteração
- Reportar ao usuário quantas iterações foram necessárias

## Como invocar

```
/review-plan <caminho-do-arquivo>
```

Se nenhum caminho for fornecido, perguntar ao usuário qual arquivo revisar.

## Checklist de Verificação

A cada iteração, verificar **todos** os itens abaixo:

### 1. Estrutura e Contexto
- [ ] Título reflete o escopo real do documento
- [ ] Contexto/resumo lista corretamente o número de fases/frentes
- [ ] Pré-requisitos estão claros e completos
- [ ] Cada fase tem: contexto, alterações, verificação, arquivos afetados

### 2. Ordem e Dependências
- [ ] A ordem das fases respeita as dependências declaradas
- [ ] Nenhuma fase referencia artefatos que só existem em fases posteriores
- [ ] A tabela de ordem de execução é consistente com o conteúdo das fases
- [ ] Dependências entre fases estão explícitas

### 3. Referências Cruzadas
- [ ] Arquivos mencionados no texto aparecem na lista de arquivos afetados
- [ ] Nomes de classes/interfaces são consistentes entre seções
- [ ] Paths de arquivos são consistentes (não misturam convenções antigas com novas)
- [ ] Imports mencionados em código existem nos pré-requisitos

### 4. Conflitos de Alteração
- [ ] Nenhum arquivo é alterado em uma fase e reescrito/deletado em fase posterior sem menção
- [ ] Alterações em fases paralelas não conflitam no mesmo arquivo
- [ ] Se um arquivo é criado em uma fase e modificado em outra, a ordem está correta

### 5. Completude Técnica
- [ ] Migrations de banco mencionadas quando há alteração de schema
- [ ] Comandos de instalação/build incluídos onde necessário
- [ ] Variáveis de ambiente adicionadas E removidas conforme necessário
- [ ] DI container atualizado para novos registros
- [ ] Interfaces/contratos mantidos quando há substituição de implementação

### 6. Diagramas e Exemplos de Código
- [ ] Diagramas refletem corretamente o fluxo descrito no texto
- [ ] Delimitações (transactions, scopes) estão visualmente claras
- [ ] Exemplos de código são consistentes com a arquitetura descrita
- [ ] Tipos/interfaces nos exemplos existem ou são definidos no plano

### 7. Regras de Negócio e Lógica
- [ ] Fluxos descritos fazem sentido de ponta a ponta (não há passos mágicos ou vagos)
- [ ] Fontes de dados estão explícitas — de onde vêm, como são acessados, protocolo/formato
- [ ] Decisões em aberto que bloqueiam a implementação estão marcadas como **alta severidade**, não apenas listadas
- [ ] Suposições implícitas estão explicitadas (ex: "busca de API" — qual API? qual auth? qual formato?)
- [ ] Cada novo componente (adapter, handler, endpoint) tem sua responsabilidade clara e não duplica lógica existente
- [ ] Cenários de erro e fallback estão considerados (ex: fonte indisponível, dados inválidos, timeout)
- [ ] Efeitos colaterais estão mapeados (ex: se um passo falha, o que acontece com os anteriores?)

### 8. Verificações
- [ ] Cada fase tem checklist de verificação
- [ ] Itens de verificação são testáveis/observáveis
- [ ] Testes end-to-end cobrem o fluxo completo

## Processo

### Iteração N

1. **Ler** o documento completo
2. **Aplicar** cada item do checklist
3. **Produzir tabela** de problemas:

```
| # | Problema | Seção | Severidade |
|---|----------|-------|------------|
| 1 | ...      | ...   | alta/media/baixa |
```

4. Se **zero problemas**: reportar sucesso e número de iterações
5. Se **problemas encontrados**: corrigir todos, depois iniciar iteração N+1

### Severidades

- **Alta**: Bloqueia implementação ou causaria erro. Exemplos: referência a arquivo inexistente, ordem errada de dependências, conflito de alteração, **decisão em aberto que impede codificação** (ex: "qual API?" sem resposta), fonte de dados indefinida, fluxo com passo vago/mágico
- **Média**: Informação faltante que poderia causar confusão mas não bloqueia. Exemplos: migration não mencionada, import ausente, cenário de erro não considerado, nota explicativa necessária
- **Baixa**: Melhoria de clareza sem impacto funcional. Exemplos: renumerar seções, ajustar diagrama, typo

## Formato de Saída

Ao finalizar, reportar:

```
Revisão concluída em N iterações.
- Iteração 1: X problemas (Y alta, Z média, W baixa)
- Iteração 2: X problemas ...
- Iteração N: 0 problemas

Documento aprovado.
```
