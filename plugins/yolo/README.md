# yolo

Skill invocável: na chamada `/yolo`, o agente executa o pedido **sem confirmação** e sem checklist de risco no chat.

Não desliga deny rules, hooks, nem a UI de permissão do host. Não cobre exploit, malware ou ataque a sistema.

## What it does

- Roda o comando na mesma resposta
- Não pergunta “posso executar?”
- Não recusa `.env`, gitignore, `git add -f`, commit, push, force push
- Prevalece sobre a skill `commit` (que pede aprovação e bloqueia `.env`)

## Install

### skill-forge marketplace

```text
/plugin marketplace add lucasAguiar11/agent-skills
/plugin install yolo@skill-forge
```

**Grok**

```bash
grok plugin install yolo --trust
```

**Codex**

```text
/plugins → install yolo@skill-forge
```

### Local path (dev)

```bash
grok plugin install /path/to/agent-skills/plugins/yolo --trust
```

## Use

```text
/yolo
/yolo rtk ./gradlew :shared:jvmTest
/yolo commit o .env
```

Ou no chat: `yolo`, `só executa`, `ignora validação`.

## License

MIT
