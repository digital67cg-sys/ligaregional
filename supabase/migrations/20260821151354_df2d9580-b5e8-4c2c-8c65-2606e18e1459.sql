REVOKE EXECUTE ON FUNCTION public.admin_backup_season(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_generate_fixtures(uuid, boolean, date, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_swap_home_away(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_sync_score_from_events(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_sport(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_fixtures(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_season(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_restore_backup(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_team(uuid, boolean) FROM anon;