---
name: safe-handoff-execution
description: Executa handoffs cross-repo e features de forma rápida, com escopo rígido, workers limitados e proteção contra sobrescrita acidental.
---

# Execução segura de handoffs

Use esta skill ao implementar um handoff de outra aplicação, especialmente quando o contrato já está publicado.

## Rota padrão

1. Classifique como `fast-contract` quando:
   - o contrato consumido está publicado e verificável;
   - a mudança fica em uma feature consumidora e seus adapters/testes;
   - não altera persistência, autenticação, migração, shell/workspace ou design system.
2. Registre um snapshot curto:
   - fonte e data do contrato;
   - request, response, erros e exemplo representativo;
   - caminhos permitidos para escrita;
   - teste focado e build final.
3. Extraia 3–5 invariantes de release e associe cada uma a um teste.
4. Faça `git status --short` antes de editar. Nunca atribua alterações preexistentes à feature.

## Delegação

- Trabalhe inline por padrão.
- Use no máximo um Worker para uma fatia vertical realmente independente.
- Não crie Scout, Planner, wave ou Reviewer extra em plano sequencial.
- O Worker edita apenas os caminhos autorizados e não executa suíte ampla.
- Aguarde uma única janela de até 120 segundos. Se não entregar, envie encerramento e assuma inline.
- Worker parcial não é conclusão. Verifique o diff, corrija ou substitua inline.
- Validator roda uma vez depois do diff congelado. Revalide somente após uma refutação P0/P1 concreta.

## Edição segura

- Arquivo existente: use `edit` ou editor estrutural Serena.
- `write` é para arquivo novo, archive/SQLite explícitos ou recurso interno. Não use `write` para editar arquivo existente.
- Depois de cada edição estrutural, releia o trecho ou use o snapshot retornado pela ferramenta.
- Não use conteúdo vazio para editar arquivo existente. Para deletar, use `rm`/delete explícito e confirmado.
- Não toque arquivos gerados, docs ou módulos adjacentes por conveniência.

## Verificação

- Reproduza o comportamento antigo ou execute a baseline relevante antes da primeira edição quando domínio, persistência, contrato ou testes mudarem.
- Rode o teste focado após implementar.
- Rode uma única suíte relevante e um único build final no diff congelado.
- Mudança de comportamento ou testes exige auditoria `test-guide`:
  - `keep`: protege um bug real;
  - `improve`: intenção válida, cobertura fraca;
  - `remove`: estado inalcançável ou teste placebo;
  - `missing`: invariantes sem teste.
- Faça smoke test na superfície real quando houver UI.
- Antes de afirmar conclusão, confirme status, diff, caminhos permitidos e saída fresca dos comandos.

## Controle de escopo

- Um handoff cross-repo é fonte de contrato, não autorização para alterar o repositório de origem.
- Não crie brief/ADR/plano quando o preset `fast-contract` e as regras do repositório não exigirem artefatos.
- Não expanda para histórico, shell, docs ou refactors não citados no rollout.
- Registre bloqueios exatos. Não chame falha de ambiente de falha do código sem evidência comparável.

## Melhorias do OMP

- Use uma extensão global para guardrails que o harness já expõe, como bloquear escrita vazia em arquivo existente via `tool_call`.
- Extensões descobertas em `~/.omp/agent/extensions` carregam em novas sessões.
- Não altere o binário global nem o pacote instalado sem o repositório de origem e o pipeline de build.
- Se o binário não puder ser reconstruído, entregue a extensão verificável e reporte que ajustes internos de timeout/delegação estão bloqueados.
