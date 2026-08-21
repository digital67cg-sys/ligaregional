import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { clubRankingQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de clubes — Liga Regional" },
      { name: "description", content: "Ranking histórico de pontos acumulados pelos clubes da Liga Regional." },
      { property: "og:title", content: "Ranking de clubes — Liga Regional" },
      { property: "og:description", content: "Pontuação histórica acumulada temporada a temporada." },
    ],
  }),
  component: Ranking,
});

function Ranking() {
  const { data: ranking = [] } = useQuery(clubRankingQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const totals = new Map<string, number>();
  for (const r of ranking) totals.set(r.team_id, (totals.get(r.team_id) ?? 0) + Number(r.points));
  const list = [...totals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Ranking de clubes"
        subtitle="Pontuação histórica acumulada por participação e desempenho nas temporadas da Liga."
      />
      <div className="space-y-2">
        {list.map(([teamId, points], i) => (
          <Link
            key={teamId}
            to="/clubes/$teamId"
            params={{ teamId }}
            className="flex items-center gap-4 surface-card px-4 py-3 transition-colors hover:bg-secondary/60"
          >
            <span className="num-tabular w-6 font-display text-xl font-extrabold text-muted-foreground">{i + 1}</span>
            <TeamCrest size="md" short={teamMap.get(teamId)?.short_name} crest={teamMap.get(teamId)?.crest_url} />
            <span className="flex-1 truncate font-semibold">{teamMap.get(teamId)?.name}</span>
            <span className="num-tabular font-display text-2xl font-extrabold text-primary">{points}</span>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="surface-card p-4 text-sm text-muted-foreground">Ranking ainda não pontuado.</p>
        )}
      </div>
    </div>
  );
}
