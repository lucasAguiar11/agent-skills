# Loop de verificação visual (Fase 5)

Critério de saída: sem diferença estrutural ou de token perceptível contra o render do Figma (layout, espaçamento, cor, tipografia, estados). Máximo **4 iterações por tela/estado**; se não convergir, reportar as diferenças residuais e parar.

Comandos de execução e método de screenshot vêm das convenções do projeto.

## Estratégia de captura — escada (tentar nesta ordem)

A parte cara do loop não é capturar a tela — é **navegar até o estado**. Não gaste iterações dirigindo o app por cliques sintéticos.

1. **Estado forçado + hot reload (padrão).** Forçar o estado alvo direto no código, no call site do componente (ex.: `state.x ?: EstadoAlvo`), com comentário `TEMP-VERIFY` na linha. Congelar animações/timers no modo forçado (ex.: `autoDismiss = false`, progresso estático) para a captura ser determinística. Hot reload aplica, screenshot, troca a constante para o próximo estado, repete. **Reverter tudo ao fim e provar**: `grep -c "TEMP-VERIFY"` → 0 entra na verificação final.
2. **Navegação automatizada com orçamento duro.** Se o estado depender de algo que o override não cobre, tentar dirigir o app (computer-use ou equivalente) com **máximo 2 tentativas por passo de navegação**. Falhou duas vezes → descer para o degrau 3 imediatamente. Nunca repetir o mesmo clique esperando resultado diferente.
3. **Usuário navega.** Pedir em uma linha ("abre a tela X e dispara Y?") e capturar com a tela pronta. Custa segundos e destrava o loop — usar sem cerimônia.

## Por iteração

1. **App rodando com reload** — comando de detecção de instância das convenções; reutilizar se existir; nunca duas simultâneas.
2. **Chegar ao estado alvo** pela escada acima.
3. **Capturar** pelo método das convenções (a captura de janela costuma ser confiável mesmo quando cliques sintéticos não são). Salvar como `/tmp/<feature>-iter<N>.png`; recortar a região do componente em resolução real para o diff fino.
4. **Comparar com a referência do Figma:** tool de diff visual quando houver PNG em disco; senão `Read` no screenshot + `get_screenshot` do Figma em contexto.
5. **Listar diferenças em ordem de impacto:** estrutura > espaçamento > cor/borda > tipografia > micro-detalhes. Não contam: antialiasing, rendering de fonte, cursor, escala (normalizar antes; renders do Figma costumam estar @1.5x/@2x), posição de preenchimentos animados (countdown/progresso — comparar só altura/trilha/cor).
6. **Corrigir, recompilar, repetir.**

## Caveats de hot reload e runtime (aprendidos em execução)

- **Valores de enum / `static final` não aplicam via hot reload** (redefinição de classe não re-roda initializers). Mudou texto/constante de enum → 1 restart do app. Mudanças em corpo de composable aplicam normalmente.
- **Cliques sintéticos podem ser ignorados** por runtimes JVM/JBR (Compose Desktop): a janela ativa e o screenshot funcionam, o clique não. Fallbacks: clique por acessibilidade do SO (ex.: `osascript -e 'tell application "System Events" to click at {x, y}'` em coordenadas globais) ou degrau 3 da escada.
- **Texto pode quebrar diferente do mock** (métricas de fonte da plataforma ≠ Figma). Se o mock exporta quebra explícita (múltiplos `<p>`), replicar com quebra explícita e registrar na spec.

## Cobertura

Repetir o loop para **cada estado** do escopo. Um estado convergido não garante os demais.

## Degradações permitidas (registrar no relatório final)

- Sem tool de diff visual → comparação em contexto.
- Sem captura automatizada → screenshot manual do usuário.
- Sem render em disco do Figma → `get_screenshot` em contexto como referência.
- Navegação manual do usuário (degrau 3) → registrar que a navegação não foi automatizada.
