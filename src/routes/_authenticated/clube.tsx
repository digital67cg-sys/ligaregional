import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/useAccess";
import { useSeason } from "@/context/season";
import {
  financeQuery,
  formatDate,
  formatTime,
  matchesQuery,
  playersQuery,
  sortStandings,
  standingsQuery,
  teamsQuery,
  topScorersQuery,
  MATCH_STATUS,
} from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { TeamCrest } from "@/components/site/TeamCrest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireClubManager } from "@/lib/guards";
import { SignOutButton } from "@/components/site/SignOutButton";

export const Route = createFileRoute("/_authenticated/clube")({
  beforeLoad: () => requireClubManager(),
  component: PainelClube,
  head: () => ({
    meta: [
      { title: "Painel do Clube · Liga Regional" },
      { name: "description", content: "Gerencie elenco, jogos, transferências e finanças do seu clube na Liga Regional." },
      { property: "og:title", content: "Painel do Clube · Liga Regional" },
      { property: "og:description", content: "Gerencie elenco, jogos, transferências e finanças do seu clube na Liga Regional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const db = supabase as unknown as { from: (t: string) => any };

const TABS = ["Meu Clube", "Elenco", "Jogos", "Transferências", "Arbitragem", "Financeiro", "Documentos"] as const;

function PainelClube() {
  const access = useAccess();
  const queryClient = useQueryClient();
  const { season } = useSeason();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Meu Clube");
  const [teamId, setTeamId] = useState<string | null>(null);

  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: standings = [] } = useQuery(standingsQuery(season?.id));
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: finance } = useQuery(financeQuery(season?.id));

  const myTeams = access.teamIds;
  const activeTeamId = teamId ?? myTeams[0] ?? null;
  const team = teams.find((t) => t.id === activeTeamId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const squad = players.filter((p) => p.current_team_id === activeTeamId);
  const teamMatches = matches.filter((m) => m.home_team_id === activeTeamId || m.away_team_id === activeTeamId);
  const table = sortStandings(standings);
  const position = table.findIndex((r) => r.team_id === activeTeamId) + 1;
  const row = table.find((r) => r.team_id === activeTeamId);
  const teamScorers = scorers
    .filter((s) => s.team_id === activeTeamId)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  const schedule = useMutation({
    mutationFn: async (input: { id: string; match_date: string; kickoff: string; venue: string }) => {
      const { error } = await db
        .from("matches")
        .update({
          match_date: input.match_date,
          kickoff: input.kickoff,
          venue: input.venue,
          status: "scheduled",
          away_confirmed: false,
          proposal_by: access.userId ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta enviada ao visitante");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("matches").update({ away_confirmed: true, status: "confirmed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partida confirmada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestReferee = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await db.from("referee_assignments").insert({
        match_id: matchId,
        fee: 0,
        requested_by: access.userId,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Arbitragem solicitada à organização"),
    onError: (e: Error) => toast.error(e.message),
  });

  const requestTransfer = useMutation({
    mutationFn: async (input: { player_id: string; type: string }) => {
      const { error } = await db.from("transfers").insert({
        season_id: season?.id,
        player_id: input.player_id,
        to_team_id: activeTeamId,
        type: input.type,
        status: "pending",
        requested_by: access.userId,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Transferência solicitada"),
    onError: (e: Error) => toast.error(e.message),
  });

  const myFinance = {
    affiliations: (finance?.affiliations ?? []).filter((a) => a.team_id === activeTeamId),
    registrations: (finance?.registrations ?? []).filter((r) => r.team_id === activeTeamId),
  };
  const pendencies = [
    ...myFinance.affiliations.filter((a) => a.status !== "paid").map((a) => `Afiliação pendente: R$ ${a.amount}`),
    ...myFinance.registrations.filter((r) => r.status !== "paid").map((r) => `Inscrição pendente: R$ ${r.amount}`),
    ...teamMatches
      .filter((m) => !m.match_date && !m.homologated)
      .slice(0, 3)
      .map((m) => `Rodada ${m.round} sem data definida`),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Painel do Clube" subtitle={`${team?.name ?? "Clube"} · Gestor`} action={<SignOutButton />} />

      {myTeams.length > 1 && (
        <select
          className="mb-4 h-10 rounded-md border border-border bg-surface px-3 text-sm"
          value={activeTeamId ?? ""}
          onChange={(e) => setTeamId(e.target.value)}
        >
          {myTeams.map((id) => (
            <option key={id} value={id}>
              {teamMap.get(id)?.name ?? id}
            </option>
          ))}
        </select>
      )}

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Meu Clube" && team && (
        <div className="space-y-6">
          <div className="surface-card flex flex-wrap items-center gap-4 p-5">
            <TeamCrest name={team.name} short={team.short_name} crest={team.crest_url} size="lg" />
            <div className="flex-1">
              <p className="text-stadium text-2xl">{team.name}</p>
              <p className="text-sm text-muted-foreground">
                {team.city ?? ""} {team.district ? `· ${team.district}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Posição</p>
              <p className="text-stadium text-3xl">{position || "-"}º</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pontos</p>
              <p className="text-stadium text-3xl">{row?.points ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-stadium text-xl">Próximos jogos</h2>
              <div className="space-y-2">
                {teamMatches
                  .filter((m) => !m.homologated)
                  .slice(0, 4)
                  .map((m) => (
                    <div key={m.id} className="surface-card p-3 text-sm">
                      <p className="font-display font-bold uppercase">
                        {teamMap.get(m.home_team_id)?.short_name} × {teamMap.get(m.away_team_id)?.short_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rodada {m.round} · {formatDate(m.match_date)} {formatTime(m.kickoff)}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
            <section>
              <h2 className="mb-2 text-stadium text-xl">Últimos resultados</h2>
              <div className="space-y-2">
                {teamMatches
                  .filter((m) => m.homologated)
                  .slice(-4)
                  .reverse()
                  .map((m) => (
                    <div key={m.id} className="surface-card flex items-center justify-between p-3 text-sm">
                      <span className="font-display font-bold uppercase">
                        {teamMap.get(m.home_team_id)?.short_name} × {teamMap.get(m.away_team_id)?.short_name}
                      </span>
                      <span className="text-stadium text-lg">
                        {m.home_score} - {m.away_score}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
            <section>
              <h2 className="mb-2 text-stadium text-xl">Artilharia do clube</h2>
              <div className="surface-card divide-y divide-border">
                {teamScorers.map((s) => (
                  <div key={s.player_id} className="flex items-center justify-between p-3 text-sm">
                    <span>{players.find((p) => p.id === s.player_id)?.full_name ?? "Atleta"}</span>
                    <span className="text-stadium text-lg">{s.goals}</span>
                  </div>
                ))}
                {teamScorers.length === 0 && <p className="p-3 text-sm text-muted-foreground">Sem gols registrados.</p>}
              </div>
            </section>
            <section>
              <h2 className="mb-2 text-stadium text-xl">Pendências</h2>
              <div className="surface-card divide-y divide-border">
                {pendencies.map((p, i) => (
                  <p key={i} className="p-3 text-sm">
                    {p}
                  </p>
                ))}
                {pendencies.length === 0 && <p className="p-3 text-sm text-muted-foreground">Tudo em dia.</p>}
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "Elenco" && (
        <div className="space-y-4">
          <NewPlayerForm teamId={activeTeamId} />
          <div className="surface-card divide-y divide-border">
            {squad.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <Link to="/atletas/$playerId" params={{ playerId: p.id }} className="font-semibold">
                  {p.full_name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {p.position ?? "-"} · #{p.shirt_number ?? "-"} · {p.status}
                </span>
              </div>
            ))}
            {squad.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum atleta no elenco.</p>}
          </div>
        </div>
      )}

      {tab === "Jogos" && (
        <div className="space-y-3">
          {teamMatches.map((m) => (
            <MatchRow
              key={m.id}
              title={`${teamMap.get(m.home_team_id)?.short_name} × ${teamMap.get(m.away_team_id)?.short_name}`}
              info={`Rodada ${m.round} · ${MATCH_STATUS[m.status] ?? m.status} · ${formatDate(m.match_date)} ${formatTime(m.kickoff)} · ${m.venue ?? "local a definir"}`}
              canPropose={m.home_team_id === activeTeamId && !m.homologated}
              canConfirm={m.away_team_id === activeTeamId && !m.away_confirmed && !!m.match_date}
              onPropose={(v) => schedule.mutate({ id: m.id, ...v })}
              onConfirm={() => confirmMatch.mutate(m.id)}
              onRequestReferee={() => requestReferee.mutate(m.id)}
            />
          ))}
        </div>
      )}

      {tab === "Transferências" && (
        <div className="surface-card space-y-3 p-5">
          <p className="text-sm text-muted-foreground">
            Solicite a transferência de um atleta para o seu clube. A organização analisará o pedido.
          </p>
          <TransferForm
            players={players.filter((p) => p.current_team_id !== activeTeamId)}
            onSubmit={(playerId) => requestTransfer.mutate({ player_id: playerId, type: "transfer" })}
          />
        </div>
      )}

      {tab === "Arbitragem" && (
        <div className="space-y-3">
          {teamMatches
            .filter((m) => !m.homologated)
            .map((m) => (
              <div key={m.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display font-bold uppercase">
                    {teamMap.get(m.home_team_id)?.short_name} × {teamMap.get(m.away_team_id)?.short_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rodada {m.round} · {formatDate(m.match_date)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => requestReferee.mutate(m.id)}>
                  Solicitar arbitragem
                </Button>
              </div>
            ))}
        </div>
      )}

      {tab === "Financeiro" && (
        <div className="surface-card divide-y divide-border">
          {myFinance.affiliations.map((a, i) => (
            <div key={`a${i}`} className="flex items-center justify-between p-3 text-sm">
              <span>Afiliação {a.due_date ? `· vence ${formatDate(a.due_date)}` : ""}</span>
              <span className="font-semibold">
                R$ {a.amount} · {a.status}
              </span>
            </div>
          ))}
          {myFinance.registrations.map((r, i) => (
            <div key={`r${i}`} className="flex items-center justify-between p-3 text-sm">
              <span>Inscrição</span>
              <span className="font-semibold">
                R$ {r.amount} · {r.status}
              </span>
            </div>
          ))}
          {myFinance.affiliations.length + myFinance.registrations.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nenhum lançamento financeiro.</p>
          )}
        </div>
      )}

      {tab === "Documentos" && (
        <div className="surface-card p-5 text-sm">
          <p className="text-muted-foreground">
            Consulte o regulamento oficial e os documentos da temporada na área pública.
          </p>
          <Link to="/regulamento" className="text-primary underline">
            Abrir regulamento
          </Link>
        </div>
      )}
    </div>
  );
}

function NewPlayerForm({ teamId }: { teamId: string | null }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [number, setNumber] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("players").insert({
        full_name: name,
        position: position || null,
        shirt_number: number ? Number(number) : null,
        current_team_id: teamId,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atleta cadastrado e enviado para aprovação");
      setName("");
      setPosition("");
      setNumber("");
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-card grid gap-3 p-4 sm:grid-cols-4">
      <div className="space-y-1 sm:col-span-2">
        <Label>Nome do atleta</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Posição</Label>
        <Input value={position} onChange={(e) => setPosition(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Camisa</Label>
        <Input inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
      </div>
      <Button
        className="sm:col-span-4 sm:w-fit"
        onClick={() => {
          if (!name) {
            toast.error("Informe o nome");
            return;
          }
          create.mutate();
        }}
      >
        Cadastrar atleta
      </Button>
    </div>
  );
}

function TransferForm({
  players,
  onSubmit,
}: {
  players: { id: string; full_name: string }[];
  onSubmit: (playerId: string) => void;
}) {
  const [playerId, setPlayerId] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1 space-y-1">
        <Label>Atleta</Label>
        <select
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        >
          <option value="">Selecione</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>
      <Button
        onClick={() => {
          if (!playerId) {
            toast.error("Selecione o atleta");
            return;
          }
          onSubmit(playerId);
        }}
      >
        Solicitar
      </Button>
    </div>
  );
}

function MatchRow({
  title,
  info,
  canPropose,
  canConfirm,
  onPropose,
  onConfirm,
  onRequestReferee,
}: {
  title: string;
  info: string;
  canPropose: boolean;
  canConfirm: boolean;
  onPropose: (v: { match_date: string; kickoff: string; venue: string }) => void;
  onConfirm: () => void;
  onRequestReferee: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold uppercase">{title}</p>
          <p className="text-xs text-muted-foreground">{info}</p>
        </div>
        <div className="flex gap-2">
          {canPropose && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(!open)}>
              Propor mando
            </Button>
          )}
          {canConfirm && (
            <Button size="sm" onClick={onConfirm}>
              Confirmar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onRequestReferee}>
            Arbitragem
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Local</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ginásio / campo" />
          </div>
          <Button
            className="self-end"
            onClick={() => {
              if (!date || !time) {
                toast.error("Informe data e horário");
                return;
              }
              onPropose({ match_date: date, kickoff: time, venue });
              setOpen(false);
            }}
          >
            Enviar
          </Button>
        </div>
      )}
    </div>
  );
}
