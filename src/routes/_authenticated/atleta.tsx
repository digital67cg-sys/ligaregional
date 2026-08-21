import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAccess } from "@/hooks/useAccess";
import { useSeason } from "@/context/season";
import {
  formatDate,
  formatTime,
  matchesQuery,
  playersQuery,
  playerEventsQuery,
  teamsQuery,
  topScorersQuery,
  MATCH_STATUS,
} from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";
import { requireAthlete } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/atleta")({
  beforeLoad: () => requireAthlete(),
  component: PainelAtleta,
  head: () => ({
    meta: [
      { title: "Meu Painel · Atleta · Liga Regional" },
      { name: "description", content: "Perfil, estatísticas, gols, cartões e jogos do atleta na Liga Regional." },
      { property: "og:title", content: "Meu Painel · Atleta · Liga Regional" },
      { property: "og:description", content: "Perfil, estatísticas, gols, cartões e jogos do atleta na Liga Regional." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-stadium text-3xl">{value}</p>
    </div>
  );
}

function PainelAtleta() {
  const access = useAccess();
  const { season } = useSeason();
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: events = [] } = useQuery({
    ...playerEventsQuery(access.playerId ?? ""),
    enabled: !!access.playerId,
  });

  const player = players.find((p) => p.id === access.playerId);
  const team = teams.find((t) => t.id === player?.current_team_id);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const goals = events.filter((e) => e.type === "goal").length;
  const yellow = events.filter((e) => e.type === "yellow_card").length;
  const red = events.filter((e) => e.type === "red_card").length;

  const teamMatches = matches.filter((m) => m.home_team_id === team?.id || m.away_team_id === team?.id);
  const played = teamMatches.filter((m) => m.homologated).length;
  const upcoming = teamMatches.filter((m) => !m.homologated).slice(0, 5);
  const history = teamMatches.filter((m) => m.homologated).slice(-5).reverse();

  const ranked = [...scorers].sort((a, b) => b.goals - a.goals);
  const position = ranked.findIndex((s) => s.player_id === access.playerId) + 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Meu Painel"
        subtitle={`${player?.full_name ?? "Atleta"} · Atleta · ${team?.name ?? "Sem clube"}`}
      />

      <section className="surface-card mb-8 flex flex-wrap items-center gap-4 p-5">
        {player?.photo_url ? (
          <img src={player.photo_url} alt={player.full_name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary text-stadium text-2xl">
            {player?.full_name?.slice(0, 1)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-stadium text-2xl">{player?.full_name}</p>
          <p className="text-sm text-muted-foreground">
            {player?.position ?? "Posição a definir"} · Camisa {player?.shirt_number ?? "--"}
          </p>
        </div>
        {team && (
          <Link to="/clubes/$teamId" params={{ teamId: team.id }} className="flex items-center gap-2">
            <TeamCrest team={team} className="h-10 w-10" />
            <span className="font-display font-bold uppercase">{team.short_name}</span>
          </Link>
        )}
      </section>

      <h2 className="mb-3 text-stadium text-2xl">Minhas estatísticas</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Jogos do clube" value={played} />
        <Stat label="Gols" value={goals} />
        <Stat label="Cartões" value={`${yellow}A / ${red}V`} />
        <Stat label="Média de gols" value={played ? (goals / played).toFixed(2) : "0.00"} />
      </div>

      <h2 className="mb-3 text-stadium text-2xl">Meu ranking</h2>
      <div className="surface-card mb-8 p-5 text-sm">
        {position > 0 ? (
          <p>
            Você ocupa a <strong>{position}ª posição</strong> na artilharia da temporada com {goals} gol(s).{" "}
            <Link to="/artilharia" className="text-primary underline">
              Ver artilharia
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground">Você ainda não pontuou na artilharia desta temporada.</p>
        )}
      </div>

      <h2 className="mb-3 text-stadium text-2xl">Meus jogos</h2>
      <div className="mb-8 space-y-2">
        {upcoming.map((m) => (
          <Link
            key={m.id}
            to="/jogos/$matchId"
            params={{ matchId: m.id }}
            className="surface-card flex flex-wrap items-center justify-between gap-2 p-4"
          >
            <span className="font-display font-bold uppercase">
              {teamMap.get(m.home_team_id)?.short_name} × {teamMap.get(m.away_team_id)?.short_name}
            </span>
            <span className="text-xs text-muted-foreground">
              Rodada {m.round} · {MATCH_STATUS[m.status] ?? m.status} · {formatDate(m.match_date)} {formatTime(m.kickoff)}
            </span>
          </Link>
        ))}
        {upcoming.length === 0 && <p className="surface-card p-4 text-sm text-muted-foreground">Sem jogos futuros.</p>}
      </div>

      <h2 className="mb-3 text-stadium text-2xl">Meu histórico</h2>
      <div className="space-y-2">
        {history.map((m) => (
          <div key={m.id} className="surface-card flex items-center justify-between gap-2 p-4">
            <span className="font-display font-bold uppercase">
              {teamMap.get(m.home_team_id)?.short_name} × {teamMap.get(m.away_team_id)?.short_name}
            </span>
            <span className="text-stadium text-lg">
              {m.home_score} - {m.away_score}
            </span>
          </div>
        ))}
        {history.length === 0 && <p className="surface-card p-4 text-sm text-muted-foreground">Sem partidas encerradas.</p>}
      </div>
    </div>
  );
}
