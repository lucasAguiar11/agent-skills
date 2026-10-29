---
name: service-blueprint
description: Desenha o blueprint de serviço ou a linha do tempo sequencial de um processo com vários atores (cliente, equipe, sistemas, terceiros) como um SVG único + PNG, e opcionalmente como board editável no Whimsical. Use quando o usuário pedir blueprint de serviço, linha do tempo ou fluxo de um processo, mapa de integração entre sistemas ("quais chamadas vamos precisar"), uma imagem para apresentar um processo, ou o mesmo diagrama no Whimsical. Inclui o gerador scripts/timeline.py (spec JSON → SVG/PNG com avisos de texto estourado), o conversor scripts/whimsical.py (SVG → objetos nativos do Whimsical), regras de conteúdo, estilo sem "cara de IA", balões explicativos, glossário e validação do conteúdo contra as fontes.
---

# Blueprint de serviço / linha do tempo em SVG

Serve para qualquer serviço com vários atores. Termos de domínio citados aqui são exemplos: troque pelos do projeto.

Arquivos desta skill (caminhos relativos a esta pasta):
- `scripts/timeline.py` — gerador: `python3 scripts/timeline.py spec.json saida.svg --png`. Imprime `WARN` para texto que estoura.
- `examples/example.json` — spec completa com todos os recursos (devolução de compra online, fictícia). Copie como ponto de partida.
- `scripts/whimsical.py` — conversor do SVG para objetos nativos e editáveis do Whimsical (§9).

## 1. Escolher a forma

| Necessidade | Forma | Como |
|---|---|---|
| Ordem dos eventos, quem entrega o quê a quem | **Linha do tempo sequencial**: colunas = atores, linhas = tempo, setas = trocas | `timeline.py` |
| O que cada etapa exige em cada camada | **Blueprint de serviço**: colunas = etapas, linhas = raias (§2) | gerador escrito à mão, mesmo estilo (§6) |
| Árvore de temas | Mapa mental — **evitar para processos**: esconde a ordem e informa pouco | — |

Para processos, a linha do tempo costuma ser a preferida; o blueprint por raias ajuda a checar cobertura. Só pergunte se o pedido não deixar claro.

## 2. Método do blueprint por raias

Cinco raias, de cima para baixo:
1. **Evidência física** — o que o cliente vê ou recebe (documentos, e-mails, etiquetas, telas).
2. **Ações do cliente**.
3. **Linha de frente** — o que a equipe ou o sistema faz à vista do cliente.
4. **Bastidores** — o que acontece sem o cliente ver.
5. **Suporte** — sistemas, terceiros e regras que sustentam os bastidores.

Três linhas separam as raias: **interação** (cliente × linha de frente), **visibilidade** (linha de frente × bastidores) e **interação interna** (bastidores × suporte). Marque **pontos de falha** (onde o fluxo trava ou depende de algo incerto) e **esperas** (trechos longos sem contato com o cliente). Na linha do tempo, os mesmos conceitos viram notas na coluna da direita e faixas de duração.

## 3. Levantar antes de desenhar

Cada item vem dos documentos ou do código do projeto. Melhor deixar lacuna do que inventar passo.
- **Atores:** 3 a 5 colunas. Com 6 ou mais, junte os menores ou use `"width": 1900`.
- **Etapas** em ordem, agrupadas em 4 a 7 fases. Se o processo já tem setores ou etapas com nome (no código, num manual), use esses nomes.
- **Cada troca:** o que vai, o tipo de documento (selo), a chamada de API se houver (método + endpoint) e se é opcional.
- **Notas:** o que trava, o que precisa confirmar, contingências; cada uma presa a uma linha.
- **Durações** que valem mostrar: item sob guarda; cliente esperando sem contato.
- **Faixa de baixo:** regras que valem para o fluxo todo e perguntas em aberto com quem responde.
- **Nomes:** os atores com os nomes que o usuário der (ou um cliente fictício já usado no projeto), um cenário só em todos os documentos. Diga no rodapé o que é fictício ou ilustrativo.

## 4. Entregável

