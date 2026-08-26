CREATE OR REPLACE FUNCTION public.can_request_referee(_user_id uuid, _match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.team_managers tm ON tm.user_id = ur.user_id
      JOIN public.matches m ON m.home_team_id = tm.team_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'club_manager'::public.app_role
        AND m.id = _match_id
    )
$$;

REVOKE ALL ON FUNCTION public.can_request_referee(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_request_referee(uuid, uuid) TO authenticated, service_role;