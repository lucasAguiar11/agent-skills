# Spec doc e mapeamento no design system (Fase 3)

A spec vai para o local definido nas convenções do projeto. Se as convenções apontarem uma spec existente como exemplo, seguir o formato dela; senão, usar o template abaixo.

## Template

```markdown
# <Nome da feature> — <Projeto>

## Origem
- Figma URL: <url completa com node-id>
- Fonte: <servidor MCP usado>
- Tools usadas: `get_metadata` + `get_screenshot` + `get_variable_defs` + `get_design_context`
- File key: `<fileKey>`
- Node ID: `<node-id>` (formato API: `<node:id>`)
- Página: `<nome da página>`
- Frame/Node: `<nome verbatim do frame>` (`<node:id>`)
- Data da análise: <AAAA-MM-DD>

> **Escopo:** este documento cobre apenas <frames no escopo>. <Frames fora do escopo> ficam fora.

## Resumo
<2–4 parágrafos: o que a tela/fluxo faz, contexto, resolução/viewport alvo (das convenções).>

## Descrição das Telas
<Uma subseção por tela/estado, com render + descrição. Textos verbatim em `backticks`. Cobrir estados: padrão, hover, selecionado, vazio, erro, modal aberto/fechado.>

## Tokens
<Tabela: token do Figma (nome da variável) → valor → token correspondente no tema do projeto (ou "novo proposto").>

## Tokens novos propostos
<Somente se houver. Cada um com justificativa. Exigem aprovação antes de entrar no tema.>

## Componentes
<Tabela: elemento visual → componente existente reusado (arquivo) | extensão proposta | componente novo proposto.>
```

## Regras de mapeamento

Mapear **cada token extraído** contra a fonte de tokens do projeto (das convenções: theme, tokens, tailwind config…):

- Token já existe → usar o existente; registrar o mapeamento na spec.
- Token novo → listar em "Tokens novos propostos" e **pedir aprovação antes de adicionar ao tema**.

Mapear **cada elemento visual** contra os componentes reutilizáveis do projeto (das convenções):

- Componente existente cobre → reusar; nunca duplicar estilo inline.
- Variante nova de componente existente → propor extensão, pedir aprovação.
- Componente inédito → propor criação no design system, pedir aprovação.

## Plano de implementação (fecha a Fase 3)

Plano curto: arquivos a criar/alterar (conforme estrutura das convenções), estados da tela (carregando/vazio/pronto/erro/confirmação quando aplicável), riscos, comando de verificação. Parar e aguardar aprovação do usuário antes de implementar.
