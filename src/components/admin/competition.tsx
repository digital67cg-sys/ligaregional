import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel, StatCard } from "@/components/admin/ui";
import {
  allScorersQuery,
  clubRankingQuery,
  matchesQuery,
  pct,
  playersQuery,
  sortStandings,
  standingsQuery,
  teamsQuery,
  topScorersQuery,
} from "@/lib/league";
import { useSeason } from "@/context/season";

/** A classificação é derivada apenas das partidas homologadas — nunca acumulada por gravação. */
export function StandingsSection() {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: standings = [] } = useQuery(standingsQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const table = sortStandings(standings);

  return (
    <Panel
      title="Classificação (derivada dos resultados homologados)"
      action={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["standings"] });
            qc.invalidateQueries({ queryKey: ["top_scorers"] });
            qc.invalidateQueries({ queryKey: ["matches"] });
            toast.success("Competição recalculada");
          }}
        >
          Recalcular competição
        </Button>
      }
    >
      {table.length === 0 && <EmptyState>Sem dados para esta temporada.</EmptyState>}
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {["POS", "TIME", "P", "J", "V", "E", "D", "GP", "GC", "SG", "AP"].map((h) => (
                <th key={h} className="p-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.team_id} className="border-t border-border">
                <td className="p-2">{i + 1}</td>
                <td className="p-2 font-semibold">{teams.find((t) => t.id === r.team_id)?.name ?? "-"}</td>
                <td className="p-2 font-bold">{r.points}</td>
                <td className="p-2">{r.played}</td>
                <td className="p-2">{r.wins}</td>
                <td className="p-2">{r.draws}</td>
                <td className="p-2">{r.losses}</td>
                <td className="p-2">{r.goals_for}</td>
                <td className="p-2">{r.goals_against}</td>
                <td className="p-2">{r.goal_diff}</td>
                <td className="p-2">{pct(r)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ScorersSection() {
  const { season } = useSeason();
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: allScorers = [] } = useQuery(allScorersQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));

  const gamesByTeam = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of matches.filter((x) => x.homologated)) {
      map.set(m.home_team_id, (map.get(m.home_team_id) ?? 0) + 1);
      map.set(m.away_team_id, (map.get(m.away_team_id) ?? 0) + 1);
    }
    return map;
  }, [matches]);

  const historic = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allScorers) map.set(s.player_id, (map.get(s.player_id) ?? 0) + s.goals);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  }, [allScorers]);

  const name = (id: string) => players.find((p) => p.id === id)?.full_name ?? "Atleta";

  return (
    <div className="space-y-4">
      <Panel title="Artilharia da temporada">
        {scorers.length === 0 && <EmptyState>Nenhum gol homologado.</EmptyState>}
        <div className="divide-y divide-border">
          {[...scorers]
            .sort((a, b) => b.goals - a.goals)
            .map((s, i) => {
              const games = gamesByTeam.get(s.team_id) ?? 0;
              return (
                <div key={`${s.player_id}-${i}`} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {i + 1}º {name(s.player_id)} · {teams.find((t) => t.id === s.team_id)?.short_name ?? "-"}
                  </span>
                  <span className="text-muted-foreground">
                    {s.goals} gols · {games} jogos · média {games ? (s.goals / games).toFixed(2) : "0.00"}
                  </span>
                </div>
              );
            })}
        </div>
      </Panel>
      <Panel title="Artilharia histórica da Liga">
        <div className="divide-y divide-border">
          {historic.map(([playerId, goals], i) => (
            <div key={playerId} className="flex items-center justify-between py-2 text-sm">
              <span>
                {i + 1}º {name(playerId)}
              </span>
              <span className="font-semibold">{goals} gols</span>
            </div>
          ))}
          {historic.length === 0 && <EmptyState>Sem histórico ainda.</EmptyState>}
        </div>
      </Panel>
    </div>
  );
}

export function StatsSection() {
  const { season } = useSeason();
  const { data: standings = [] } = useQuery(standingsQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));

  const table = sortStandings(standings);
  const bestAttack = [...standings].sort((a, b) => b.goals_for - a.goals_for)[0];
  const bestDefense = [...standings].sort((a, b) => a.goals_against - b.goals_against)[0];
  const played = matches.filter((m) => m.homologated);
  const goals = played.reduce((s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
  const tName = (id?: string) => teams.find((t) => t.id === id)?.name ?? "-";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jogos homologados" value={played.length} />
        <StatCard label="Gols" value={goals} />
        <StatCard label="Média de gols" value={played.length ? (goals / played.length).toFixed(2) : "0.00"} />
        <StatCard label="Líder" value={tName(table[0]?.team_id)} />
      </div>
      <Panel title="Destaques da temporada">
        <ul className="space-y-2 text-sm">
          <li>Melhor ataque: <strong>{tName(bestAttack?.team_id)}</strong> ({bestAttack?.goals_for ?? 0} gols)</li>
          <li>Melhor defesa: <strong>{tName(bestDefense?.team_id)}</strong> ({bestDefense?.goals_against ?? 0} sofridos)</li>
          <li>
            Melhor aproveitamento: <strong>{tName(table[0]?.team_id)}</strong> ({table[0] ? pct(table[0]) : 0}%)
          </li>
        </ul>
      </Panel>
    </div>
  );
}

