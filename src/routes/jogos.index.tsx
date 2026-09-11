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
      { name: "description", content: "Jogos e resultados da competição selecionada." },
    ],
  }),
  component: Jogos,
});

function Jogos() {
  const { season } = useSeason();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const [filter, setFilter] = useState<"all" | "next" | "results">("all");
  const isCup = season?.competition_type === "grupos_mata_mata";
  const visible = matches.filter((match) =>
    filter === "results" ? match.homologated : filter === "next" ? !match.homologated : true,
  );

  const renderMatch = (match: (typeof matches)[number]) => (
    <Link
      key={match.id}
      to="/jogos/$matchId"
      params={{ matchId: match.id }}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 surface-card px-3 py-3 transition-colors hover:bg-secondary/60"
    >
      <div className="flex items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-semibold">{teamMap.get(match.home_team_id)?.name ?? "A definir"}</span>
        <TeamCrest size="sm" short={teamMap.get(match.home_team_id)?.short_name} />
      </div>
      <div className="min-w-24 text-center">
        {match.homologated ? (
          <span className="num-tabular font-display text-2xl font-extrabold text-primary">{match.home_score} — {match.away_score}</span>
        ) : (
          <span className="block text-[11px] text-muted-foreground">{formatDate(match.match_date)} · {formatTime(match.kickoff)}</span>
        )}
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{MATCH_STATUS[match.status] ?? match.status}</span>
      </div>
      <div className="flex items-center gap-2">
        <TeamCrest size="sm" short={teamMap.get(match.away_team_id)?.short_name} />
        <span className="truncate text-sm font-semibold">{teamMap.get(match.away_team_id)?.name ?? "A definir"}</span>
      </div>
    </Link>
  );

  const rounds = [...new Set(visible.map((match) => match.round))].sort((a, b) => a - b);
  const cupGroups = [...new Set(visible.filter((match) => match.stage !== "mata_mata").map((match) => match.group_id ?? "sem-grupo"))];
  const cupRounds = [...new Set(visible.filter((match) => match.stage === "mata_mata").map((match) => match.knockout_round ?? "mata_mata"))];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader title="Jogos" subtitle={isCup ? `${season?.name ?? "Taça Regional"} · fase de grupos e mata-mata` : "Jogos, rodadas e resultados da competição selecionada."} />
      <div className="mb-6 flex flex-wrap gap-2">
        {([["all", "Todos"], ["next", "Próximos"], ["results", "Resultados"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={cn("rounded-full border border-border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors", filter === key ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground")}>{label}</button>
        ))}
      </div>

      {isCup ? (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-stadium text-3xl">Fase de grupos</h2>
            <div className="space-y-6">
              {cupGroups.map((groupId) => (
                <div key={groupId}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">{groupId === "sem-grupo" ? "Grupo a definir" : "Grupo"}</h3>
                  <div className="space-y-2">{visible.filter((match) => match.stage !== "mata_mata" && (match.group_id ?? "sem-grupo") === groupId).map(renderMatch)}</div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-stadium text-3xl">Mata-mata</h2>
            <div className="space-y-6">
              {cupRounds.map((round) => (
                <div key={round}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">{round.replaceAll("_", " ")}</h3>
                  <div className="space-y-2">{visible.filter((match) => match.stage === "mata_mata" && (match.knockout_round ?? "mata_mata") === round).map(renderMatch)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          {rounds.map((round) => {
            const list = visible.filter((match) => match.round === round);
            return <section key={round}><h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Rodada {round}</h2><div className="space-y-2">{list.map(renderMatch)}</div></section>;
          })}
        </div>
      )}
      {visible.length === 0 && <p className="surface-card p-6 text-sm text-muted-foreground">Nenhum jogo encontrado para a competição selecionada.</p>}
    </div>
  );
}