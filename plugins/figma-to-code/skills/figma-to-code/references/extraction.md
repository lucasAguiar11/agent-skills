# Extração do Figma (Fases 1–2)

Independente de stack — tudo aqui é só Figma. Diretórios de destino vêm das convenções do projeto.

## Parse da URL e proveniência

- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → extrair `fileKey` e `nodeId`.
- Converter `nodeId` de `-` para `:` para chamadas de API (ex.: `2164-1601` → `2164:1601`). Registrar ambos os formatos.
- URL com `/branch/:branchKey/` → usar `branchKey` como `fileKey`.
- Bloco de proveniência obrigatório (vira o `## Origem` da spec): URL completa, file key, node id (ambos formatos), página, frame (nome verbatim), servidor MCP/tools usados, data da análise (hoje, AAAA-MM-DD).

## Ordem de extração (por node confirmado)

1. `get_metadata` — estrutura, nomes de camadas, posições e tamanhos. Visão geral antes de mergulhar.
2. `get_screenshot` — render de referência de **cada tela/estado**. É a baseline da verificação visual.
3. `get_variable_defs` — tokens: cores, espaçamentos, tipografia, radius, efeitos.
4. `get_design_context` — layout, auto-layout, constraints, textos verbatim, medidas. Fonte principal para implementação.
5. `get_metadata` nos filhos quando `get_design_context` truncar ou faltar precisão de medida.

Se o servidor MCP cair no meio do caminho, repetir após confirmar que o Figma desktop está aberto; fallback para outro servidor Figma disponível (mesmos nomes de tool).

## Textos verbatim

Anotar todos os textos 100% verbatim — pontuação, capitalização e acentos exatamente como no Figma. Eles entram na spec e no código sem "correção". Divergência intencional exige aprovação do usuário e nota na spec.

## Assets em disco (PNGs para a spec e para o diff visual)

Com token da API REST no ambiente (`FIGMA_API_TOKEN` — **nunca** copiar o valor para resposta, doc ou commit):

```bash
# 1. Obter URL temporária do render
curl -sH "X-Figma-Token: $FIGMA_API_TOKEN" \
  "https://api.figma.com/v1/images/<fileKey>?ids=<nodeId>&format=png&scale=1.5"
# 2. Baixar o PNG da URL retornada para o diretório de assets das convenções
curl -sL -o <assets-dir>/<feature>-NN-<descricao>.png "<url-retornada>"
```

(Aplicar o prefixo de comando das convenções, se houver.)

Sem token: seguir só com os renders em contexto (`get_screenshot`) e anotar na spec que os PNGs não foram exportados. Não bloquear o workflow por isso.