export function RankingSection() {
  const { data: ranking = [] } = useQuery(clubRankingQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of ranking) map.set(r.team_id, (map.get(r.team_id) ?? 0) + Number(r.points || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [ranking]);

  return (
    <Panel title="Ranking histórico de clubes (independente de resets)">
      {totals.length === 0 && <EmptyState>Sem pontuação histórica registrada.</EmptyState>}
      <div className="divide-y divide-border">
        {totals.map(([teamId, points], i) => (
          <div key={teamId} className="flex items-center justify-between py-2 text-sm">
            <span>
              {i + 1}º {teams.find((t) => t.id === teamId)?.name ?? "Clube"}
            </span>
            <span className="font-semibold">{points} pts</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function RecordsSection() {
  const { season } = useSeason();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: standings = [] } = useQuery(standingsQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: players = [] } = useQuery(playersQuery);

  const played = matches.filter((m) => m.homologated && m.home_score !== null);
  const tName = (id?: string) => teams.find((t) => t.id === id)?.name ?? "-";

  const biggestWin = [...played].sort(
    (a, b) => Math.abs((b.home_score ?? 0) - (b.away_score ?? 0)) - Math.abs((a.home_score ?? 0) - (a.away_score ?? 0)),
  )[0];
  const mostGoals = [...played].sort(
    (a, b) => (b.home_score ?? 0) + (b.away_score ?? 0) - ((a.home_score ?? 0) + (a.away_score ?? 0)),
  )[0];
  const table = sortStandings(standings);
  const bestAttack = [...standings].sort((a, b) => b.goals_for - a.goals_for)[0];
  const bestDefense = [...standings].sort((a, b) => a.goals_against - b.goals_against)[0];
  const topScorer = [...scorers].sort((a, b) => b.goals - a.goals)[0];

  // Sequências calculadas em ordem cronológica por clube.
  const streaks = useMemo(() => {
    const byTeam = new Map<string, { win: number; unbeaten: number; bestWin: number; bestUnbeaten: number }>();
    const ordered = [...played].sort((a, b) => (a.match_date ?? "").localeCompare(b.match_date ?? "") || a.round - b.round);
    for (const m of ordered) {
      for (const side of ["home", "away"] as const) {
        const teamId = side === "home" ? m.home_team_id : m.away_team_id;
        const gf = side === "home" ? m.home_score ?? 0 : m.away_score ?? 0;
        const ga = side === "home" ? m.away_score ?? 0 : m.home_score ?? 0;
        const cur = byTeam.get(teamId) ?? { win: 0, unbeaten: 0, bestWin: 0, bestUnbeaten: 0 };
        cur.win = gf > ga ? cur.win + 1 : 0;
        cur.unbeaten = gf >= ga ? cur.unbeaten + 1 : 0;
        cur.bestWin = Math.max(cur.bestWin, cur.win);
        cur.bestUnbeaten = Math.max(cur.bestUnbeaten, cur.unbeaten);
        byTeam.set(teamId, cur);
      }
    }
    const arr = [...byTeam.entries()];
    return {
      win: arr.sort((a, b) => b[1].bestWin - a[1].bestWin)[0],
      unbeaten: arr.sort((a, b) => b[1].bestUnbeaten - a[1].bestUnbeaten)[0],
    };
  }, [played]);

  const items = [
    biggestWin && {
      label: "Maior goleada",
      value: `${tName(biggestWin.home_team_id)} ${biggestWin.home_score} × ${biggestWin.away_score} ${tName(biggestWin.away_team_id)}`,
    },
    mostGoals && {
      label: "Mais gols em uma partida",
      value: `${(mostGoals.home_score ?? 0) + (mostGoals.away_score ?? 0)} gols · ${tName(mostGoals.home_team_id)} × ${tName(mostGoals.away_team_id)}`,
    },
    streaks.win && { label: "Maior sequência de vitórias", value: `${tName(streaks.win[0])} · ${streaks.win[1].bestWin} jogos` },
    streaks.unbeaten && {
      label: "Maior sequência invicta",
      value: `${tName(streaks.unbeaten[0])} · ${streaks.unbeaten[1].bestUnbeaten} jogos`,
    },
    bestAttack && { label: "Melhor ataque", value: `${tName(bestAttack.team_id)} · ${bestAttack.goals_for} gols` },
    bestDefense && { label: "Melhor defesa", value: `${tName(bestDefense.team_id)} · ${bestDefense.goals_against} sofridos` },
    table[0] && { label: "Maior pontuação", value: `${tName(table[0].team_id)} · ${table[0].points} pts` },
    table[0] && { label: "Melhor aproveitamento", value: `${tName(table[0].team_id)} · ${pct(table[0])}%` },
    topScorer && {
      label: "Artilheiro da temporada",
      value: `${players.find((p) => p.id === topScorer.player_id)?.full_name ?? "Atleta"} · ${topScorer.goals} gols`,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Panel title="Recordes">
      {items.length === 0 && <EmptyState>Ainda não há partidas homologadas nesta temporada.</EmptyState>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <div key={r.label} className="rounded-md border border-border p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{r.label}</p>
            <p className="text-sm font-semibold">{r.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
