import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import { playersQuery, sortStandings, standingsQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/clubes/")({
  head: () => ({
    meta: [
      { title: "Clubes — Liga Regional" },
      { name: "description", content: "Conheça os clubes participantes da Liga Regional, elencos e cidades." },
      { property: "og:title", content: "Clubes — Liga Regional" },
      { property: "og:description", content: "Todos os clubes filiados e suas informações." },
    ],
  }),
  component: Clubes,
});

function Clubes() {
  const { season } = useSeason();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: rows = [] } = useQuery(standingsQuery(season?.id));
  const table = sortStandings(rows);
  const posOf = (id: string) => table.findIndex((r) => r.team_id === id) + 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader title="Clubes" subtitle={`${teams.length} clubes filiados à Liga Regional`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <Link
            key={t.id}
            to="/clubes/$teamId"
            params={{ teamId: t.id }}
            className="surface-card flex items-center gap-4 p-4 transition-colors hover:bg-secondary/60"
          >
            <TeamCrest size="lg" short={t.short_name} crest={t.crest_url} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold uppercase">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.city ?? "—"} · {players.filter((p) => p.current_team_id === t.id).length} atletas
              </p>
              {posOf(t.id) > 0 && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {posOf(t.id)}º na tabela
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
