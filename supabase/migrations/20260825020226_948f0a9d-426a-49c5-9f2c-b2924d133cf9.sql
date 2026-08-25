-- 1. profiles: restrict reads
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles own read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2. user_roles: restrict reads
DROP POLICY IF EXISTS "roles readable" ON public.user_roles;
CREATE POLICY "roles own read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. teams: hide contact columns from anonymous visitors
REVOKE SELECT ON public.teams FROM anon;
GRANT SELECT (id, name, short_name, crest_url, city, district, colors, founded_year, instagram, status, created_at)
  ON public.teams TO anon;

-- 4. lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.admin_backup_season(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_team(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_generate_fixtures(uuid, boolean, date, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_log(text, text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_fixtures(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_season(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_sport(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_backup(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_membership(uuid, app_role, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_swap_home_away(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_sync_score_from_events(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_membership_request(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manages_team(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_membership_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_delete_team(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generate_fixtures(uuid, boolean, date, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_fixtures(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_season(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_sport(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_backup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_membership(uuid, app_role, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_swap_home_away(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_score_from_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_membership_request(uuid, boolean, text) TO authenticated;