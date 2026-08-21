import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import {
  clubRankingQuery,
  formatDate,
  formatTime,
  matchesQuery,
  playersQuery,
  sortStandings,
  standingsQuery,
  teamsQuery,
  topScorersQuery,
  pct,
} from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/clubes/$teamId")({
  head: () => ({
    meta: [
      { title: "Perfil do clube — Liga Regional" },
      { name: "description", content: "Elenco, campanha, jogos e estatísticas do clube na Liga Regional." },
      { property: "og:title", content: "Perfil do clube — Liga Regional" },
      { property: "og:description", content: "Elenco, campanha e histórico do clube." },
    ],
  }),
  component: TeamProfile,
});

function TeamProfile() {
  const { teamId } = Route.useParams();
  const { season } = useSeason();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: rows = [] } = useQuery(standingsQuery(season?.id));
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: ranking = [] } = useQuery(clubRankingQuery);

  const team = teams.find((t) => t.id === teamId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const table = sortStandings(rows);
  const row = table.find((r) => r.team_id === teamId);
  const position = table.findIndex((r) => r.team_id === teamId) + 1;
  const squad = players.filter((p) => p.current_team_id === teamId);
  const teamMatches = matches.filter((m) => m.home_team_id === teamId || m.away_team_id === teamId);
  const teamScorers = scorers.filter((s) => s.team_id === teamId);
  const history = ranking.filter((r) => r.team_id === teamId);

  if (!team) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Carregando clube…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-5">
        <TeamCrest size="xl" short={team.short_name} crest={team.crest_url} />
        <div>
          <h1 className="text-stadium text-4xl sm:text-5xl">{team.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[team.city, team.district, team.founded_year ? `fundado em ${team.founded_year}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {row && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {[
            ["Posição", `${position}º`],
            ["Pontos", row.points],
            ["Jogos", row.played],
            ["V-E-D", `${row.wins}-${row.draws}-${row.losses}`],
            ["Saldo", row.goal_diff],
            ["Aproveit.", `${pct(row)}%`],
          ].map(([label, value]) => (
            <div key={label as string} className="surface-card p-3 text-center">
              <p className="num-tabular font-display text-2xl font-extrabold">{value}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <PageHeader title="Elenco" subtitle={`${squad.length} atletas registrados`} />
          <div className="space-y-2">
            {squad.map((p) => (
              <Link
                key={p.id}
                to="/atletas/$playerId"
                params={{ playerId: p.id }}
                className="flex items-center gap-3 surface-card px-4 py-2.5 transition-colors hover:bg-secondary/60"
              >
                <span className="num-tabular w-8 font-display text-xl font-extrabold text-primary">
                  {p.shirt_number ?? "—"}
                </span>
                <span className="flex-1 text-sm font-semibold">{p.nickname ?? p.full_name}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.position ?? ""}</span>
              </Link>
            ))}
            {squad.length === 0 && (
              <p className="surface-card p-4 text-sm text-muted-foreground">Nenhum atleta registrado.</p>
            )}
          </div>

          {teamScorers.length > 0 && (
            <>
              <h3 className="mt-8 mb-2 text-stadium text-xl">Artilheiros do clube</h3>
              <div className="space-y-2">
                {teamScorers.map((s) => (
                  <div key={s.player_id} className="flex items-center justify-between surface-card px-4 py-2 text-sm">
                    <span>{players.find((p) => p.id === s.player_id)?.nickname ?? "—"}</span>
                    <span className="font-display text-lg font-extrabold text-primary">{s.goals}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <PageHeader title="Campanha" subtitle="Jogos do clube na temporada" />
          <div className="space-y-2">
            {teamMatches.map((m) => {
              const isHome = m.home_team_id === teamId;
              const opponent = teamMap.get(isHome ? m.away_team_id : m.home_team_id);
              return (
                <Link
                  key={m.id}
                  to="/jogos/$matchId"
                  params={{ matchId: m.id }}
                  className="flex items-center gap-3 surface-card px-4 py-2.5 text-sm transition-colors hover:bg-secondary/60"
                >
                  <span className="w-10 text-[11px] uppercase text-muted-foreground">R{m.round}</span>
                  <span className="flex-1 font-semibold">
                    {isHome ? "vs" : "@"} {opponent?.short_name}
                  </span>
                  <span className="num-tabular font-display text-base font-bold text-primary">
                    {m.homologated
                      ? `${m.home_score}-${m.away_score}`
                      : `${formatDate(m.match_date)} ${formatTime(m.kickoff)}`}
                  </span>
                </Link>
              );
            })}
          </div>

          {history.length > 0 && (
            <>
              <h3 className="mt-8 mb-2 text-stadium text-xl">Histórico</h3>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between surface-card px-4 py-2 text-sm">
                    <span>{h.achievement ?? `${h.position}º lugar`}</span>
                    <span className="font-display font-bold text-primary">{h.points} pts</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
