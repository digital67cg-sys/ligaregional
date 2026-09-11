import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import { clubRankingQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de clubes — Liga Regional" },
      { name: "description", content: "Ranking da competição selecionada." },
    ],
  }),
  component: Ranking,
});

function Ranking() {
  const { season } = useSeason();
  const { data: ranking = [] } = useQuery(clubRankingQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const totals = new Map<string, number>();

  for (const row of ranking) {
    totals.set(row.team_id, (totals.get(row.team_id) ?? 0) + Number(row.points));
  }

  const list = [...totals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Ranking de clubes" subtitle={`${season?.name ?? "Temporada atual"} · pontuação isolada por season_id`} />
      <div className="space-y-2">
        {list.map(([teamId, points], index) => (
          <Link key={teamId} to="/clubes/$teamId" params={{ teamId }} className="flex items-center gap-4 surface-card px-4 py-3 transition-colors hover:bg-secondary/60">
            <span className="num-tabular w-6 font-display text-xl font-extrabold text-muted-foreground">{index + 1}</span>
            <TeamCrest size="md" short={teamMap.get(teamId)?.short_name} crest={teamMap.get(teamId)?.crest_url} />
            <span className="flex-1 truncate font-semibold">{teamMap.get(teamId)?.name ?? "Clube"}</span>
            <span className="num-tabular font-display text-2xl font-extrabold text-primary">{points}</span>
          </Link>
        ))}
        {list.length === 0 && <p className="surface-card p-4 text-sm text-muted-foreground">Ranking ainda não pontuado para esta competição.</p>}
      </div>
    </div>
  );
}