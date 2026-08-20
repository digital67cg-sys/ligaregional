
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','club_manager','athlete');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- SEASONS
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year int NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planning',
  is_current boolean NOT NULL DEFAULT false,
  transfer_window_start date,
  transfer_window_end date,
  registration_fee numeric NOT NULL DEFAULT 0,
  affiliation_fee numeric NOT NULL DEFAULT 0,
  points_win int NOT NULL DEFAULT 3,
  points_draw int NOT NULL DEFAULT 1,
  tiebreakers jsonb NOT NULL DEFAULT '["points","wins","goal_difference","goals_for","head_to_head","discipline","draw"]'::jsonb,
  champion_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons public read" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "seasons admin write" ON public.seasons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  crest_url text,
  city text,
  district text,
  colors text,
  founded_year int,
  responsible_name text,
  phone text,
  email text,
  instagram text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.team_managers TO authenticated;
GRANT ALL ON public.team_managers TO service_role;
ALTER TABLE public.team_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.manages_team(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_managers WHERE user_id = _user_id AND team_id = _team_id)
$$;

CREATE POLICY "teams public read" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams admin write" ON public.teams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "teams manager update" ON public.teams FOR UPDATE TO authenticated USING (public.manages_team(auth.uid(), id)) WITH CHECK (public.manages_team(auth.uid(), id));
CREATE POLICY "team_managers read" ON public.team_managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_managers admin write" ON public.team_managers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.season_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed',
  UNIQUE (season_id, team_id)
);
GRANT SELECT ON public.season_teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season_teams TO authenticated;
GRANT ALL ON public.season_teams TO service_role;
ALTER TABLE public.season_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_teams public read" ON public.season_teams FOR SELECT USING (true);
CREATE POLICY "season_teams admin write" ON public.season_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PLAYERS
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  nickname text,
  photo_url text,
  birth_date date,
  position text,
  shirt_number int,
  document text,
  current_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players public read" ON public.players FOR SELECT USING (true);
CREATE POLICY "players admin write" ON public.players FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "players manager insert" ON public.players FOR INSERT TO authenticated WITH CHECK (public.manages_team(auth.uid(), current_team_id));
CREATE POLICY "players manager update" ON public.players FOR UPDATE TO authenticated USING (public.manages_team(auth.uid(), current_team_id)) WITH CHECK (public.manages_team(auth.uid(), current_team_id));

CREATE TABLE public.player_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, player_id)
);
GRANT SELECT ON public.player_registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_registrations TO authenticated;
GRANT ALL ON public.player_registrations TO service_role;
ALTER TABLE public.player_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preg public read" ON public.player_registrations FOR SELECT USING (true);
CREATE POLICY "preg admin write" ON public.player_registrations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "preg manager insert" ON public.player_registrations FOR INSERT TO authenticated WITH CHECK (public.manages_team(auth.uid(), team_id));

CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'transfer',
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transfers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers public read" ON public.transfers FOR SELECT USING (true);
CREATE POLICY "transfers admin write" ON public.transfers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "transfers manager insert" ON public.transfers FOR INSERT TO authenticated WITH CHECK (public.manages_team(auth.uid(), to_team_id) OR public.manages_team(auth.uid(), from_team_id));

-- MATCHES
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  round int NOT NULL DEFAULT 1,
  leg int NOT NULL DEFAULT 1,
  home_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  match_date date,
  kickoff time,
  venue text,
  address text,
  status text NOT NULL DEFAULT 'to_define',
  home_score int,
  away_score int,
  homologated boolean NOT NULL DEFAULT false,
  proposal_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  away_confirmed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches public read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches admin write" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "matches manager schedule" ON public.matches FOR UPDATE TO authenticated
  USING (public.manages_team(auth.uid(), home_team_id) OR public.manages_team(auth.uid(), away_team_id))
  WITH CHECK (public.manages_team(auth.uid(), home_team_id) OR public.manages_team(auth.uid(), away_team_id));

CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  type text NOT NULL,
  minute int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO authenticated;
GRANT ALL ON public.match_events TO service_role;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "events admin write" ON public.match_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- REFEREES
CREATE TABLE public.referees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'arbitro',
  phone text,
  availability text,
  status text NOT NULL DEFAULT 'active'
);
GRANT SELECT ON public.referees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referees TO authenticated;
GRANT ALL ON public.referees TO service_role;
ALTER TABLE public.referees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referees public read" ON public.referees FOR SELECT USING (true);
CREATE POLICY "referees admin write" ON public.referees FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.referee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  referee_id uuid REFERENCES public.referees(id) ON DELETE SET NULL,
  fee numeric NOT NULL DEFAULT 0,
  home_share numeric NOT NULL DEFAULT 0,
  away_share numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  confirmed boolean NOT NULL DEFAULT false,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referee_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referee_assignments TO authenticated;