Um SVG autocontido + um PNG com o mesmo nome (2x), colocado no topo do documento principal. O layout do `timeline.py`: título e subtítulo → cabeçalho (`DATA` · atores · `ATENÇÃO`) → linha do tempo com faixas de fase, balões e notas → faixa de baixo em duas colunas → glossário → legenda e rodapé. Textos no idioma do usuário (`labels`, `note_types`). Guarde a spec JSON ao lado do SVG para gerar de novo. Não apague versões de trabalho sem perguntar.

## 5. Formato da spec (`timeline.py`)

```jsonc
{
  "title": "…", "subtitle": "escopo · planejado, não testado · datas ilustrativas", "footer": "o que é fictício",
  "width": 1600,                                     // opcional
  "labels": {"date": "DATA", "attention": "ATENÇÃO", "optional": "…", "internal": "itálico colorido",
             "internal_desc": "ação interna", "sender": "cor da seta = quem envia",
             "balloon_info": "explica o passo", "balloon_confirm": "por que confirmar"},   // "internal": "" omite
  "note_types": {"block": {"label": "Trava"}, "confirm": {"label": "Confirmar"}, "contingency": {"label": "Contingência"},
                 "consult": {"label": "Consultor", "color": "#0f766e"}},                  // tipos novos são livres
  "actors": [{"id": "cli", "name": "Cliente", "role": "papel curto", "color": "#14783a"}],
  "tags":   {"NF": {"color": "#6d28d9", "tint": "#ebe3fa", "desc": "texto da legenda"}},
  "rows": [
    {"phase": "Pedido", "color": "#1d4ed8", "tint": "#f1f4fa"},                            // faixa; tint = fundo → sem faixa
    {"id": "r1", "date": "01/11", "from": "cli", "to": "loja", "label": "curto, em negrito",
     "sub": "detalhe", "code": "POST /api/recurso", "tag": "NF", "dashed": true,
     "note": {"type": "block", "text": "uma frase"},
     "balloon": "explicação ao lado do passo"},                                           // troca entre atores
    {"at": "loja", "label": "ação interna", "sub": "detalhe", "tag": "NF",
     "balloon": {"text": "O que é: … Por que: …", "kind": "confirm", "side": "left"}}     // dentro de um ator
  ],
  "spans": [{"actor": "erp", "from": "r1", "to": "r9", "kind": "held", "label": "…", "side": "left"},  // barra grossa
            {"actor": "cli", "from": "r2", "to": "r8", "kind": "wait", "label": "…"}],                 // pontilhado âmbar
  "bottom": {"left":  {"title": "Regras", "color": "#6d28d9", "key_width": 110, "items": [{"key": "Prazo", "text": "…"}]},
             "right": {"title": "O que precisamos saber", "color": "#955a06",
                       "items": [{"key": "Jurídico", "color": "#955a06", "text": "pergunta?", "hot": true, "hint": "← decide X"}]}},
  "glossary": {"title": "Siglas e termos", "color": "#1d4ed8", "columns": 3,
               "items": [{"term": "CAI", "text": "definição simples + ≈ equivalente conhecido"}]}
}
```

O gerador cuida de: espaçamento dos atores, altura das linhas, notas e balões empurrando as linhas de baixo para não sobrepor, faixas de fase, seta na cor de quem envia, grade do glossário, legenda que quebra em mais linhas, `<title>/<desc>` para acessibilidade, PNG via Chrome/Chromium sem janela ou `rsvg-convert`.

### Balões

- **Explicativos** (`"balloon": "texto"`): uma explicação curta ao lado do passo, no maior espaço livre da linha, com uma ponta apontando para ele. Use nos passos que alguém de fora não entenderia (por que o passo existe, o que muda em relação ao processo conhecido), cerca de um a cada 2–3 linhas. Uma ou duas frases.
- **De confirmação** (`{"text": "O que é: … Por que: …", "kind": "confirm"}`, laranja claro): **todo ponto em aberto ganha um.** Toda linha com selo incerto (ex.: `CONFIRMAR`, `FALTA`) ou com pergunta na coluna da direita leva um balão no formato "O que é: <o passo>. Por que: <o que quebra ou muda se a resposta for outra>". Se a linha já tinha balão explicativo, junte os dois nesse formato (um balão por linha). Antes de gerar, confira por script que nenhum ponto em aberto ficou sem balão de confirmação.
- `WARN balloon squeezed` = não há espaço ao lado: encurte o rótulo da linha ou force `side`.

