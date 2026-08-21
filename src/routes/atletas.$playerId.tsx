import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { playerEventsQuery, playersQuery, teamsQuery } from "@/lib/league";
import { TeamCrest } from "@/components/site/TeamCrest";

export const Route = createFileRoute("/atletas/$playerId")({
  head: () => ({
    meta: [
      { title: "Perfil do atleta — Liga Regional" },
      { name: "description", content: "Estatísticas, clube e histórico do atleta na Liga Regional." },
      { property: "og:title", content: "Perfil do atleta — Liga Regional" },
      { property: "og:description", content: "Gols, cartões e informações do atleta." },
    ],
  }),
  component: PlayerProfile,
});

function PlayerProfile() {
  const { playerId } = Route.useParams();
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: events = [] } = useQuery(playerEventsQuery(playerId));

  const player = players.find((p) => p.id === playerId);
  const team = teams.find((t) => t.id === player?.current_team_id);

  if (!player) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Carregando atleta…</div>;
  }

  const goals = events.filter((e) => e.type === "goal").length;
  const yellow = events.filter((e) => e.type === "yellow_card").length;
  const red = events.filter((e) => e.type === "red_card").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="surface-card flex flex-wrap items-center gap-5 p-6">
        <TeamCrest size="xl" short={team?.short_name} crest={team?.crest_url} />
        <div>
          <h1 className="text-stadium text-4xl">{player.nickname ?? player.full_name}</h1>
          <p className="text-sm text-muted-foreground">{player.full_name}</p>
          <p className="mt-1 text-sm">
            {player.position ?? "—"} · camisa {player.shirt_number ?? "—"}
          </p>
          {team && (
            <Link
              to="/clubes/$teamId"
              params={{ teamId: team.id }}
              className="mt-1 inline-block text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
            >
              {team.name}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Gols", goals],
          ["Amarelos", yellow],
          ["Vermelhos", red],
        ].map(([label, value]) => (
          <div key={label as string} className="surface-card p-4 text-center">
            <p className="num-tabular font-display text-3xl font-extrabold text-primary">{value}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
