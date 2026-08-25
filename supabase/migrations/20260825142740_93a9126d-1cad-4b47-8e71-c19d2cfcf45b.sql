-- Restaura somente o privilégio de execução da função de verificação de role.
-- As policies de profiles/user_roles chamam public.has_role, mas o papel
-- authenticated havia perdido EXECUTE, quebrando a avaliação do RLS.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;