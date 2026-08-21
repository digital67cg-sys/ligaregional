-- ============ Schema extensions ============
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.league_settings ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.league_settings ADD COLUMN IF NOT EXISTS maintenance_message text;

-- ============ Awards ============
CREATE TABLE IF NOT EXISTS public.awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  category text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.awards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.awards TO authenticated;
GRANT ALL ON public.awards TO service_role;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "awards_public_read" ON public.awards;
CREATE POLICY "awards_public_read" ON public.awards FOR SELECT USING (true);
DROP POLICY IF EXISTS "awards_admin_manage" ON public.awards;
CREATE POLICY "awards_admin_manage" ON public.awards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_awards_updated_at ON public.awards;
CREATE TRIGGER update_awards_updated_at BEFORE UPDATE ON public.awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Maintenance log ============
CREATE TABLE IF NOT EXISTS public.maintenance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  admin_id uuid,
  operation text NOT NULL,
  description text,
  affected_matches integer NOT NULL DEFAULT 0,
  backup_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.maintenance_log TO authenticated;
GRANT ALL ON public.maintenance_log TO service_role;
ALTER TABLE public.maintenance_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_admin_read" ON public.maintenance_log;
CREATE POLICY "maintenance_admin_read" ON public.maintenance_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ Season backups ============
CREATE TABLE IF NOT EXISTS public.season_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  created_by uuid,
  reason text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.season_backups TO authenticated;
