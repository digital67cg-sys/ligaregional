import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import { formatDate, formatTime, matchesQuery, teamsQuery, MATCH_STATUS } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogos/")({
  head: () => ({
    meta: [
      { title: "Jogos e resultados — Liga Regional" },
      { name: "description", content: "Tabela de jogos, rodadas e resultados da Liga Regional." },
      { property: "og:title", content: "Jogos e resultados — Liga Regional" },
      { property: "og:description", content: "Todas as rodadas do turno e returno da competição." },
    ],
  }),
  component: Jogos,
});

function Jogos() {
  const { season } = useSeason();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const [filter, setFilter] = useState<"all" | "next" | "results">("all");

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const visible = matches.filter((m) =>
    filter === "results" ? m.homologated : filter === "next" ? !m.homologated : true,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Jogos"
        subtitle="Os clubes organizam seus jogos: o mandante propõe data, horário e local; o visitante confirma."
      />

      <div className="mb-6 flex gap-2">
        {(
          [
            ["all", "Todos"],
            ["next", "Próximos"],
            ["results", "Resultados"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              filter === key ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {rounds.map((round) => {
          const list = visible.filter((m) => m.round === round);
          if (!list.length) return null;
          return (
            <section key={round}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Rodada {round} {round > (rounds.length / 2) ? "· returno" : "· turno"}
              </h2>
              <div className="space-y-2">
                {list.map((m) => (
                  <Link
                    key={m.id}
                    to="/jogos/$matchId"
                    params={{ matchId: m.id }}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 surface-card px-3 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <div className="flex items-center justify-end gap-2 text-right">
                      <span className="truncate text-sm font-semibold">{teamMap.get(m.home_team_id)?.name}</span>
                      <TeamCrest size="sm" short={teamMap.get(m.home_team_id)?.short_name} />
                    </div>
                    <div className="min-w-24 text-center">
                      {m.homologated ? (
                        <span className="num-tabular font-display text-2xl font-extrabold text-primary">
                          {m.home_score} — {m.away_score}
                        </span>
                      ) : (
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDate(m.match_date)} · {formatTime(m.kickoff)}
                        </span>
                      )}
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {MATCH_STATUS[m.status] ?? m.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TeamCrest size="sm" short={teamMap.get(m.away_team_id)?.short_name} />
                      <span className="truncate text-sm font-semibold">{teamMap.get(m.away_team_id)?.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
