# Checklist de Segurança

Detalhamento do eixo 4 do `SKILL.md`. Use durante a etapa 3.6, nos arquivos do diff.

Escopo: o que procurar em uma revisão de código. Não é auditoria de infra nem pentest.

## Como usar

1. Marque quais categorias abaixo o diff **toca**. Ignore o resto — não varra o checklist inteiro em um PR de typo.
2. Para cada categoria tocada, rode as perguntas.
3. Todo finding de segurança precisa de **cenário de exploração** (quem manda o quê, e o que consegue). Sem cenário, rebaixe para `[Melhoria]` com a pergunta explícita.

## 1. Fronteiras de Confiança

O primeiro passo é saber de onde o dado veio. Trate como **não confiável**:

- body, query string, params de rota, headers, cookies
- upload de arquivo (nome, conteúdo, MIME declarado)
- resposta de API de terceiro
- mensagem de fila / evento de webhook
- conteúdo de banco que originalmente veio de usuário
- variável de ambiente e arquivo de config em ambiente multi-tenant
- saída de LLM, quando ela vira comando, query, path ou HTML

Perguntas:

- [ ] O dado é validado **na fronteira** (schema: zod, class-validator, joi), antes de virar lógica?
- [ ] A validação rejeita o que não conhece, ou só checa o que espera? (Prefira allowlist a denylist.)
- [ ] Campos numéricos têm faixa? Strings têm tamanho máximo?
- [ ] O tipo validado é o que a camada de baixo realmente recebe, ou existe cast em algum ponto que desfaz a garantia?

## 2. Injeção

### SQL / ORM

- [ ] Query parametrizada (`?`, `$1`, binding do ORM) — **nunca** concatenação nem template string com input.
- [ ] `$queryRaw` / `query()` / `knex.raw()` no diff: o input entra como parâmetro, não interpolado?
- [ ] Nome de coluna/tabela vindo de input (usado em `ORDER BY`, `WHERE` dinâmico) é validado contra allowlist? Parametrização **não** protege identificador.

### NoSQL

- [ ] Objeto do body vai direto para o filtro do Mongo? (`{ user: req.body.user }` aceita `{ $ne: null }` e vira bypass.) Force tipo primitivo antes.

### Comando de sistema

- [ ] `exec`/`spawn`/`system` com string montada a partir de input → use a forma com array de argumentos, sem shell.
- [ ] Se shell é inevitável, o input passa por allowlist estrita (não por escape manual).

### Path traversal

- [ ] Caminho de arquivo montado com input é normalizado e **verificado** como dentro do diretório base depois de resolver (`..%2f` também precisa cair).
- [ ] Nome de arquivo de upload nunca é usado cru no filesystem.

### Template / renderização de servidor

- [ ] Input não entra em template compilado em runtime.

## 3. AuthN / AuthZ

- [ ] Toda rota nova tem decisão explícita de autenticação — inclusive as que "não são sensíveis".
- [ ] A autorização é checada **por recurso**, não só por rota. `GET /orders/:id` autenticado ainda precisa confirmar que a order é do usuário (IDOR — acesso a objeto de outro por trocar o ID).
- [ ] Checagem de papel/permissão fica no servidor. Esconder botão no front não é controle.
- [ ] Endpoint de update aceita só os campos que o usuário pode mudar? (Mass assignment: `Object.assign(user, req.body)` deixa o cliente setar `role: "admin"`.)
- [ ] Fluxo novo não pula um middleware de auth existente (rota registrada fora do módulo protegido, ordem de middleware, rota curinga antes da específica).
- [ ] Em multi-tenant: toda query filtra por tenant/org? A ausência do filtro vaza dado entre clientes.

## 4. Segredos

- [ ] Nenhuma chave, token, senha ou connection string literal no código, no teste ou no fixture.
- [ ] Segredo não vai para log, mensagem de erro, resposta de API nem telemetria.
- [ ] Se um segredo foi commitado em qualquer momento do histórico do PR, ele está **queimado** — rotacionar é parte do fix, remover o commit não basta.
- [ ] `.env` está no `.gitignore`; `.env.example` tem só placeholder.
- [ ] Log estruturado tem redaction dos campos sensíveis (`authorization`, `password`, `token`, `cpf`, `card`).

