# Feature Delivery — Fluxo de Entrega com Time de Agentes

## O que é

Um pipeline de entrega de features onde uma equipe de agentes de IA trabalha como um time de desenvolvimento real — planejamento, execução paralela, QA independente e review — orquestrada por um coordenador e supervisionada por você.

O princípio central: **cada papel é um estágio com contrato de entrada/saída, não uma persona**. Nenhum agente "finge ser gerente" — cada um recebe uma tarefa escopada, contexto mínimo e um critério de aceite verificável.

## O time

| Papel | Quem é | Responsabilidade |
|---|---|---|
| **PM / Gerente** | Você | Define o quê, decide bloqueios, acompanha pelo board |
| **Coordenador** | Agente principal da sessão | Orquestra waves, coleta entregas, nunca implementa fatias |
| **Techlead** | Planner (agente) | Quebra a feature em tarefas com escopo, verificação e ownership |
| **Devs** | Workers (agentes em paralelo) | Implementam uma fatia cada, dentro do escopo de escrita permitido |
| **QA** | Validators (agentes adversariais) | Tentam **refutar** cada entrega — re-executam tudo, não confiam em ninguém |
| **CI** | Verifier | Roda a suíte completa de verificação da wave |
| **Code review** | Sequência pós-execução | `simplify`, `pr-review`, `test-guide`, verificação final |

## Fluxo fim a fim

```
 pedido ("implementa X")
        │
        ▼
 1. TRIAGE ────────── classifica o pedido, escolhe artefatos mínimos
        │
        ▼
 2. BRIEF ─────────── docs/features/<ID>.md + linha no índice
        │
        ▼
 3. ADR (se preciso) ─ só para decisão estrutural/difícil de reverter;
        │              correlaciona com ADRs anteriores, não re-decide
        ▼
 4. PLANO ─────────── docs/plans/<ID>-plan.md: tarefas, ownership,
        │              waves, launch spec, verificação por tarefa
        ▼
 5. DECISION GATE ─── decisão blocking? → PARA e pergunta ao PM
        │              senão → auto-aprova (aprovação única)
        ▼
 6. EXECUTE ───────── loop por wave (detalhado abaixo)
        │
        ▼
 7. PÓS-EXECUÇÃO ──── simplify → checkpoint → test-guide →
        │              verification-before-completion
        ▼
 8. DONE ──────────── status sincronizado: índice + brief + plano
```

## O loop de execução (o coração)

```
╔══════════════ PARA CADA WAVE ══════════════╗
║                                            ║
║  DEVs lançados em paralelo                 ║
║  (escopos de escrita disjuntos)            ║
║              │                             ║
║              ▼                             ║
║  Coordenador coleta os handoffs            ║
║  + audita mudanças em testes               ║
║              │                             ║
║              ▼                             ║
║  QA: 1 validator por entrega               ║
║  · postura padrão = REFUTADO               ║
║  · re-executa a verificação ele mesmo      ║
║  · diff × escopo permitido                 ║
║  · caça teste enfraquecido/omitido         ║
║       │              │                     ║
║   validated       refuted                  ║
║       │              │                     ║
║       │              ▼                     ║
║       │      retry do Dev com os           ║
║       │      findings (1x) → re-valida     ║
║       │      refutou de novo? → PARA       ║
║       ▼                                    ║
║  CI: verificação da wave (suíte completa)  ║
║              │                             ║
║              ▼                             ║
║  Team Board impresso + log no plano        ║
║                                            ║
╚════════════════════════════════════════════╝
```

**Por que o QA importa:** antes, a wave avançava com a palavra do próprio Dev ("completed"). No teste de validação do pipeline, um Dev foi instruído a entregar um bug escondido atrás de um teste verde (comportamento quebrado sem assert que o cobrisse) e alegar 100%. O validator pegou: rodou probe direto no código, apontou a linha do bug, acusou que exatamente o comportamento quebrado era o único sem teste — e classificou a evidência do Dev como "placebo". Após o retry com os findings, a re-validação independente confirmou a correção.

## Visibilidade: o Team Board

A cada evento (início de wave, veredito de QA, fechamento, bloqueio) o coordenador imprime:

**FEAT-20260720-checkout** — Wave 2/3 `▓▓▓▓▓▓░░░ 67%`

| WS | Papel | Tarefa | Progresso | Status |
|---|---|---|---|---|
| A | DEV | API de pagamento | `██████████` 5/5 | validated |
| B | DEV | webhook handler | `████████░░` 4/5 | validating |
| — | QA | refutar Task 2 | — | running tests |

Waves: `[x]──[>]──[ ]` · Bloqueios: 0 · Gate: validação da Task 2
Tokens: 108k wave · 216k feature

- **Progresso é dado real** — checkboxes das tarefas reportados nos handoffs, nunca estimativa.
- **Tokens sempre visíveis** — soma real do custo de cada agente, por wave e acumulado.
- Cada board é copiado para o `Wave Execution Log` do plano — o arquivo guarda a linha do tempo.
- Na árvore do terminal, cada agente aparece nomeado: `DEV A · slugify · wave 1`, `QA B · word_count · wave 1 · retry 1`.

## Aprovação única

| Você diz | O que acontece |
|---|---|
| "Implementa X" | Planeja → auto-revisa → executa, tudo num fluxo. Sem re-perguntar. |
| "Planeja X" | Para depois do plano revisado e espera seu ok. |

O fluxo **só interrompe** você em 3 situações:

1. **Decisão blocking** — persistência, contratos públicos, migração, auth, ownership;
2. **Plano que não fecha limpo** no self-check de validação;
3. **QA refutou o mesmo workstream duas vezes** (retry esgotado).

## Economia de tokens

Cada subagente custa ~30k+ tokens só de spin-up. As alavancas são menos lançamentos e prompts menores — nunca checagem mais fraca:

- Prompt do agente = só o bloco da tarefa + linha do launch spec. Nunca o plano inteiro.
- Documentos grandes são lidos por agentes Reader que devolvem digest compacto.
- QA em modelo rápido quando o check é mecânico; padrão quando julga cobertura/semântica.
- Trabalho pequeno fica inline com o coordenador — sem par Dev+QA para meia dúzia de edits.
- Um validator por entrega, nunca por step; `validated` é final, sem re-validar por segurança.
- Sem Dev não há QA: o que o coordenador fez inline é coberto pela verificação de wave.

## Garantias do desenho

1. **Ninguém se auto-avalia.** Quem implementa não valida; quem valida não confia em output colado — re-executa.
2. **Escopo de escrita é contrato.** Arquivo fora do escopo permitido = entrega refutada, sem discussão.
3. **Evidência ou não aconteceu.** Status `done` só com verificação re-executada e registrada.
4. **Paralelismo sem conflito.** Waves agrupam tarefas independentes; escopos disjuntos; merge em ordem de dependência.
5. **O humano decide o que é do humano.** Decisões estruturais param o fluxo; o resto flui.
