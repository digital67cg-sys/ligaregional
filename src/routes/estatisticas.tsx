import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import { matchesQuery, pct, sortStandings, standingsQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas — Liga Regional" },
      { name: "description", content: "Melhores ataques, defesas, aproveitamento e números gerais da Liga Regional." },
      { property: "og:title", content: "Estatísticas — Liga Regional" },
      { property: "og:description", content: "Ataques, defesas e médias da competição." },
    ],
  }),
  component: Estatisticas,
});

function Estatisticas() {
  const { season } = useSeason();
  const { data: rows = [] } = useQuery(standingsQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const played = matches.filter((m) => m.homologated);
  const goals = played.reduce((s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0);

  const lists: Array<[string, typeof rows, (r: (typeof rows)[number]) => number | string]> = [
    ["Melhores ataques", [...rows].sort((a, b) => b.goals_for - a.goals_for).slice(0, 5), (r) => r.goals_for],
    ["Melhores defesas", [...rows].sort((a, b) => a.goals_against - b.goals_against).slice(0, 5), (r) => r.goals_against],
    ["Melhor aproveitamento", sortStandings(rows).slice(0, 5), (r) => `${pct(r)}%`],
    ["Mais vitórias", [...rows].sort((a, b) => b.wins - a.wins).slice(0, 5), (r) => r.wins],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Estatísticas" subtitle={season?.name ?? "Temporada atual"} />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Jogos realizados", played.length],
          ["Gols", goals],
          ["Média gols/jogo", played.length ? (goals / played.length).toFixed(2) : "0.00"],
          ["Clubes", rows.length],
        ].map(([label, value]) => (
          <div key={label as string} className="surface-card p-4">
            <p className="num-tabular font-display text-3xl font-extrabold text-primary">{value}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map(([title, list, value]) => (
          <section key={title} className="surface-card p-5">
            <h2 className="mb-3 text-stadium text-xl">{title}</h2>
            <div className="space-y-1.5">
              {list.map((r, i) => (
                <div key={r.team_id} className="flex items-center gap-3 text-sm">
                  <span className="num-tabular w-5 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate">{teamMap.get(r.team_id)?.name}</span>
                  <span className="num-tabular font-display text-lg font-bold text-primary">{value(r)}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
