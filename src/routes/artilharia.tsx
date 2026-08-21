import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import { playersQuery, teamsQuery, topScorersQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/artilharia")({
  head: () => ({
    meta: [
      { title: "Artilharia — Liga Regional" },
      { name: "description", content: "Ranking de artilheiros da temporada da Liga Regional." },
      { property: "og:title", content: "Artilharia — Liga Regional" },
      { property: "og:description", content: "Quem mais balança as redes na competição." },
    ],
  }),
  component: Artilharia,
});

function Artilharia() {
  const { season } = useSeason();
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Artilharia" subtitle={season?.name ?? "Temporada atual"} />
      <div className="space-y-2">
        {scorers.map((s, i) => (
          <Link
            key={s.player_id}
            to="/atletas/$playerId"
            params={{ playerId: s.player_id }}
            className="flex items-center gap-4 surface-card px-4 py-3 transition-colors hover:bg-secondary/60"
          >
            <span className="num-tabular w-6 font-display text-xl font-extrabold text-muted-foreground">{i + 1}</span>
            <TeamCrest size="md" short={teamMap.get(s.team_id)?.short_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {playerMap.get(s.player_id)?.nickname ?? playerMap.get(s.player_id)?.full_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{teamMap.get(s.team_id)?.name}</p>
            </div>
            <span className="num-tabular font-display text-3xl font-extrabold text-primary">{s.goals}</span>
          </Link>
        ))}
        {scorers.length === 0 && (
          <p className="surface-card p-4 text-sm text-muted-foreground">Nenhum gol registrado ainda.</p>
        )}
      </div>
    </div>
  );
}
