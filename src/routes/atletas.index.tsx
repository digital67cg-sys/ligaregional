import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { playersQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/atletas/")({
  head: () => ({
    meta: [
      { title: "Atletas — Liga Regional" },
      { name: "description", content: "Busque atletas registrados na Liga Regional por nome, clube ou posição." },
      { property: "og:title", content: "Atletas — Liga Regional" },
      { property: "og:description", content: "Base de atletas registrados na competição." },
    ],
  }),
  component: Atletas,
});

function Atletas() {
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const [q, setQ] = useState("");

  const list = players.filter((p) =>
    `${p.full_name} ${p.nickname ?? ""} ${teamMap.get(p.current_team_id ?? "")?.name ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Atletas" subtitle={`${players.length} atletas registrados na Liga`} />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por atleta ou clube…"
        className="mb-5 max-w-md"
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <Link
            key={p.id}
            to="/atletas/$playerId"
            params={{ playerId: p.id }}
            className="flex items-center gap-3 surface-card p-3 transition-colors hover:bg-secondary/60"
          >
            <TeamCrest size="md" short={teamMap.get(p.current_team_id ?? "")?.short_name} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.nickname ?? p.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {p.position ?? "—"} · {teamMap.get(p.current_team_id ?? "")?.name ?? "Sem clube"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
