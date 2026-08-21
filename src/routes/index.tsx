import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Goal, Shield, Trophy } from "lucide-react";
import { useSeason } from "@/context/season";
import {
  formatDate,
  formatTime,
  matchesQuery,
  playersQuery,
  standingsQuery,
  sortStandings,
  teamsQuery,
  topScorersQuery,
  newsQuery,
  SEASON_STATUS,
} from "@/lib/league";
import { StandingsTable } from "@/components/site/StandingsTable";
import { TeamCrest } from "@/components/site/TeamCrest";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liga Regional — Mais que um campeonato" },
      {
        name: "description",
        content:
          "Acompanhe a Liga Regional: classificação em tempo real, próxima rodada, artilharia, clubes e ranking histórico.",
      },
      { property: "og:title", content: "Liga Regional — Mais que um campeonato" },
      {
        property: "og:description",
        content: "Classificação, jogos, artilharia e ranking histórico da Liga Regional.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { season } = useSeason();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: rows = [] } = useQuery(standingsQuery(season?.id));
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: news = [] } = useQuery(newsQuery);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const table = sortStandings(rows);
  const finished = matches.filter((m) => m.homologated);
  const upcoming = matches.filter((m) => !m.homologated);
  const nextRound = upcoming[0]?.round;
  const nextMatches = upcoming.filter((m) => m.round === nextRound).slice(0, 5);
  const lastMatch = finished[finished.length - 1];
  const topScorer = scorers[0];
  const goals = finished.reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);

  return (
    <>
      <section className="relative overflow-hidden gradient-pitch">
        <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(90deg,transparent,transparent_60px,white_60px,white_61px)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            {season ? `${season.name} · ${SEASON_STATUS[season.status] ?? season.status}` : "Temporada"}
          </span>
          <h1 className="mt-5 text-stadium text-6xl sm:text-8xl">
            Liga
            <br />
            Regional
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Mais que um campeonato. Uma competição que constrói história.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/classificacao">
                Ver campeonato <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/sobre">Conheça a Liga</Link>
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Shield} label="Clubes" value={rows.length || teams.length} />
            <Stat icon={CalendarDays} label="Jogos realizados" value={finished.length} />
            <Stat icon={Goal} label="Gols na temporada" value={goals} />
            <Stat
              icon={Trophy}
              label="Líder"
              value={teamMap.get(table[0]?.team_id ?? "")?.short_name ?? "—"}
            />
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle title="Classificação" href="/classificacao" cta="Tabela completa" />
          <StandingsTable rows={table} teams={teamMap} compact limit={6} />

          <div className="mt-10">
            <SectionTitle title="Notícias" href="/noticias" cta="Todas" />
            <div className="grid gap-4 sm:grid-cols-2">
              {news.slice(0, 2).map((n) => (
                <article key={n.id} className="surface-card p-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    {n.category}
                  </span>
                  <h3 className="mt-2 text-xl font-bold leading-tight">{n.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.subtitle ?? n.content}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <SectionTitle title={`Rodada ${nextRound ?? "—"}`} href="/jogos" cta="Todos os jogos" />
            <div className="space-y-2">
              {nextMatches.map((m) => (
                <Link
                  key={m.id}
                  to="/jogos/$matchId"
                  params={{ matchId: m.id }}
                  className="flex items-center gap-3 surface-card px-3 py-3 transition-colors hover:bg-secondary/60"
                >
                  <TeamCrest size="sm" short={teamMap.get(m.home_team_id)?.short_name} />
                  <span className="flex-1 text-sm font-semibold">
                    {teamMap.get(m.home_team_id)?.short_name} × {teamMap.get(m.away_team_id)?.short_name}
                  </span>
                  <span className="text-right text-[11px] text-muted-foreground">
                    {formatDate(m.match_date)}
                    <br />
                    {formatTime(m.kickoff)}
                  </span>
                </Link>
              ))}
              {nextMatches.length === 0 && (
                <p className="surface-card p-4 text-sm text-muted-foreground">Sem jogos agendados.</p>
              )}
            </div>
          </div>

          {lastMatch && (
            <div>
              <SectionTitle title="Último resultado" href="/jogos" cta="Resultados" />
              <Link
                to="/jogos/$matchId"
                params={{ matchId: lastMatch.id }}
                className="block surface-card p-5 text-center transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex-1 font-display text-lg font-bold">
                    {teamMap.get(lastMatch.home_team_id)?.short_name}
                  </span>
                  <span className="num-tabular font-display text-3xl font-extrabold text-primary">
                    {lastMatch.home_score} — {lastMatch.away_score}
                  </span>
                  <span className="flex-1 font-display text-lg font-bold">
                    {teamMap.get(lastMatch.away_team_id)?.short_name}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Rodada {lastMatch.round}</p>
              </Link>
            </div>
          )}

          {topScorer && (
            <div>
              <SectionTitle title="Artilheiro" href="/artilharia" cta="Artilharia" />
              <div className="surface-card flex items-center gap-4 p-5">
                <TeamCrest size="lg" short={teamMap.get(topScorer.team_id)?.short_name} />
                <div>
                  <p className="font-display text-2xl font-extrabold uppercase">
                    {playerMap.get(topScorer.player_id)?.nickname ??
                      playerMap.get(topScorer.player_id)?.full_name ??
                      "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">{teamMap.get(topScorer.team_id)?.name}</p>
                  <p className="mt-1 text-primary">
                    <span className="font-display text-3xl font-extrabold">{topScorer.goals}</span> gols
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string | number;
}) {
  return (
    <div className="surface-card p-4">
      <Icon className="h-4 w-4 text-primary" />
      <dd className="mt-2 num-tabular font-display text-4xl font-extrabold">{value}</dd>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
    </div>
  );
}

function SectionTitle({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-stadium text-2xl">{title}</h2>
      <Link to={href} className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline">
        {cta}
      </Link>
    </div>
  );
}