## 5. Saída e XSS

- [ ] Conteúdo de usuário renderizado passa pelo escape do framework. `dangerouslySetInnerHTML`, `v-html`, `innerHTML` no diff exigem sanitização explícita (DOMPurify ou equivalente) e justificativa.
- [ ] URL vinda de input usada em `href`/`src` é validada de esquema (`javascript:` bloqueado).
- [ ] Resposta de API que devolve HTML/markdown de usuário declara content-type correto.
- [ ] Erro devolvido ao cliente não expõe stack trace, path do servidor, nome de tabela ou versão de lib.

## 6. Sessão e Token

- [ ] Cookie de sessão: `HttpOnly`, `Secure`, `SameSite` definidos.
- [ ] JWT: algoritmo fixado no servidor (rejeitar `none` e troca de alg), expiração curta, verificação de assinatura sempre feita antes de ler o payload.
- [ ] Token não vai na query string (vaza em log e referer).
- [ ] Logout/troca de senha invalida sessão existente.
- [ ] Senha usa hash lento com salt (bcrypt/argon2/scrypt), nunca MD5/SHA sozinho.

## 7. Upload de Arquivo

- [ ] Tamanho máximo aplicado no servidor.
- [ ] Tipo verificado por conteúdo, não pelo `Content-Type` declarado nem pela extensão.
- [ ] Arquivo salvo fora da raiz servida estaticamente, com nome gerado.
- [ ] Nenhuma execução/processamento do arquivo com privilégio.

## 8. Supply Chain

- [ ] `npm audit` (ou equivalente) rodado; findings **high/critical** em dependência que o código realmente exercita são `[Bug]`.
- [ ] Dependência nova: nome confere com o pacote oficial (typosquatting), tem histórico de manutenção, e não roda script de `postinstall` sem motivo claro.
- [ ] Diff do lockfile revisado — não só o `package.json`.
- [ ] Lockfile commitado e não editado à mão.

Triagem de `npm audit`: vulnerabilidade em dependência **transitiva de dev**, sem caminho de execução em produção, é `[Melhoria]` com issue — não bloqueia. Vulnerabilidade em pacote que atende requisição de usuário é `[Bug]`.

## 9. Configuração e Headers

- [ ] CORS não usa `*` junto com credenciais.
- [ ] Rate limit em endpoint de autenticação, reset de senha e envio de e-mail/SMS.
- [ ] Debug/verbose desligado em produção.
- [ ] Novo endpoint interno não ficou exposto publicamente por default.

## Como escrever o finding de segurança

```
[Bug] IDOR em GET /orders/:id

Arquivo: src/orders/orders.controller.ts (L34-41)

Cenário: usuário autenticado A chama GET /orders/91 (order do usuário B).
O handler busca por id e devolve, sem comparar com req.user.id.
Resultado: A lê endereço, valor e itens de qualquer pedido, iterando IDs.

Fix: filtrar por dono na query (findFirst({ where: { id, userId } })),
não checar depois — assim o 404 é o mesmo para "não existe" e "não é seu".
```

Sem esse bloco "cenário → resultado", não é `[Bug]`.

## Falsos positivos comuns

| Achado | Por que costuma não ser finding |
|---|---|
| "Falta validar aqui" | A validação pode estar no DTO/schema da camada acima. Confirme antes. |
| "SQL injection" em query com binding do ORM | O ORM parametriza. Só é finding em raw com interpolação. |
| "Segredo hardcoded" em fixture de teste | Valor fake em teste não é segredo. Confirme que não é credencial real. |
| "Falta rate limit" em endpoint interno atrás de gateway | O controle pode estar na borda. Pergunte em vez de afirmar. |
| "XSS" em string que nunca é renderizada como HTML | Siga o dado até a renderização antes de classificar. |
