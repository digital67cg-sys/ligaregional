import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, CalendarDays } from "lucide-react";
import { useSeason } from "@/context/season";
import {
  formatDate,
  formatTime,
  matchEventsQuery,
  matchesQuery,
  playersQuery,
  teamsQuery,
  MATCH_STATUS,
} from "@/lib/league";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/jogos/$matchId")({
  head: () => ({
    meta: [
      { title: "Detalhes da partida — Liga Regional" },
      { name: "description", content: "Escalação, gols, cartões, local e horário da partida." },
      { property: "og:title", content: "Detalhes da partida — Liga Regional" },
      { property: "og:description", content: "Ficha completa do jogo da Liga Regional." },
    ],
  }),
  component: MatchDetail,
});

const EVENT_LABEL: Record<string, string> = {
  goal: "Gol",
  own_goal: "Gol contra",
  yellow_card: "Cartão amarelo",
  red_card: "Cartão vermelho",
};

function MatchDetail() {
  const { matchId } = Route.useParams();
  const { season } = useSeason();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: events = [] } = useQuery(matchEventsQuery(matchId));

  const match = matches.find((m) => m.id === matchId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const playerMap = new Map(players.map((p) => [p.id, p]));

  if (!match) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Carregando partida…
      </div>
    );
  }

  const home = teamMap.get(match.home_team_id);
  const away = teamMap.get(match.away_team_id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/jogos" className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline">
        ← Voltar aos jogos
      </Link>

      <div className="mt-4 surface-card p-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Rodada {match.round} · {MATCH_STATUS[match.status] ?? match.status}
        </p>
        <div className="mt-5 grid grid-cols-3 items-center gap-3">
          <Link
            to="/clubes/$teamId"
            params={{ teamId: match.home_team_id }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <TeamCrest size="lg" short={home?.short_name} />
            <span className="font-display text-lg font-bold uppercase">{home?.name}</span>
          </Link>
          <div className="text-center">
            {match.homologated ? (
              <span className="num-tabular font-display text-5xl font-extrabold text-primary">
                {match.home_score}-{match.away_score}
              </span>
            ) : (
              <span className="font-display text-3xl font-extrabold text-muted-foreground">×</span>
            )}
          </div>
          <Link
            to="/clubes/$teamId"
            params={{ teamId: match.away_team_id }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <TeamCrest size="lg" short={away?.short_name} />
            <span className="font-display text-lg font-bold uppercase">{away?.name}</span>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Info icon={CalendarDays} label="Data" value={formatDate(match.match_date)} />
        <Info icon={Clock} label="Horário" value={formatTime(match.kickoff)} />
        <Info icon={MapPin} label="Local" value={match.venue ?? "A definir"} />
      </div>
      {match.address && <p className="mt-2 text-xs text-muted-foreground">Endereço: {match.address}</p>}

      <h2 className="mt-8 text-stadium text-2xl">Súmula</h2>
      <div className="mt-3 space-y-2">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 surface-card px-4 py-2.5 text-sm">
            <span className="num-tabular w-10 font-display text-lg font-bold text-primary">
              {e.minute ?? "—"}'
            </span>
            <span className="flex-1 font-semibold">
              {playerMap.get(e.player_id ?? "")?.nickname ??
                playerMap.get(e.player_id ?? "")?.full_name ??
                "—"}
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {EVENT_LABEL[e.type] ?? e.type} · {teamMap.get(e.team_id ?? "")?.short_name}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="surface-card p-4 text-sm text-muted-foreground">
            Nenhum evento registrado para esta partida.
          </p>
        )}
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
