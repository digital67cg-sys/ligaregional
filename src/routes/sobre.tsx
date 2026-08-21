import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { leagueSettingsQuery, refereesQuery, sponsorsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Liga Regional" },
      { name: "description", content: "História, missão, arbitragem e parceiros da Liga Regional." },
      { property: "og:title", content: "Sobre a Liga Regional" },
      { property: "og:description", content: "Conheça a organização por trás da competição." },
    ],
  }),
  component: Sobre,
});

function Sobre() {
  const { data: settings } = useQuery(leagueSettingsQuery);
  const { data: sponsors = [] } = useQuery(sponsorsQuery);
  const { data: referees = [] } = useQuery(refereesQuery);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader title="Sobre a Liga" subtitle={settings?.tagline ?? "Mais que um campeonato."} />

      <div className="surface-card space-y-4 p-6 text-sm leading-relaxed">
        <p>
          A {settings?.league_name ?? "Liga Regional"} é uma competição regional disputada em pontos corridos, com
          turno e returno, criada para dar estrutura profissional ao futebol amador da região.
        </p>
        <p>
          A organização cuida do calendário, da arbitragem, da homologação de resultados, do registro de atletas e
          das transferências — enquanto os clubes negociam entre si data, horário e local de cada partida dentro das
          janelas oficiais.
        </p>
        <p>
          Cada temporada gera pontuação para o ranking histórico de clubes, que reconhece a constância dos times ao
          longo dos anos.
        </p>
      </div>

      <h2 className="mt-10 text-stadium text-2xl">Arbitragem</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {referees.map((r) => (
          <div key={r.id} className="surface-card flex items-center justify-between p-4 text-sm">
            <span className="font-semibold">{r.name}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.role}</span>
          </div>
        ))}
        {referees.length === 0 && (
          <p className="surface-card p-4 text-sm text-muted-foreground">Quadro de arbitragem em formação.</p>
        )}
      </div>

      {sponsors.length > 0 && (
        <>
          <h2 className="mt-10 text-stadium text-2xl">Parceiros</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {sponsors.map((s) => (
              <span key={s.id} className="surface-card px-4 py-2 text-sm font-semibold">
                {s.name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
