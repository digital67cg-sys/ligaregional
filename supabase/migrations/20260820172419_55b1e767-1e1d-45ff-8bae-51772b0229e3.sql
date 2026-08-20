
ALTER VIEW public.standings SET (security_invoker = on);
ALTER VIEW public.top_scorers SET (security_invoker = on);
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.manages_team(uuid, uuid) FROM anon, public;
