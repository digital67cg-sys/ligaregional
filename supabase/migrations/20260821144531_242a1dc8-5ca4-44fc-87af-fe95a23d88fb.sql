
-- 1. profile status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 2. membership requests
CREATE TABLE IF NOT EXISTS public.membership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_role app_role NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_requests TO authenticated;
GRANT ALL ON public.membership_requests TO service_role;
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mr own read" ON public.membership_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mr own insert" ON public.membership_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "mr admin all" ON public.membership_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. membership history
CREATE TABLE IF NOT EXISTS public.membership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.membership_history TO authenticated;
GRANT ALL ON public.membership_history TO service_role;
ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh own read" ON public.membership_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mh admin all" ON public.membership_history FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_membership_requests_updated_at ON public.membership_requests;
CREATE TRIGGER update_membership_requests_updated_at BEFORE UPDATE ON public.membership_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. admins manage roles / team managers / profiles
DROP POLICY IF EXISTS "roles admin manage" ON public.user_roles;
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "tm admin manage" ON public.team_managers;
CREATE POLICY "tm admin manage" ON public.team_managers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "profiles admin update" ON public.profiles;
CREATE POLICY "profiles admin update" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. notify admins of new requests
CREATE OR REPLACE FUNCTION public.notify_admins_membership_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type)
  SELECT ur.user_id, 'Nova solicitação de vínculo',
         'Um usuário solicitou vínculo como ' || NEW.requested_role::text || '.', 'membership'
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_membership_request_created ON public.membership_requests;
CREATE TRIGGER on_membership_request_created AFTER INSERT ON public.membership_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_membership_request();

-- 7. approve/reject requests atomically (admin only)
CREATE OR REPLACE FUNCTION public.review_membership_request(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.membership_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT * INTO r FROM public.membership_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;

  IF _approve THEN
    IF r.requested_role = 'club_manager' THEN
      IF r.team_id IS NULL THEN RAISE EXCEPTION 'Selecione um clube antes de aprovar'; END IF;
      INSERT INTO public.team_managers (team_id, user_id) VALUES (r.team_id, r.user_id) ON CONFLICT DO NOTHING;
    ELSIF r.requested_role = 'athlete' THEN
      IF r.player_id IS NULL THEN RAISE EXCEPTION 'Selecione um atleta antes de aprovar'; END IF;
      UPDATE public.players SET user_id = r.user_id WHERE id = r.player_id;
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (r.user_id, r.requested_role) ON CONFLICT DO NOTHING;
    INSERT INTO public.membership_history (user_id, role, team_id, player_id, reason)
    VALUES (r.user_id, r.requested_role, r.team_id, r.player_id, 'Solicitação aprovada');
    UPDATE public.membership_requests SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(), review_notes=_notes WHERE id=_request_id;
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (r.user_id, 'Vínculo aprovado', 'Seu vínculo com a Liga foi aprovado.', 'membership');
  ELSE
    UPDATE public.membership_requests SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_notes=_notes WHERE id=_request_id;
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (r.user_id, 'Vínculo rejeitado', COALESCE(_notes,'Sua solicitação de vínculo foi rejeitada.'), 'membership');
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.review_membership_request(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_membership_request(uuid, boolean, text) TO authenticated;

-- 8. admin sets a user's link directly
CREATE OR REPLACE FUNCTION public.admin_set_user_membership(_user_id uuid, _role app_role, _team_id uuid DEFAULT NULL, _player_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _role = 'club_manager' AND _team_id IS NULL THEN RAISE EXCEPTION 'Gestor precisa de um clube'; END IF;
  IF _role = 'athlete' AND _player_id IS NULL THEN RAISE EXCEPTION 'Atleta precisa de um cadastro de atleta'; END IF;

  UPDATE public.membership_history SET ended_at = now(), reason = COALESCE(reason,'Vínculo substituído')
  WHERE user_id = _user_id AND ended_at IS NULL;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.team_managers WHERE user_id = _user_id;
  UPDATE public.players SET user_id = NULL WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  IF _role = 'club_manager' THEN
    INSERT INTO public.team_managers (team_id, user_id) VALUES (_team_id, _user_id) ON CONFLICT DO NOTHING;
  ELSIF _role = 'athlete' THEN
    UPDATE public.players SET user_id = _user_id WHERE id = _player_id;
  END IF;

  INSERT INTO public.membership_history (user_id, role, team_id, player_id, reason)
  VALUES (_user_id, _role, _team_id, _player_id, 'Vínculo definido pela organização');
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_user_membership(uuid, app_role, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_membership(uuid, app_role, uuid, uuid) TO authenticated;

-- 9. first admin bootstrap (no hardcoded password)
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.membership_history (user_id, role, reason) VALUES (auth.uid(), 'admin', 'Primeiro administrador da Liga');
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- 10. helper: does the league already have an admin?
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
REVOKE ALL ON FUNCTION public.has_any_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