GRANT ALL ON public.season_backups TO service_role;
ALTER TABLE public.season_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_admin_read" ON public.season_backups;
CREATE POLICY "backups_admin_read" ON public.season_backups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ Helpers ============
CREATE OR REPLACE FUNCTION public.admin_log(_action text, _entity text, _entity_id uuid, _details jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), _action, _entity, _entity_id, _details);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_backup_season(_season_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  INSERT INTO public.season_backups (season_id, created_by, reason, payload)
  VALUES (_season_id, auth.uid(), _reason, jsonb_build_object(
    'matches', COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.matches m WHERE m.season_id = _season_id), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM public.match_events e JOIN public.matches m ON m.id = e.match_id WHERE m.season_id = _season_id), '[]'::jsonb),
    'season_teams', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.season_teams s WHERE s.season_id = _season_id), '[]'::jsonb)
  ))
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- ============ Fixture generation ============
CREATE OR REPLACE FUNCTION public.admin_generate_fixtures(
  _season_id uuid, _double_round boolean DEFAULT true, _start_date date DEFAULT NULL,
  _interval_days integer DEFAULT 7, _wipe boolean DEFAULT true
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ids uuid[]; n int; rounds int; i int; j int; home uuid; away uuid;
  created int := 0; bkp uuid; d date; a int; b int; tmp uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT array_agg(st.team_id ORDER BY t.name) INTO ids
  FROM public.season_teams st JOIN public.teams t ON t.id = st.team_id
  WHERE st.season_id = _season_id AND st.status <> 'removed';
  IF ids IS NULL OR array_length(ids,1) < 2 THEN RAISE EXCEPTION 'Selecione pelo menos 2 clubes na temporada'; END IF;

  bkp := public.admin_backup_season(_season_id, 'Antes de gerar tabela');

  IF _wipe THEN
    DELETE FROM public.match_events e USING public.matches m WHERE e.match_id = m.id AND m.season_id = _season_id;
    DELETE FROM public.referee_assignments ra USING public.matches m WHERE ra.match_id = m.id AND m.season_id = _season_id;
    DELETE FROM public.matches WHERE season_id = _season_id;
  END IF;

  n := array_length(ids,1);
  IF n % 2 = 1 THEN ids := ids || ARRAY[NULL::uuid]; n := n + 1; END IF;
  rounds := n - 1;
  d := COALESCE(_start_date, CURRENT_DATE);

  FOR i IN 1..rounds LOOP
    FOR j IN 1..(n/2) LOOP
      home := ids[j];
      away := ids[n + 1 - j];
      IF home IS NOT NULL AND away IS NOT NULL THEN
        IF i % 2 = 0 THEN
          INSERT INTO public.matches (season_id, round, leg, home_team_id, away_team_id, match_date, status)
          VALUES (_season_id, i, 1, away, home, d, 'to_define');
        ELSE
          INSERT INTO public.matches (season_id, round, leg, home_team_id, away_team_id, match_date, status)
          VALUES (_season_id, i, 1, home, away, d, 'to_define');
        END IF;
        created := created + 1;
      END IF;
    END LOOP;
    -- rotate (keep first fixed)
    tmp := ARRAY[ids[1]] || ids[n:n] || ids[2:n-1];
    ids := tmp;
    d := d + (_interval_days || ' days')::interval;
  END LOOP;

  IF _double_round THEN
    INSERT INTO public.matches (season_id, round, leg, home_team_id, away_team_id, match_date, status)
    SELECT m.season_id, m.round + rounds, 2, m.away_team_id, m.home_team_id,
           m.match_date + (rounds * _interval_days || ' days')::interval, 'to_define'
    FROM public.matches m WHERE m.season_id = _season_id AND m.leg = 1;
    GET DIAGNOSTICS a = ROW_COUNT;
    created := created + a;
  END IF;

  INSERT INTO public.maintenance_log (season_id, admin_id, operation, description, affected_matches, backup_id)
  VALUES (_season_id, auth.uid(), 'generate_fixtures',
          CASE WHEN _double_round THEN 'Tabela gerada (turno e returno)' ELSE 'Tabela gerada (turno único)' END,
          created, bkp);
  PERFORM public.admin_log('Tabela gerada', 'seasons', _season_id, jsonb_build_object('partidas', created));
  RETURN created;
END; $$;

-- ============ Match helpers ============
CREATE OR REPLACE FUNCTION public.admin_swap_home_away(_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.matches;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT * INTO m FROM public.matches WHERE id = _match_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Partida não encontrada'; END IF;
  UPDATE public.matches SET home_team_id = m.away_team_id, away_team_id = m.home_team_id,
    home_score = m.away_score, away_score = m.home_score WHERE id = _match_id;
  PERFORM public.admin_log('Mando invertido', 'matches', _match_id, jsonb_build_object('antes', m.home_team_id, 'depois', m.away_team_id));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_sync_score_from_events(_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.matches; h int; a int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT * INTO m FROM public.matches WHERE id = _match_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Partida não encontrada'; END IF;
  SELECT count(*) FILTER (WHERE e.team_id = m.home_team_id), count(*) FILTER (WHERE e.team_id = m.away_team_id)
    INTO h, a FROM public.match_events e WHERE e.match_id = _match_id AND e.type = 'goal';
  UPDATE public.matches SET home_score = COALESCE(h,0), away_score = COALESCE(a,0) WHERE id = _match_id;
  PERFORM public.admin_log('Placar recalculado pela súmula', 'matches', _match_id, jsonb_build_object('placar', COALESCE(h,0) || 'x' || COALESCE(a,0)));
END; $$;

-- ============ Resets ============
CREATE OR REPLACE FUNCTION public.admin_reset_sport(_season_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bkp uuid; affected int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  bkp := public.admin_backup_season(_season_id, 'Antes do reset esportivo');
  DELETE FROM public.match_events e USING public.matches m WHERE e.match_id = m.id AND m.season_id = _season_id;
  UPDATE public.matches SET home_score = NULL, away_score = NULL, homologated = false, status = 'scheduled'
   WHERE season_id = _season_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  DELETE FROM public.club_ranking_points WHERE season_id = _season_id;
  INSERT INTO public.maintenance_log (season_id, admin_id, operation, description, affected_matches, backup_id)
  VALUES (_season_id, auth.uid(), 'reset_sport', 'Reset esportivo da temporada', affected, bkp);
  PERFORM public.admin_log('Reset esportivo', 'seasons', _season_id, jsonb_build_object('partidas', affected));
  RETURN affected;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reset_fixtures(_season_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bkp uuid; affected int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  bkp := public.admin_backup_season(_season_id, 'Antes do reset de tabela');
  DELETE FROM public.match_events e USING public.matches m WHERE e.match_id = m.id AND m.season_id = _season_id;
  DELETE FROM public.referee_assignments ra USING public.matches m WHERE ra.match_id = m.id AND m.season_id = _season_id;
  DELETE FROM public.matches WHERE season_id = _season_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO public.maintenance_log (season_id, admin_id, operation, description, affected_matches, backup_id)
  VALUES (_season_id, auth.uid(), 'reset_fixtures', 'Reset de tabela (rodadas e partidas)', affected, bkp);
  PERFORM public.admin_log('Reset de tabela', 'seasons', _season_id, jsonb_build_object('partidas', affected));
  RETURN affected;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reset_season(_season_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bkp uuid; affected int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  bkp := public.admin_backup_season(_season_id, 'Antes do reset total');
  DELETE FROM public.match_events e USING public.matches m WHERE e.match_id = m.id AND m.season_id = _season_id;
  DELETE FROM public.referee_assignments ra USING public.matches m WHERE ra.match_id = m.id AND m.season_id = _season_id;
  DELETE FROM public.matches WHERE season_id = _season_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  DELETE FROM public.club_ranking_points WHERE season_id = _season_id;
  DELETE FROM public.transfers WHERE season_id = _season_id;
  DELETE FROM public.awards WHERE season_id = _season_id;
  UPDATE public.seasons SET champion_team_id = NULL WHERE id = _season_id;
  INSERT INTO public.maintenance_log (season_id, admin_id, operation, description, affected_matches, backup_id)
  VALUES (_season_id, auth.uid(), 'reset_season', 'Reset total da temporada (clubes, atletas e histórico preservados)', affected, bkp);
  PERFORM public.admin_log('Reset total da temporada', 'seasons', _season_id, jsonb_build_object('partidas', affected));
  RETURN affected;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_restore_backup(_backup_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.season_backups; restored int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT * INTO b FROM public.season_backups WHERE id = _backup_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Backup não encontrado'; END IF;

  DELETE FROM public.match_events e USING public.matches m WHERE e.match_id = m.id AND m.season_id = b.season_id;
  DELETE FROM public.referee_assignments ra USING public.matches m WHERE ra.match_id = m.id AND m.season_id = b.season_id;
  DELETE FROM public.matches WHERE season_id = b.season_id;

  INSERT INTO public.matches
  SELECT * FROM jsonb_populate_recordset(NULL::public.matches, b.payload->'matches');
  GET DIAGNOSTICS restored = ROW_COUNT;
  INSERT INTO public.match_events
  SELECT * FROM jsonb_populate_recordset(NULL::public.match_events, b.payload->'events');

  INSERT INTO public.maintenance_log (season_id, admin_id, operation, description, affected_matches, backup_id)
  VALUES (b.season_id, auth.uid(), 'restore_backup', 'Backup restaurado', restored, b.id);
  PERFORM public.admin_log('Backup restaurado', 'seasons', b.season_id, jsonb_build_object('partidas', restored));
  RETURN restored;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_team(_team_id uuid, _force boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_history boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.matches WHERE home_team_id = _team_id OR away_team_id = _team_id)
      OR EXISTS (SELECT 1 FROM public.club_ranking_points WHERE team_id = _team_id) INTO has_history;
  IF has_history AND NOT _force THEN
    RAISE EXCEPTION 'Este clube possui histórico na Liga. Prefira inativar ou remover da temporada.';
  END IF;
  IF has_history THEN
    UPDATE public.teams SET status = 'inactive' WHERE id = _team_id;
    DELETE FROM public.season_teams WHERE team_id = _team_id;
    PERFORM public.admin_log('Clube inativado (possuía histórico)', 'teams', _team_id, NULL);
  ELSE
    DELETE FROM public.teams WHERE id = _team_id;
    PERFORM public.admin_log('Clube excluído definitivamente', 'teams', _team_id, NULL);
  END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_log(text, text, uuid, jsonb) FROM anon, authenticated;