GRANT ALL ON public.referee_assignments TO service_role;
ALTER TABLE public.referee_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refassign public read" ON public.referee_assignments FOR SELECT USING (true);
CREATE POLICY "refassign admin write" ON public.referee_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FINANCE
CREATE TABLE public.affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  receipt_url text,
  UNIQUE (season_id, team_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliations TO authenticated;
GRANT ALL ON public.affiliations TO service_role;
ALTER TABLE public.affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affil admin" ON public.affiliations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "affil manager read" ON public.affiliations FOR SELECT TO authenticated USING (public.manages_team(auth.uid(), team_id));

CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  UNIQUE (season_id, team_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg admin" ON public.registrations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "reg manager read" ON public.registrations FOR SELECT TO authenticated USING (public.manages_team(auth.uid(), team_id));

-- CONTENT
CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  content text,
  category text NOT NULL DEFAULT 'Liga',
  published_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news public read" ON public.news FOR SELECT USING (true);
CREATE POLICY "news admin write" ON public.news FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0',
  file_url text,
  content text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regulations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regulations TO authenticated;
GRANT ALL ON public.regulations TO service_role;
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reglt public read" ON public.regulations FOR SELECT USING (true);
CREATE POLICY "reglt admin write" ON public.regulations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  tier text NOT NULL DEFAULT 'apoiador',
  link text,
  featured boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsors public read" ON public.sponsors FOR SELECT USING (true);
CREATE POLICY "sponsors admin write" ON public.sponsors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- RANKINGS / RECORDS / SETTINGS
CREATE TABLE public.club_ranking_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  position int,
  points numeric NOT NULL DEFAULT 0,
  achievement text,
  UNIQUE (season_id, team_id)
);
GRANT SELECT ON public.club_ranking_points TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_ranking_points TO authenticated;
GRANT ALL ON public.club_ranking_points TO service_role;
ALTER TABLE public.club_ranking_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crp public read" ON public.club_ranking_points FOR SELECT USING (true);
CREATE POLICY "crp admin write" ON public.club_ranking_points FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.league_settings (
  id int PRIMARY KEY DEFAULT 1,
  league_name text NOT NULL DEFAULT 'Liga Regional',
  logo_url text,
  tagline text NOT NULL DEFAULT 'Mais que um campeonato. Uma competição que constrói história.',
  contact_email text,
  contact_phone text,
  instagram text,
  ranking_points jsonb NOT NULL DEFAULT '{"champion":100,"runner_up":70,"third":50,"other":20}'::jsonb,
  CONSTRAINT single_row CHECK (id = 1)
);
GRANT SELECT ON public.league_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.league_settings TO authenticated;
GRANT ALL ON public.league_settings TO service_role;
ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.league_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.league_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.league_settings (id) VALUES (1);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications admin write" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- STANDINGS VIEW
CREATE OR REPLACE VIEW public.standings AS
WITH played AS (
  SELECT m.season_id, m.home_team_id AS team_id, m.home_score AS gf, m.away_score AS ga FROM public.matches m
    WHERE m.homologated AND m.home_score IS NOT NULL
  UNION ALL
  SELECT m.season_id, m.away_team_id, m.away_score, m.home_score FROM public.matches m
    WHERE m.homologated AND m.home_score IS NOT NULL
)
SELECT
  st.season_id,
  st.team_id,
  COALESCE(COUNT(p.team_id),0)::int AS played,
  COALESCE(SUM(CASE WHEN p.gf > p.ga THEN 1 ELSE 0 END),0)::int AS wins,
  COALESCE(SUM(CASE WHEN p.gf = p.ga THEN 1 ELSE 0 END),0)::int AS draws,
  COALESCE(SUM(CASE WHEN p.gf < p.ga THEN 1 ELSE 0 END),0)::int AS losses,
  COALESCE(SUM(p.gf),0)::int AS goals_for,
  COALESCE(SUM(p.ga),0)::int AS goals_against,
  COALESCE(SUM(p.gf) - SUM(p.ga),0)::int AS goal_diff,
  COALESCE(SUM(CASE WHEN p.gf > p.ga THEN 3 WHEN p.gf = p.ga THEN 1 ELSE 0 END),0)::int AS points
FROM public.season_teams st
LEFT JOIN played p ON p.season_id = st.season_id AND p.team_id = st.team_id
GROUP BY st.season_id, st.team_id;
GRANT SELECT ON public.standings TO anon, authenticated, service_role;

-- TOP SCORERS VIEW
CREATE OR REPLACE VIEW public.top_scorers AS
SELECT m.season_id, e.player_id, e.team_id, COUNT(*)::int AS goals
FROM public.match_events e
JOIN public.matches m ON m.id = e.match_id
WHERE e.type = 'goal' AND m.homologated
GROUP BY m.season_id, e.player_id, e.team_id;
GRANT SELECT ON public.top_scorers TO anon, authenticated, service_role;
