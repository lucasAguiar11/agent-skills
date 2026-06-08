# Preflight — checklist de ambiente e convenções (Fase 0)

Rodar TODOS os checks antes de qualquer extração. Reportar a tabela de resultados ao usuário.

## Checks


| #   | Check                         | Como verificar                                                                                                          | Se falhar                                                                                                                                                                                                               |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Convenções do projeto         | `[ -f .agents/figma-to-code/conventions.md ]` (fallback: `.claude/figma-to-code/conventions.md`) → ler e validar campos | **Bloqueante até resolver** — detectar stack, propor convenções via `conventions-template.md`, aguardar aprovação e salvar                                                                                              |
| 2   | MCP do Figma ativo            | `ToolSearch "+figma get_design_context"` → carregar e fazer chamada de teste (`get_metadata` sem nodeId)                | **Bloqueante** — servidor local: verificar app Figma desktop aberto (`pgrep -x Figma`) e MCP habilitado nas preferências; servidor remoto oficial: verificar auth. Sem nenhum MCP do Figma, parar e orientar instalação |
| 3   | Arquivo certo aberto no Figma | `get_metadata` sem `nodeId` retorna o arquivo/seleção atual (apenas MCP desktop)                                        | Pedir ao usuário para abrir o arquivo/frame alvo no Figma desktop                                                                                                                                                       |
| 4   | Build tool do projeto         | comando de verificação rápida das convenções existe e roda                                                              | **Bloqueante** — revisar convenções ou ambiente                                                                                                                                                                         |
| 5   | Tool de diff visual           | `ToolSearch` por tool de comparação de screenshots (ex.: `ui_diff_check`)                                               | Não bloqueante — Fase 5 degrada para comparação visual em contexto                                                                                                                                                      |
| 6   | Captura de tela do app        | testar o método das convenções (ex.: `orca computer capabilities --json`, playwright instalado)                         | Não bloqueante — Fase 6 degrada: pedir screenshot manual ao usuário                                                                                                                                                     |
| 7   | Token Figma REST (export PNG) | `[ -n "$FIGMA_API_TOKEN" ]` (nunca imprimir o valor)                                                                    | Não bloqueante — spec fica sem PNGs em disco; anotar na spec                                                                                                                                                            |
| 8   | Instância do app já rodando   | comando de detecção das convenções                                                                                      | Informativo — reutilizar instância; nunca subir duplicada                                                                                                                                                               |


**Gate:** checks 1–4 verdes. 5–7 podem estar degradados — registrar no relatório final quais caminhos degradados foram usados.

## Notas

- Respeitar o prefixo de comando das convenções (ex.: `rtk`) em todos os checks de shell.
- O nome do servidor MCP do Figma varia por máquina (`figma-local`, `claude.ai Figma`, `framelink`…). Descobrir via `ToolSearch`, preferir servidor local/desktop, registrar qual foi usado na proveniência.

