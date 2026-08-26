DROP POLICY IF EXISTS "matches manager schedule" ON public.matches;
CREATE POLICY "matches manager schedule" ON public.matches
FOR UPDATE TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (public.manages_team(auth.uid(), home_team_id) OR public.manages_team(auth.uid(), away_team_id))
)
WITH CHECK (
  NOT public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (public.manages_team(auth.uid(), home_team_id) OR public.manages_team(auth.uid(), away_team_id))
);

GRANT EXECUTE ON FUNCTION public.manages_team(uuid, uuid) TO authenticated;