### Glossário

Inclua sempre que o desenho usar siglas ou termos que o leitor pode não conhecer. Um item por sigla que **aparece no desenho**, definição tirada do glossário do próprio projeto, com "≈" o equivalente mais próximo que o leitor conhece.

### Mapa de integração

Quando o objetivo é validar as chamadas a um sistema externo ("são só essas?"): numere cada chamada no rótulo (`7 · Recepção`), ponha método + endpoint em `code` e um selo de certeza (`OK` = documentada, `CONFIRMAR` = caminho ou campo incerto, `FALTA` = precisamos, mas não sabemos como). Inclua as chamadas de preparação (token, cadastros), correções (anular, estornar) e conciliação, não só o caminho feliz. Antes de marcar `CONFIRMAR`, procure na documentação pública (base de conhecimento, specs): parte das dúvidas se resolve sem o fornecedor.

## 6. Estilo (já está no gerador; siga ao desenhar à mão)

Evite os dois extremos:
- **Cara de IA:** cartões arredondados com borda, sombra, barras coloridas no topo, pílulas arredondadas, barra lateral em caixas de nota, selos adesivos.
- **Sem cor:** tudo preto e cinza, cor só nos selos.

O meio-termo: fundo off-white quente, filetes finos quase pretos; **uma cor por ator** (nome, linha vertical apagada, setas na cor de **quem envia**, texto do método, ações internas em itálico); faixas de fase lisas em largura total; selos como marca-texto de canto reto; notas como ponto colorido + palavra em versalete colorida + texto simples; legenda numa faixa lisa.

Paleta inicial: atores `#14783a #1d4ed8 #0f766e #6d28d9`, extras `#b45309 #be185d`; selos `#c2410c/#fbe4d5`, `#6d28d9/#ebe3fa`; faixas `#f1f4fa #eff6f4 #f4f1fa`; balão explicativo `#fffdf5/#e3d9bf`, de confirmação `#fff1e2/#e9a466`. Use os tokens de marca do projeto se existirem (via `"style"` e cores da spec). Texto com contraste ≥ 4,5:1 nas faixas: o cinza `#6b665e`, o âmbar `#955a06` e as cores acima passam (≈5:1); cinzas mais claros como `#857f76` (3,6:1) não.

## 7. Fluxo de trabalho

1. Copie `examples/example.json` para perto da saída e edite (uma spec por diagrama, versionada no repo).
2. `python3 <pasta-da-skill>/scripts/timeline.py spec.json saida.svg --png`.
3. Corrija todo `WARN` **encurtando texto** (detalhe vai para `sub`, para a nota ou para o balão) antes de mexer em fonte ou largura.
4. Olhe o resultado. Imagens altas: renderize por partes trocando o `viewBox` do SVG numa cópia e capturando cada parte. O verificador não pega: rótulos cruzando a linha de um ator do meio de um jeito ruim, direção de seta ambígua, fase com uma linha só, nota longe do que descreve.
5. Gere de novo uma vez, confira de novo e pare quando estiver limpo.
6. Depois de renomear atores (nomes longos ou em maiúsculas), gere de novo: as larguras mudam.

PNG: sem `rsvg-convert`, use o Chrome sem janela com janela = viewBox e escala 2:
`"<chrome>" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=W,H --screenshot="$PWD/saida.png" "file://$PWD/saida.svg"`. O `timeline.py --png` já faz isso; confira o tamanho do PNG (largura = 2 × W).

## 8. Validar o conteúdo (antes de dizer que terminou)

Confira cada afirmação do desenho contra as fontes do projeto (procure a regra, a spec, a doc da API). Erros comuns: nome desatualizado de obrigação ou produto, condição faltando ("só acima do limite X"), data de início × data de exigência, passo opcional desenhado como obrigatório, código ilustrativo apresentado como real, etapa colocada antes da hora (ex.: algo que só acontece com a mercadoria já recebida). Corrija o desenho **e** o documento de origem; diga o que não foi conferido.

## 9. Levar para o Whimsical (board editável)

Quando o usuário quer editar o diagrama no Whimsical, peça por peça. Testado com o MCP do Whimsical.

