import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useSeason } from "@/context/season";
import { competitionGroupTeamsQuery, competitionGroupsQuery, competitionKnockoutStagesQuery, competitionQualifiedTeamsQuery, matchesQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";

export function RegionalCup() {
  const { season } = useSeason();
  const { data: groups = [] } = useQuery(competitionGroupsQuery(season?.id));
  const { data: groupTeams = [] } = useQuery(competitionGroupTeamsQuery(season?.id));
  const { data: qualified = [] } = useQuery(competitionQualifiedTeamsQuery(season?.id));
  const { data: stages = [] } = useQuery(competitionKnockoutStagesQuery(season?.id));
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const groupTables = useMemo(() => groups.map((group) => {
    const ids = groupTeams.filter((item) => item.group_id === group.id).map((item) => item.team_id);
    const rows = ids.map((teamId) => {
      const stats = { teamId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      matches.filter((match) => match.group_id === group.id && match.homologated && (match.home_team_id === teamId || match.away_team_id === teamId)).forEach((match) => {
        const home = match.home_team_id === teamId;
        const goalsFor = home ? match.home_score ?? 0 : match.away_score ?? 0;
        const goalsAgainst = home ? match.away_score ?? 0 : match.home_score ?? 0;
        stats.played += 1;
        stats.goalsFor += goalsFor;
        stats.goalsAgainst += goalsAgainst;
        if (goalsFor > goalsAgainst) { stats.wins += 1; stats.points += 3; }
        else if (goalsFor === goalsAgainst) { stats.draws += 1; stats.points += 1; }
        else stats.losses += 1;
      });
      return stats;
    }).sort((a, b) => b.points - a.points || b.wins - a.wins || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
    return { group, rows };
  }), [groups, groupTeams, matches]);

  const knockoutMatches = matches.filter((match) => match.stage === "mata_mata").sort((a, b) => (a.knockout_round ?? "").localeCompare(b.knockout_round ?? "") || (a.bracket_position ?? 0) - (b.bracket_position ?? 0));
  const stageName = (value: string | null | undefined) => stages.find((stage) => stage.stage_type === value || stage.name === value)?.name ?? value ?? "Mata-mata";

  if (season?.competition_type !== "grupos_mata_mata") return <div className="mx-auto max-w-4xl px-4 py-16"><div className="surface-card p-8 text-center"><Trophy className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 text-2xl font-bold">Taça Regional</h1><p className="mt-2 text-muted-foreground">A temporada selecionada não utiliza o formato grupos e mata-mata.</p></div></div>;

  return <div className="mx-auto max-w-7xl px-4 py-10">
    <PageHeader title="Taça Regional" subtitle={`${season.name} · grupos e mata-mata`} />
    <div className="space-y-10">
      <section><div className="mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /><h2 className="text-stadium text-3xl">Fase de grupos</h2></div>
        <div className="grid gap-5 md:grid-cols-2">{groupTables.map(({ group, rows }) => <div key={group.id} className="surface-card overflow-hidden"><div className="border-b border-border bg-secondary/50 px-4 py-3"><h3 className="font-display text-xl font-bold uppercase">{group.name}</h3></div><div className="divide-y divide-border">{rows.map((row, index) => <div key={row.teamId} className="grid grid-cols-[2rem_1fr_repeat(3,2rem)] items-center gap-2 px-4 py-3 text-sm"><span className="font-bold text-muted-foreground">{index + 1}</span><Link to="/clubes/$teamId" params={{ teamId: row.teamId }} className="flex min-w-0 items-center gap-2 font-semibold hover:text-primary"><TeamCrest size="sm" short={teamMap.get(row.teamId)?.short_name} /><span className="truncate">{teamMap.get(row.teamId)?.name ?? "Clube"}</span></Link><span className="text-right text-muted-foreground">{row.played}</span><span className="text-right text-muted-foreground">{row.goalsFor - row.goalsAgainst}</span><span className="text-right font-bold">{row.points}</span></div>)}{rows.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Clubes ainda não definidos.</p>}</div></div>)}</div>
      </section>
      <section><h2 className="mb-4 text-stadium text-3xl">Chaveamento</h2>{knockoutMatches.length === 0 ? <div className="surface-card p-6 text-sm text-muted-foreground">As partidas do mata-mata ainda não foram geradas.</div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[...new Set(knockoutMatches.map((match) => match.knockout_round ?? "mata_mata"))].map((round) => <div key={round} className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{stageName(round)}</h3>{knockoutMatches.filter((match) => (match.knockout_round ?? "mata_mata") === round).map((match) => <Link key={match.id} to="/jogos/$matchId" params={{ matchId: match.id }} className="block surface-card p-3 transition-colors hover:bg-secondary/60"><div className="flex items-center justify-between text-sm"><span>{teamMap.get(match.home_team_id)?.short_name ?? "A definir"}</span><strong>{match.homologated ? match.home_score : "-"}</strong></div><div className="mt-2 flex items-center justify-between text-sm"><span>{teamMap.get(match.away_team_id)?.short_name ?? "A definir"}</span><strong>{match.homologated ? match.away_score : "-"}</strong></div><p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{match.winner_id ? `Vencedor: ${teamMap.get(match.winner_id)?.short_name ?? "definido"}` : "Aguardando resultado"}</p></Link>)}</div>)}</div>}</section>
      <section><h2 className="mb-4 text-stadium text-3xl">Classificados</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{qualified.map((item) => <div key={item.id} className="surface-card flex items-center gap-3 p-4"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{item.qualification_position}</span><TeamCrest size="sm" short={teamMap.get(item.team_id)?.short_name} /><span className="text-sm font-semibold">{teamMap.get(item.team_id)?.name ?? "Clube"}</span></div>)}{qualified.length === 0 && <p className="text-sm text-muted-foreground">Nenhum classificado registrado.</p>}</div></section>
    </div>
  </div>;
}