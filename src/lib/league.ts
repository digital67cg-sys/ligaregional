import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  registration_fee: number;
  affiliation_fee: number;
  transfer_window_start: string | null;
  transfer_window_end: string | null;
};

export type Team = {
  id: string;
  name: string;
  short_name: string;
  crest_url: string | null;
  city: string | null;
  district: string | null;
  colors: string | null;
  founded_year: number | null;
  /** Contatos só são carregados nas telas administrativas. */
  responsible_name?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram: string | null;
  status: string;
};

export type Player = {
  id: string;
  full_name: string;
  nickname: string | null;
  photo_url: string | null;
  birth_date: string | null;
  position: string | null;
  shirt_number: number | null;
  current_team_id: string | null;
  status: string;
};

export type Match = {
  id: string;
  season_id: string;
  round: number;
  leg: number;
  home_team_id: string;
  away_team_id: string;
  match_date: string | null;
  kickoff: string | null;
  venue: string | null;
  address: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  homologated: boolean;
  away_confirmed: boolean;
  notes: string | null;
};

export type StandingRow = {
  season_id: string;
  team_id: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  type: string;
  minute: number | null;
};

const db = supabase as unknown as {
  from: (t: string) => any;
};

async function rows<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await promise;
  if (error) throw error;
  return (data ?? []) as T[];
}

export const MATCH_STATUS: Record<string, string> = {
  to_define: "A definir",
  scheduled: "Agendada",
  confirmed: "Confirmada",
  live: "Em andamento",
  finished: "Encerrada",
  postponed: "Adiada",
  canceled: "Cancelada",
  wo: "W.O.",
};

export const SEASON_STATUS: Record<string, string> = {
  planning: "Planejamento",
  registration: "Inscrições abertas",
  in_progress: "Em andamento",
  finished: "Encerrada",
};

export const seasonsQuery = queryOptions({
  queryKey: ["seasons"],
  queryFn: () => rows<Season>(db.from("seasons").select("*").order("year", { ascending: false })),
});

/** Colunas de clubes visíveis publicamente (sem dados de contato do responsável). */
export const TEAM_PUBLIC_COLUMNS =
  "id, name, short_name, crest_url, city, district, colors, founded_year, instagram, status";

export const teamsQuery = queryOptions({
  queryKey: ["teams"],
  queryFn: () => rows<Team>(db.from("teams").select(TEAM_PUBLIC_COLUMNS).order("name")),
});

export const playersQuery = queryOptions({
  queryKey: ["players"],
  queryFn: () => rows<Player>(db.from("players").select("*").order("full_name")),
});

export const newsQuery = queryOptions({
  queryKey: ["news"],
  queryFn: () =>
    rows<{
      id: string;
      title: string;
      subtitle: string | null;
      image_url: string | null;
      content: string | null;
      category: string;
      published_at: string;
    }>(db.from("news").select("*").order("published_at", { ascending: false })),
});

export const sponsorsQuery = queryOptions({
  queryKey: ["sponsors"],
  queryFn: () =>
    rows<{ id: string; name: string; logo_url: string | null; tier: string; link: string | null }>(
      db.from("sponsors").select("*"),
    ),
});

export const refereesQuery = queryOptions({
  queryKey: ["referees"],
  queryFn: () =>
    rows<{ id: string; name: string; role: string; phone: string | null; availability: string | null; status: string }>(
      db.from("referees").select("*").order("name"),
    ),
});

export const regulationsQuery = queryOptions({
  queryKey: ["regulations"],
  queryFn: () =>
    rows<{ id: string; season_id: string | null; version: string; content: string | null; file_url: string | null; updated_at: string }>(
      db.from("regulations").select("*").order("updated_at", { ascending: false }),
    ),
});

export const leagueSettingsQuery = queryOptions({
  queryKey: ["league_settings"],
  queryFn: async () => {
    const { data, error } = await db.from("league_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data as {
      league_name: string;
      tagline: string;
      contact_email: string | null;
      contact_phone: string | null;
      instagram: string | null;
      ranking_points: Record<string, number>;
    } | null;
  },
});

export const matchesQuery = (seasonId: string | undefined) =>
  queryOptions({
    queryKey: ["matches", seasonId],
    enabled: !!seasonId,
    queryFn: () =>
      rows<Match>(
        db
          .from("matches")
          .select("*")
          .eq("season_id", seasonId)
          .order("round")
          .order("match_date"),
      ),
  });

export const standingsQuery = (seasonId: string | undefined) =>
  queryOptions({
    queryKey: ["standings", seasonId],
    enabled: !!seasonId,
    queryFn: () => rows<StandingRow>(db.from("standings").select("*").eq("season_id", seasonId)),
  });

export const topScorersQuery = (seasonId: string | undefined) =>
  queryOptions({
    queryKey: ["top_scorers", seasonId],
    enabled: !!seasonId,
    queryFn: () =>
      rows<{ season_id: string; player_id: string; team_id: string; goals: number }>(
        db.from("top_scorers").select("*").eq("season_id", seasonId).order("goals", { ascending: false }),
      ),
  });

export const allScorersQuery = queryOptions({
  queryKey: ["top_scorers", "all"],
  queryFn: () =>
    rows<{ season_id: string; player_id: string; team_id: string; goals: number }>(
      db.from("top_scorers").select("*"),
    ),
});

export const matchEventsQuery = (matchId: string) =>
  queryOptions({
    queryKey: ["match_events", matchId],
    queryFn: () => rows<MatchEvent>(db.from("match_events").select("*").eq("match_id", matchId).order("minute")),
  });

export const playerEventsQuery = (playerId: string) =>
  queryOptions({
    queryKey: ["player_events", playerId],
    queryFn: () => rows<MatchEvent>(db.from("match_events").select("*").eq("player_id", playerId)),
  });

export const clubRankingQuery = queryOptions({
  queryKey: ["club_ranking"],
  queryFn: () =>
    rows<{ season_id: string; team_id: string; position: number | null; points: number; achievement: string | null }>(
      db.from("club_ranking_points").select("*"),
    ),
});

export const financeQuery = (seasonId: string | undefined) =>
  queryOptions({
    queryKey: ["finance", seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const [affiliations, registrations] = await Promise.all([
        rows<{ team_id: string; amount: number; status: string; due_date: string | null }>(
          db.from("affiliations").select("*").eq("season_id", seasonId),
        ),
        rows<{ team_id: string; amount: number; status: string }>(
          db.from("registrations").select("*").eq("season_id", seasonId),
        ),
      ]);
      return { affiliations, registrations };
    },
  });

/** Ordena a classificação aplicando os critérios de desempate configuráveis. */
export function sortStandings(rowsIn: StandingRow[], tiebreakers: string[] = ["points", "wins", "goal_difference", "goals_for"]) {
  const value = (r: StandingRow, key: string) => {
    switch (key) {
      case "points":
        return r.points;
      case "wins":
        return r.wins;
      case "goal_difference":
        return r.goal_diff;
      case "goals_for":
        return r.goals_for;
      default:
        return 0;
    }
  };
  return [...rowsIn].sort((a, b) => {
    for (const key of tiebreakers) {
      const diff = value(b, key) - value(a, key);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

export function pct(row: StandingRow) {
  if (!row.played) return 0;
  return Math.round((row.points / (row.played * 3)) * 100);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "A definir";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function formatTime(time: string | null | undefined) {
  if (!time) return "--:--";
  return time.slice(0, 5);
}
