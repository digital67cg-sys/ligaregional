import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSeason } from "@/context/season";
import { sortStandings, standingsQuery, teamsQuery } from "@/lib/league";
import { StandingsTable } from "@/components/site/StandingsTable";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/classificacao")({
  head: () => ({
    meta: [
      { title: "Classificação — Liga Regional" },
      { name: "description", content: "Tabela de classificação atualizada da Liga Regional em pontos corridos." },
      { property: "og:title", content: "Classificação — Liga Regional" },
      { property: "og:description", content: "Pontos, jogos, saldo e aproveitamento de todos os clubes." },
    ],
  }),
  component: Classificacao,
});

function Classificacao() {
  const { season } = useSeason();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: rows = [] } = useQuery(standingsQuery(season?.id));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Classificação"
        subtitle={`${season?.name ?? "Temporada"} · atualizada automaticamente após a homologação de cada resultado`}
      />
      <StandingsTable rows={sortStandings(rows)} teams={teamMap} />
      <p className="mt-4 text-xs text-muted-foreground">
        Critérios de desempate: pontos, vitórias, saldo de gols, gols marcados, confronto direto, disciplina e
        sorteio — configuráveis pela administração da Liga.
      </p>
    </div>
  );
}
