# Recuperar o acesso administrativo da conta principal

## Diagnóstico confirmado

- A conta `johnsantana.deac@gmail.com` continua existindo em `auth.users` e autenticou recentemente.
- O UUID de autenticação é o mesmo usado por `public.profiles.id` e `public.user_roles.user_id`; as duas foreign keys estão íntegras.
- O perfil está ativo e a linha em `public.user_roles` continua com `role = 'admin'`. A role não foi removida nem alterada.
- A role é armazenada exclusivamente em `public.user_roles.role` (enum `app_role`), não em `profiles`.
- A regressão foi introduzida pela migration de segurança de 25/08/2026: ela manteve `public.has_role(auth.uid(), 'admin')` nas policies de `profiles` e `user_roles`, mas revogou de `authenticated` o direito de executar `public.has_role(uuid, app_role)`.
- O papel `authenticated` ainda possui `SELECT` nas duas tabelas, e o RLS está habilitado. O bloqueio ocorre durante a avaliação da policy, quando o banco tenta chamar uma função que o usuário autenticado já não pode executar.
- `public.has_role` é a função central de autorização no backend. Ela também é usada pelas demais policies e RPCs administrativas.
- No frontend, `src/hooks/useAccess.ts` e `src/lib/guards.ts` leem `user_roles` diretamente. Como ambos descartam os erros retornados por essas consultas, uma falha de autorização vira uma lista vazia de roles. Assim, a conta passa a ser tratada como usuário comum e `requireAdmin()` redireciona `/admin` para `/vincular`.

## Causa exata

```text
Conta autenticada correta
        ↓
SELECT da própria role em user_roles
        ↓
RLS avalia: user_id = auth.uid() OR has_role(auth.uid(), 'admin')
        ↓
has_role não é executável por authenticated
        ↓
consulta falha; frontend converte o erro em roles = []
        ↓
/admin não reconhece o administrador
```

A policy ficou internamente inconsistente após o endurecimento de segurança: ela depende de uma função cuja execução foi retirada do mesmo papel ao qual a policy se aplica.

## Correção proposta

1. Criar uma migration mínima que restaure `EXECUTE` de `public.has_role(uuid, app_role)` somente para `authenticated` e `service_role`, mantendo a revogação para `PUBLIC` e `anon`.
2. Manter `SECURITY DEFINER`, `STABLE` e `search_path = public`, necessários para a função consultar `user_roles` sem recursão de RLS.
3. Não alterar a conta, o UUID, a senha, a linha de perfil ou a linha `admin`; não criar outro administrador e não desabilitar RLS.
4. Corrigir `src/hooks/useAccess.ts` e `src/lib/guards.ts` para não transformar erros de leitura de autorização em “sem role”: validar os erros das consultas e falhar de forma explícita/segura. Isso evita que futuras regressões de policy sejam mascaradas como perda de perfil.
5. Revisar os pontos que chamam `has_role` para confirmar que a função só responde verificações de role e não expõe linhas de `user_roles` ou dados de outros usuários.

## Arquivos e objetos envolvidos

- Nova migration em `supabase/migrations/`: ajuste restrito dos privilégios de `public.has_role`.
- `src/hooks/useAccess.ts`: tratamento explícito dos erros nas consultas de acesso.
- `src/lib/guards.ts`: tratamento explícito dos erros antes de decidir o redirecionamento.
- Tabela afetada pela leitura: `public.user_roles`, campo `role`.
- Tabela de vínculo de identidade: `public.profiles`, campo `id` ligado a `auth.users.id`.
- Policies envolvidas: `roles own read`, `roles admin manage`, `profiles own read`, `profiles admin update` e demais policies que chamam `public.has_role`.
- Função responsável: `public.has_role(uuid, app_role)`.

## Como a segurança será mantida

- `anon` e `PUBLIC` continuarão sem permissão de execução.
- Apenas sessões autenticadas poderão chamar o verificador, e o RLS continuará ativo em todas as tabelas.
- A função retorna somente um booleano e não concede nem altera roles.
- As operações administrativas continuarão validando `auth.uid()` e a role `admin` no backend.
- Nenhuma policy será tornada permissiva para todos e nenhum dado de perfil/role voltará a ter leitura global por usuários comuns.

## Validação após aprovação

1. Antes e depois da migration, executar a leitura real usada pela aplicação com a sessão da conta alvo e registrar o comportamento.
2. Confirmar que a sessão da conta alvo lê sua única role `admin` e que `has_role(auth.uid(), 'admin')` retorna `true`.
3. Abrir `/admin` com essa conta e verificar que o guard permite acesso, o cabeçalho mostra o painel administrativo e os dados administrativos carregam.
4. Validar uma operação administrativa somente de leitura para confirmar o backend, sem modificar dados esportivos.
5. Testar uma conta autenticada sem role: ela deve continuar sem acesso a `/admin` e sem conseguir ler roles/perfis de terceiros.
6. Testar acesso anônimo: não deve executar `has_role`, ler `user_roles` nem acessar `/admin`.
7. Rodar o scanner de segurança e verificar especificamente privilégios, RLS e exposição da função, sem corrigir achados não relacionados.
