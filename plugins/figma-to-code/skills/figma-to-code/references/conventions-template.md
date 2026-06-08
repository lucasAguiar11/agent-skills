# Contrato do adaptador — `.agents/figma-to-code/conventions.md`

Arquivo de convenções que cada repo define para parametrizar a skill. Todas as seções abaixo são obrigatórias, salvo indicação. Na ausência do arquivo, detectar a stack (build files: `package.json`, `gradlew`, `pubspec.yaml`, `Cargo.toml`, `*.xcodeproj`…; tema/design system: arquivos de tokens, theme, tailwind config…), preencher o template e **propor ao usuário salvá-lo** antes de seguir.

## Template

```markdown
# figma-to-code — convenções do projeto

## Stack
- UI: <ex.: Compose Multiplatform | React + Tailwind | Flutter | SwiftUI>
- Resolução/viewport alvo: <ex.: desktop fixo 1440×900 | responsivo mobile-first>
- Prefixo de comando shell: <ex.: rtk | nenhum>

## Especificação
- Local das specs: <ex.: docs/design/<feature>.md>
- Exemplo a seguir: <caminho de uma spec existente, se houver>
- Diretório de assets: <ex.: docs/design/assets/<feature>/>
- Índice de features a atualizar (opcional): <ex.: docs/features.md>

## Design system
- Fonte de tokens no código: <ex.: src/theme/HalleyTheme.kt | tailwind.config.ts>
- Doc do design system (opcional): <ex.: docs/design/design-system.md>
- Componentes reutilizáveis: <diretórios, ex.: src/components/ui/>
- Regra para tokens/componentes novos: <ex.: propor na spec e aguardar aprovação>

## Estrutura de código
- Onde vive uma feature nova: <ex.: shared/src/commonMain/kotlin/.../<feature>/>
- Padrão de arquivos: <ex.: Models/StateHolder/Screen/Flow | page.tsx + components/ + hooks/>
- Restrições: <ex.: sem dependência JVM em commonMain | server components por padrão>

## Comandos
- Verificação rápida (compile/typecheck): <ex.: ./gradlew :app:compileKotlin | pnpm typecheck>
- Testes: <ex.: ./gradlew :shared:jvmTest | pnpm test>
- Rodar app com reload: <comando + como detectar instância já em execução>

## Captura de tela do app (Fase 5)
- Método: <ex.: orca computer (CLI) | playwright screenshot | pedir manual ao usuário>
- Como forçar estado de tela (opcional): <ex.: override TEMP-VERIFY no call site + hot reload | flag de debug | rota direta — preferir isso a navegar por cliques>
- Observações: <ex.: normalizar escala antes do diff; app roda @1x, render Figma @1.5x; cliques sintéticos confiáveis ou não neste runtime>
```

## Regras de resolução

1. Arquivo existe → usar como está; não "melhorar" sem pedido.
2. Arquivo não existe → procurar também o fallback `.claude/figma-to-code/conventions.md`; se nenhum existir, detectar, preencher, mostrar a proposta, **aguardar aprovação**, salvar em `.agents/figma-to-code/conventions.md` e seguir.
3. Campo faltando no arquivo existente → perguntar só o campo faltante; oferecer persistir a resposta no arquivo.
