import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeason } from "@/context/season";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/guards";
import { StatCard, Panel, EmptyState } from "@/components/admin/ui";
import { db, rows } from "@/lib/admin";
import { matchesQuery, playersQuery, teamsQuery, formatDate } from "@/lib/league";
import { SeasonsSection } from "@/components/admin/seasons";
import { TeamsSection } from "@/components/admin/teams";
import { PlayersSection } from "@/components/admin/players";
import { FixtureGenerator, MatchesSection, RoundsSection } from "@/components/admin/matches";
import { StandingsSection, ScorersSection, StatsSection, RankingSection, RecordsSection } from "@/components/admin/competition";
import { NewsSection } from "@/components/admin/news";
import { AwardsSection, FeesSection, FinanceOverview } from "@/components/admin/finance";
import { RefereesSection, RequestsSection, TransfersSection, UsersSection } from "@/components/admin/people";
import { MaintenanceSection } from "@/components/admin/maintenance";
import { KnockoutSection } from "@/components/admin/knockout";
import { LogsSection, RegulationSection, SettingsSection } from "@/components/admin/misc";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => requireAdmin(),
  component: PainelAdmin,
  head: () => ({
    meta: [
      { title: "Painel Administrativo · Liga Regional" },
      { name: "description", content: "Centro de comando da Liga Regional: temporadas, tabela, súmulas, financeiro e usuários." },
      { property: "og:title", content: "Painel Administrativo · Liga Regional" },
      {
        property: "og:description",
        content: "Centro de comando da Liga Regional: temporadas, tabela, súmulas, financeiro e usuários.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const GROUPS = [
  { group: "Visão geral", items: ["Dashboard"] },
  { group: "Competição", items: ["Temporadas", "Rodadas", "Partidas", "Súmulas", "Classificação", "Taça Regional", "Estatísticas", "Artilharia", "Ranking", "Recordes"] },
  { group: "Participantes", items: ["Clubes", "Atletas", "Transferências", "Arbitragem"] },
  { group: "Financeiro", items: ["Financeiro", "Filiações", "Inscrições", "Premiação"] },
  { group: "Conteúdo", items: ["Notícias", "Regulamento"] },
  { group: "Administração", items: ["Usuários", "Solicitações", "Configurações", "Manutenção", "Logs"] },
] as const;

type Tab = (typeof GROUPS)[number]["items"][number];

function PainelAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { season, seasons, setSeasonId } = useSeason();
  const [tab, setTab] = useState<Tab>("Dashboard");

  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: () =>
      rows<{ id: string; full_name: string | null; email: string | null; status: string }>(
        db.from("profiles").select("id, full_name, email, status").order("full_name"),
      ),
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "membership_requests"],
    queryFn: () => rows<{ id: string; status: string }>(db.from("membership_requests").select("id, status")),
  });

  const pending = requests.filter((r) => r.status === "pending").length;
  const nextMatches = useMemo(
    () => matches.filter((m) => !m.homologated && m.match_date).slice(0, 6),
    [matches],
  );

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Painel Administrativo"
        subtitle={`Gerenciamento · ${season?.name ?? "Competição"}`}
        action={
          <div className="flex items-center gap-3">
            <select
              title="Selecione a competição"
              value={season?.id || ""}
              onChange={(e) => setSeasonId(e.target.value)}
              className="h-9 cursor-pointer rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {seasons.map((s) => {
                const yearVal = (s as any).year;
                const yearStr = yearVal ? ` ${yearVal}` : "";
                const displayName = String(s.name).includes(String(yearVal || "")) ? s.name : `${s.name}${yearStr}`;
                return (
                  <option key={s.id} value={s.id}>
                    {displayName}
                  </option>
                );
              })}
            </select>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.group}>
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{g.group}</p>
              <div className="flex flex-wrap gap-1 lg:flex-col">
                {g.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`rounded-md px-3 py-1.5 text-left text-sm font-semibold ${
                      tab === item ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {item}
                    {item === "Solicitações" && pending > 0 && (
                      <span className="ml-1 rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{pending}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className="space-y-4">
          {tab === "Dashboard" && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Clubes" value={teams.length} />
                <StatCard label="Atletas" value={players.length} />
                <StatCard label="Usuários" value={profiles.length} />
                <StatCard label="Solicitações" value={pending} />
                <StatCard label="Partidas" value={matches.length} />
                <StatCard label="Homologadas" value={matches.filter((m) => m.homologated).length} />
                <StatCard label="Pendentes" value={matches.filter((m) => !m.homologated).length} />
                <StatCard label="Temporadas" value={seasons.length} />
              </div>
              <Panel title="Próximas partidas">
                {nextMatches.length === 0 && <EmptyState>Nenhuma partida agendada.</EmptyState>}
                <div className="divide-y divide-border">
                  {nextMatches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {teams.find((t) => t.id === m.home_team_id)?.short_name ?? "?"} ×{" "}
                        {teams.find((t) => t.id === m.away_team_id)?.short_name ?? "?"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Rodada {m.round} · {formatDate(m.match_date)}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {tab === "Temporadas" && <SeasonsSection />}
          {tab === "Rodadas" && (
            <>
              <FixtureGenerator />
              <RoundsSection />
            </>
          )}
          {tab === "Partidas" && <MatchesSection />}
          {tab === "Súmulas" && <MatchesSection onlyPending />}
          {tab === "Classificação" && <StandingsSection />}
          {tab === "Taça Regional" && <KnockoutSection />}
          {tab === "Estatísticas" && <StatsSection />}
          {tab === "Artilharia" && <ScorersSection />}
          {tab === "Ranking" && <RankingSection />}
          {tab === "Recordes" && <RecordsSection />}

          {tab === "Clubes" && <TeamsSection />}
          {tab === "Atletas" && <PlayersSection />}
          {tab === "Transferências" && <TransfersSection />}
          {tab === "Arbitragem" && <RefereesSection />}

          {tab === "Financeiro" && <FinanceOverview />}
          {tab === "Filiações" && <FeesSection kind="affiliations" />}
          {tab === "Inscrições" && <FeesSection kind="registrations" />}
          {tab === "Premiação" && <AwardsSection />}

          {tab === "Notícias" && <NewsSection />}
          {tab === "Regulamento" && <RegulationSection />}

          {tab === "Usuários" && <UsersSection />}
          {tab === "Solicitações" && <RequestsSection />}
          {tab === "Configurações" && <SettingsSection />}
          {tab === "Manutenção" && <MaintenanceSection />}
          {tab === "Logs" && <LogsSection />}
        </section>
      </div>
    </div>
  );
}
