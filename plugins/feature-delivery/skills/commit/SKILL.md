---
name: commit
description: Cria commits seguindo o padrão Conventional Commits em português. Divide mudanças em commits pequenos e atômicos. Use quando quiser fazer commit das alterações.
---

# Commit - Conventional Commits

Skill para criar commits seguindo o padrão [Conventional Commits](https://www.conventionalcommits.org/).

**IMPORTANTE:**
- Todas as mensagens de commit devem ser escritas em **português**
- **Dividir em commits pequenos e atômicos** - cada commit deve representar uma única mudança lógica
- **Sempre listar os commits planejados e aguardar aprovação antes de executar**
- **Não adicionar Co-Authored-Bys**

## Formato

```
<tipo>(<escopo>): <descrição>
```

## Tipos

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração |
| `docs` | Documentação |
| `chore` | Manutenção |
| `test` | Testes |
| `build` | Dependências/build |

## Workflow

### 1. Analisar mudanças
```bash
git status
git diff --stat
```

### 2. Identificar grupos lógicos de mudanças

### 3. LISTAR COMMITS PLANEJADOS (OBRIGATÓRIO)

Antes de executar qualquer commit, apresentar a lista completa no formato:

```
## Commits planejados:

1. `build(deps): adicionar bcryptjs e jsonwebtoken`
   - package.json
   - pnpm-lock.yaml

2. `feat(db): adicionar modelos User e RefreshToken`
   - prisma/schema.prisma

3. `feat(domain): adicionar entidades de autenticação`
   - src/domain/entities/user.entity.ts
   - src/domain/entities/refresh-token.entity.ts
   - src/domain/ports/user.repository.port.ts

... (continua)

Deseja prosseguir com estes commits?
```

### 4. Aguardar aprovação do usuário

### 5. Executar commits na ordem listada

## Regras

- Mensagem em português, modo imperativo
- Máximo 72 caracteres no título
- Sem ponto final
- NUNCA usar `git add -A` ou `git add .`
- Um commit por mudança lógica
- **NUNCA executar commits sem listar e receber aprovação primeiro**

## Segurança

Nunca commitar:
- `.env`, `.env.*`
- `settings.local.json`
- Arquivos com credenciais/tokens
- `PLAN.md` ou documentos de planejamento interno
