# Diagnóstico e correção — Homologação de partidas bloqueada por `manages_team`

## 1. Causa exata do erro

O erro `permission denied for function manages_team` ocorre porque:

- A homologação no painel executa `UPDATE` na tabela `public.matches` (`src/components/admin/matches.tsx`, mutation `homologate`, linha 438: `db.from("matches").update(patch).eq("id", match.id)`).
- A tabela `matches` possui duas policies de escrita para `authenticated`:
  - `matches admin write` (`FOR ALL`, `USING/WITH CHECK has_role(auth.uid(),'admin')`);
  - `matches manager schedule` (`FOR UPDATE`, `USING/WITH CHECK manages_team(auth.uid(), home_team_id) OR manages_team(auth.uid(), away_team_id)`).
- No PostgreSQL, **todas** as policies permissivas aplicáveis são avaliadas com OR. Mesmo que o usuário seja ADMIN e satisfaça `matches admin write`, o banco ainda **avalia** a policy `matches manager schedule`, que invoca `public.manages_team`.
- A função `public.manages_team` teve `EXECUTE` revogado de `authenticated` na migration de segurança `20260825020226` (`REVOKE ALL ON FUNCTION public.manages_team(uuid, uuid) FROM PUBLIC, anon, authenticated;`).
- Resultado: ao avaliar a policy de gestor, o banco tenta executar `manages_team` como o usuário autenticado (o ADMIN), não tem privilégio `EXECUTE`, e a operação inteira falha com `permission denied for function manages_team` — mesmo o ADMIN tendo permissão pela policy de admin.

## 2. Definição atual de `manages_team`

```sql
CREATE OR REPLACE FUNCTION public.manages_team(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_managers
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;
```

- `SECURITY DEFINER`: **sim**.
- `search_path`: `public` (correto e seguro).
- `STABLE`: sim.
- Retorna apenas `boolean`; não expõe dados.

## 3. Quem pode executar a função atualmente

| Role | EXECUTE |
|---|---|
| `anon` | não |
| `authenticated` | **não** (revogado na migration de segurança) |
| `service_role` | sim |
| `postgres` (dono) | sim |

O erro foi causado exatamente pela revogação de `EXECUTE` para `authenticated` na última correção de segurança.

## 4. Qual parte da homologação chama a função

Nenhum código frontend chama `manages_team` diretamente. A chamada é indireta:

1. `src/components/admin/matches.tsx` → mutation `homologate` → `db.from("matches").update(patch)`.
2. O PostgREST aplica as policies RLS da tabela `matches`.
3. A policy `matches manager schedule` (UPDATE) invoca `public.manages_team(auth.uid(), home_team_id)`.
4. Como `authenticated` não tem `EXECUTE`, o banco rejeita a operação.

## 5. Por que um ADMIN está chegando nessa função

Porque o PostgreSQL avalia **todas** as policies permissivas de uma tabela para o comando, não apenas a primeira que corresponde. A policy `matches manager schedule` é `TO authenticated` — e o ADMIN é um usuário autenticado — então ela é avaliada mesmo quando a policy `matches admin write` já autorizaria a operação. A avaliação da policy de gestor dispara a chamada a `manages_team`, que falha por falta de `EXECUTE`.

O ADMIN **não deveria** precisar passar pela validação de gestor de clube. A função está sendo usada de forma desnecessária no fluxo de homologação administrativa.

## 6. Correção proposta

Duas mudanças complementares, ambas mínimas e sem alterar a lógica de segurança:

### 6a. Restringir a policy `matches manager schedule` para não ser avaliada por ADMINs

Alterar a policy para incluir uma guarda `NOT has_role(auth.uid(),'admin')`:

```sql
DROP POLICY IF EXISTS "matches manager schedule" ON public.matches;
CREATE POLICY "matches manager schedule" ON public.matches
FOR UPDATE TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'admin')
  AND (public.manages_team(auth.uid(), home_team_id) OR public.manages_team(auth.uid(), away_team_id))
)
WITH CHECK (
  NOT public.has_role(auth.uid(), 'admin')
  AND (public.manages_team(auth.uid(), home_team_id) OR public.manages_team(auth.uid(), away_team_id))
);
```

Isso garante que o fluxo de ADMIN **nunca** invoque `manages_team` durante operações em `matches`. A policy `matches admin write` continua autorizando o ADMIN independentemente do clube.

### 6b. Restaurar `EXECUTE` em `manages_team` para `authenticated`

```sql
GRANT EXECUTE ON FUNCTION public.manages_team(uuid, uuid) TO authenticated;
```

Isso é necessário porque a função é usada em policies de outras tabelas (`teams`, `players`, `player_registrations`, `transfers`, `affiliations`, `registrations`) que gestores de clube precisam acessar. Sem `EXECUTE`, essas operações de gestor também falhariam.

A função permanece segura porque:
- Retorna apenas `boolean` (verdadeiro/falso), nunca dados.
- É `SECURITY DEFINER` com `search_path = public`.
- Apenas verifica se existe um vínculo em `team_managers` — não permite leitura ampla.
- `anon` e `PUBLIC` continuam sem `EXECUTE`.

## 7. Permissões que serão alteradas

| Objeto | Alteração |
|---|---|
| Policy `matches manager schedule` | Adicionar guarda `NOT has_role(auth.uid(),'admin')` no USING e WITH CHECK |
| Função `public.manages_team` | `GRANT EXECUTE TO authenticated` (restaurar) |

Nenhuma outra permissão, role, tabela ou módulo será alterado.

## 8. Como será garantido que usuários comuns não poderão usar a função indevidamente

- `anon` e `PUBLIC` permanecem sem `EXECUTE`.
- A função apenas retorna `true`/`false` para um par `(user_id, team_id)` — não expõe dados de outros usuários.
- As policies que a utilizam continuam restringindo operações ao clube vinculado.
- Um usuário sem vínculo em `team_managers` sempre receberá `false`.
- Um atleta ou usuário comum não tem role `club_manager` nem vínculo em `team_managers`, portanto a função retorna `false` e as policies bloqueiam a operação.

## Escopo preservado

- RLS permanece habilitado em todas as tabelas.
- Nenhuma role, conta, equipe, atleta, partida ou módulo será alterado.
- A policy `matches admin write` permanece inalterada.
- A função `has_role` permanece inalterada.
- Nenhuma nova tabela ou função será criada.

## Testes após a correção

1. **ADMIN homologa partida:** executar `UPDATE matches SET homologated=true` com a conta admin e confirmar sucesso.
2. **ADMIN reabre partida:** executar `UPDATE matches SET homologated=false` com a conta admin e confirmar sucesso.
3. **Gestor atualiza partida do próprio clube:** confirmar que a policy de gestor ainda funciona para operações permitidas.
4. **Gestor tenta homologar:** confirmar que gestor não consegue definir `homologated=true` (a policy de gestor não deve permitir alterar esse campo — verificar se há restrição de coluna).
5. **Anônimo:** confirmar que `manages_team` não é executável.