**Caminhos que não servem:**
- **Subir o SVG ou o PNG como imagem:** o MCP não sobe arquivo, só o usuário arrastando, e a imagem não é editável.
- **Sequence diagram nativo:** a diagramação automática perde balões, faixas, selos e cores.

**O caminho que funciona:** recriar o SVG como objetos soltos (texto, retângulo, elipse, conector), nas mesmas posições.

```
python3 <pasta-da-skill>/scripts/whimsical.py saida.svg ops.json --x 2100 --y 60   # --scale 1.2 (padrão)
```

Envie cada lote de `ops.json` (`{"batches": [[...]]}`), **na ordem**, como `operations` da ferramenta `edit` do MCP remoto, numa área vazia do board. No SVG da linha do tempo saem cerca de 630 operações em 3 lotes.

**MCPs:**

| | Remoto | Desktop |
|---|---|---|
| Endereço | `https://mcp.whimsical.com/mcp`, login OAuth (`/mcp`) | `http://localhost:21190/mcp`, com o app aberto |
| IDs | Completos, 22 caracteres | Curtos, 6 caracteres; o remoto recusa |
| Cor | Aceita hex exato (vira cor da paleta do board) | REPL só aceita a paleta; `board_edit` arredonda o hex para a paleta |
| Usar para | Criar, atualizar, apagar, conferir por imagem | `board_repl` (ler a árvore), `board_snapshot` |

**Regras que o conversor já aplica:**
- **Ordem de criação:** o Whimsical não tem "mandar para trás" (nem pelo REPL), e o objeto criado por último fica por cima. Por isso a ordem é fundo → faixas → linhas de vida e períodos → resto. As linhas de vida e os períodos saem cortados nas bordas das faixas. Formas que ficam dentro de outra viram filhas dela.
- **Escala 1,2×:** a menor fonte do Whimsical (`xs`, cerca de 13 px) é maior que os 10–11 px do SVG.
- **Forma com texto:** tem no mínimo 40 px de altura. O selo vira um retângulo de 20 px com o texto solto por cima.
- **Balões:** só com o fundo do SVG, sem borda. Com `deco: outline`, o Whimsical calcula o fundo a partir da borda e fica um pêssego barrento, com borda grossa. Uma forma aceita uma cor só.
- **Setas:** um conector precisa de dois objetos, então cada ponta ganha uma âncora de 2 px. Para mover uma seta, o usuário arrasta as âncoras.
- **Texto que começa com `- `, `1. ` ou `#`** viraria lista ou título; o conversor põe um espaço de largura zero na frente.
- **Texto que passa da borda do fundo** sai do grupo e some dos recortes; a largura é limitada à borda.

**O que não tem equivalente:** a ponta do balão, a linha pontilhada (a espera vira barra clara) e o texto girado. O rótulo vertical de um período vira horizontal ao lado da barra e pode ficar atrás de um balão; confira e mova à mão.

**Conferir:**
- Use `fetch` do remoto com `image: true` e `crop_ids` = IDs das **faixas**: vem cada faixa com os filhos e as setas, no tema claro.
- `viewport` renderiza inteiro todo objeto que toca a janela, e as linhas de vida tornam a imagem enorme.
- O `board_snapshot` do desktop usa o tema do app (no escuro, as cores aparecem invertidas).
- Liste os objetos com `fetch` (`detail: "detailed"`, `expand_groups: true`, `limit: 200`, paginando por `cursor`).

**Refazer:** apague todos os objetos do diagrama (`delete` por id, até 400 por chamada; preserve anexos e o que o usuário criou) e envie os lotes de novo. Corrigir a ordem das camadas depois exige recriar tudo.

## Gerador à mão (blueprint por raias ou layouts diferentes)

Escreva o gerador inteiro numa execução só. Escape texto com `xml.sax.saxutils.escape`; não use barra invertida dentro de expressões de f-string (Python < 3.12). Largura estimada: `len(s) * tamanho * (0.55 + 0.2 * proporção_de_maiúsculas)`, monoespaçada `0.6 * tamanho` por caractere. Reaproveite `tw`, `wrap` e `png` do `timeline.py` (`sys.path.insert(0, "<pasta-da-skill>/scripts"); from timeline import tw, wrap, png`).
