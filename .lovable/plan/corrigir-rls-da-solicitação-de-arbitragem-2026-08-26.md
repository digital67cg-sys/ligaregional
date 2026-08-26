# Corrigir RLS da solicitação de arbitragem

## Diagnóstico confirmado antes da execução

### 1. Policy que bloqueia o INSERT

A única policy de escrita atual é:

- `refassign admin write` — `FOR ALL TO authenticated`
- `USING`: `has_role(auth.uid(), 'admin')`
- `WITH CHECK`: `has_role(auth.uid(), 'admin')`

Ela aceita administradores, mas rejeita todo gestor de clube. Por isso o INSERT real do botão chega ao banco e falha com `new row violates row-level security policy`.

Também existe `refassign public read`, com `SELECT USING (true)`. Ela não causa o erro de INSERT, mas expõe as solicitações para leitura pública e não representa a regra solicitada.

### 2. Colunas reais utilizadas

- `referee_assignments.match_id` identifica a partida e referencia `matches.id`.
- `referee_assignments.requested_by` identifica o usuário solicitante e referencia `auth.users.id`.
- A tabela não possui coluna de clube solicitante; o clube autorizado deve ser derivado da partida e do vínculo do usuário.
- `matches.home_team_id` identifica o clube mandante e referencia `teams.id`.
- O INSERT atual envia exatamente `match_id`, `fee = 0` e `requested_by = access.userId`; os demais campos usam defaults seguros.

### 3. Relacionamento entre gestor e clube

```text
auth.users.id
  → user_roles.user_id, role = 'club_manager'
  → team_managers.user_id
  → team_managers.team_id
  = matches.home_team_id
  → referee_assignments.match_id = matches.id
```

A conta gestora existente está vinculada ao clube Gladiadores. Existem partidas em que Gladiadores é mandante e partidas em que é visitante, permitindo testar as duas fronteiras com a mesma sessão real.

### 4. Alteração que será feita

Criar uma migration restrita a `referee_assignments` e a um verificador booleano dedicado:

1. Criar `public.can_request_referee(_user_id uuid, _match_id uuid) returns boolean`, `STABLE SECURITY DEFINER`, com `search_path = public` explícito.
2. A função retornará somente `true/false` e exigirá simultaneamente:
   - `_user_id = auth.uid()`;
   - role `club_manager` em `user_roles`;
   - vínculo em `team_managers`;
   - `team_managers.team_id = matches.home_team_id`;
   - `matches.id = _match_id`.
3. Revogar `EXECUTE` de `PUBLIC` e `anon`; conceder somente a `authenticated` e `service_role`, porque a policy RLS precisa invocá-la.
4. Manter `refassign admin write` inalterada para o ADMIN continuar criando/editando qualquer solicitação.
5. Adicionar uma policy `FOR INSERT TO authenticated` para gestor, com `WITH CHECK` exigindo:
   - `requested_by = auth.uid()`; e
   - `can_request_referee(auth.uid(), match_id)`.
   Assim, o cliente não consegue escolher outro usuário ou clube.
6. Substituir a leitura pública por policies restritas:
   - ADMIN lê todas;
   - gestor lê apenas solicitações das partidas em que seu clube é mandante.
   Isso é necessário para confirmar e acompanhar a solicitação após recarregar, sem tornar a tabela pública.
7. Não conceder UPDATE ao gestor, pois o fluxo solicitado apenas cria e acompanha; o ADMIN mantém UPDATE pela policy existente.
8. Não alterar o frontend: o payload atual já fornece o `match_id` e o `requested_by` corretos, e a autorização ficará no banco.

## Escopo preservado

- RLS continuará habilitado.
- Nenhuma role, conta, senha, UUID ou perfil será alterado.
- Nenhuma tabela, partida, equipe, atleta ou módulo esportivo será modificado.
- Nenhum INSERT genérico para `authenticated` será criado.
- Nenhuma nova tabela será criada.

## Testes obrigatórios

Usar o mesmo INSERT real da aplicação e sessões reais sempre que houver conta correspondente:

1. **Gestor mandante:** inserir solicitação em partida com Gladiadores como `home_team_id`; confirmar a linha persistida por ID e após nova leitura/recarregamento.
2. **Gestor de outro clube/visitante:** com a mesma conta gestora, tentar inserir em partida na qual Gladiadores não é mandante; exigir erro RLS e confirmar ausência da linha.
3. **Usuário sem função de gestor:** validar a função/policy com identidade autenticada sem vínculo de gestor e confirmar `false`/bloqueio. O banco atualmente possui apenas duas contas (um ADMIN e um gestor), portanto não será criada uma terceira conta só para o teste; a fronteira será verificada de forma transacional/isolada sem persistir usuário, role ou dado de Liga. Se a infraestrutura não permitir simular com segurança uma identidade autenticada inexistente, este item será reportado como não executável sem criar uma conta, e não será falsamente marcado como aprovado.
4. **ADMIN:** com a conta administradora existente, criar uma solicitação e editar um campo permitido; confirmar persistência. Remover apenas as linhas de teste ao final, sem tocar em solicitações preexistentes.
5. **Anônimo:** repetir o INSERT sem sessão; exigir bloqueio e confirmar ausência de linha.
6. Confirmar no catálogo que RLS permanece ativo, `anon`/`PUBLIC` não executam o helper, e as policies finais são exatamente as descritas.
