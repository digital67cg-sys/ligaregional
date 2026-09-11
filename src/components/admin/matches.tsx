import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton, EmptyState, Panel, SelectField, TextField } from "@/components/admin/ui";
import { callRpc, db, logAction, MATCH_STATUS_OPTIONS } from "@/lib/admin";
import { competitionGroupsQuery, formatDate, matchesQuery, playersQuery, teamsQuery, type Match } from "@/lib/league";
import { useSeason } from "@/context/season";

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["matches"] });
    qc.invalidateQueries({ queryKey: ["standings"] });
    qc.invalidateQueries({ queryKey: ["top_scorers"] });
    qc.invalidateQueries({ queryKey: ["match_events"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
}

/* ------------------------------------------------------------------ */
/* Gerador de tabela                                                    */
/* ------------------------------------------------------------------ */
export function FixtureGenerator() {
  const { season } = useSeason();
  const refresh = useRefresh();
  const [double, setDouble] = useState(true);
  const [start, setStart] = useState("");
  const [interval, setIntervalDays] = useState("7");
  const [wipe, setWipe] = useState(true);

  const generate = useMutation({
    mutationFn: async () =>
      callRpc<number>("admin_generate_fixtures", {
        _season_id: season?.id,
        _double_round: double,
        _start_date: start || null,
        _interval_days: Number(interval || 7),
        _wipe: wipe,
      }),
    onSuccess: (n) => {
      toast.success(`${n} partidas geradas`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel title="Gerador de tabela · pontos corridos">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="Data da 1ª rodada" type="date" value={start} onChange={setStart} />
        <TextField label="Intervalo entre rodadas (dias)" type="number" value={interval} onChange={setIntervalDays} />
        <SelectField
          label="Formato"
          value={double ? "2" : "1"}
          onChange={(v) => setDouble(v === "2")}
          options={[
            { value: "2", label: "Turno e returno" },
            { value: "1", label: "Turno único" },
          ]}
        />
        <SelectField
          label="Partidas existentes"
          value={wipe ? "wipe" : "keep"}
          onChange={(v) => setWipe(v === "wipe")}
          options={[
            { value: "wipe", label: "Apagar e recriar" },
            { value: "keep", label: "Manter e adicionar" },
          ]}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Usa os clubes inscritos na temporada selecionada. Um backup automático é criado antes da operação.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ConfirmButton
          variant="default"
          label="Gerar tabela"
          title="Gerar tabela"
          description="Esta operação poderá alterar rodadas e confrontos existentes. Um backup automático da temporada será criado antes."
          onConfirm={() => generate.mutate()}
        />
        <ConfirmButton
          label="Recriar tabela"
          title="Recriar tabela"
          description="Todas as partidas e súmulas desta temporada serão apagadas e uma nova tabela será gerada. Clubes, atletas e configurações são mantidos. Um backup será criado."
          confirmWord="RECRIAR"
          onConfirm={() => {
            setWipe(true);
            generate.mutate();
          }}
        />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Rodadas                                                              */
/* ------------------------------------------------------------------ */
export function RoundsSection() {
  const { season } = useSeason();
  const refresh = useRefresh();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));

  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) map.set(m.round, [...(map.get(m.round) ?? []), m]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const setRoundDate = useMutation({
    mutationFn: async (input: { round: number; date: string }) => {
      const { error } = await db
        .from("matches")
        .update({ match_date: input.date })
        .eq("season_id", season!.id)
        .eq("round", input.round);
      if (error) throw error;
      await logAction(`Data da rodada ${input.round} alterada`, "matches", null, { data: input.date });
    },
    onSuccess: () => {
      toast.success("Rodada atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRound = useMutation({
    mutationFn: async (round: number) => {
      const ids = matches.filter((m) => m.round === round).map((m) => m.id);
      await db.from("match_events").delete().in("match_id", ids);
      const { error } = await db.from("matches").delete().eq("season_id", season!.id).eq("round", round);
      if (error) throw error;
      await logAction(`Rodada ${round} excluída`, "matches", null, { partidas: ids.length });
    },
    onSuccess: () => {
      toast.success("Rodada excluída");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <FixtureGenerator />
      <Panel title={`Rodadas (${rounds.length})`}>
        {rounds.length === 0 && <EmptyState>Nenhuma rodada criada. Use o gerador de tabela ou crie partidas manualmente.</EmptyState>}
        <div className="divide-y divide-border">
          {rounds.map(([round, list]) => (
            <div key={round} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-display font-bold uppercase">Rodada {round}</p>
                <p className="text-xs text-muted-foreground">
                  {list.length} jogos · {list.filter((m) => m.homologated).length} homologados
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="h-9 w-40"
                  defaultValue={list[0]?.match_date ?? ""}
                  onChange={(e) => e.target.value && setRoundDate.mutate({ round, date: e.target.value })}
                />
                <ConfirmButton
                  label="Excluir rodada"
                  title={`Excluir rodada ${round}`}
                  description="As partidas e súmulas desta rodada serão apagadas. A classificação será recalculada automaticamente."
                  confirmWord="EXCLUIR"
                  onConfirm={() => deleteRound.mutate(round)}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Partidas                                                             */
/* ------------------------------------------------------------------ */
type MatchForm = {
  round: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  kickoff: string;
  venue: string;
  address: string;
  status: string;
  notes: string;
};

export function MatchesSection({ onlyPending = false, cupMode = false }: { onlyPending?: boolean; cupMode?: boolean }) {
  const { season } = useSeason();
  const refresh = useRefresh();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: groups = [] } = useQuery(competitionGroupsQuery(season?.id));
  const [creating, setCreating] = useState(false);
  const [roundFilter, setRoundFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const groupName = (id: string | null | undefined) => groups.find((group) => group.id === id)?.name ?? "Grupo a definir";

  const create = useMutation({
    mutationFn: async (f: MatchForm) => {
      const { data, error } = await db
        .from("matches")
        .insert({
          season_id: season!.id,
          round: Number(f.round || 1),
          leg: 1,
          home_team_id: f.home_team_id,
          away_team_id: f.away_team_id,
          match_date: f.match_date || null,
          kickoff: f.kickoff || null,
          venue: f.venue || null,
          address: f.address || null,
          status: f.status,
          notes: f.notes || null,
          ...(cupMode ? { stage: "grupos", group_id: f.group_id || null } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAction("Partida criada", "matches", data.id, f);
    },
    onSuccess: () => {
      toast.success("Partida criada");
      setCreating(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = matches.filter(
    (m) =>
      (!onlyPending || !m.homologated) &&
      (!cupMode || m.stage !== "mata_mata") &&
      (!roundFilter || String(m.round) === roundFilter) &&
      (!teamFilter || m.home_team_id === teamFilter || m.away_team_id === teamFilter) &&
      (!statusFilter || m.status === statusFilter),
  );
  const grouped = groups.map((group) => ({ group, matches: filtered.filter((match) => match.group_id === group.id) })).filter((item) => item.matches.length);

  const renderRows = (list: typeof filtered) => (
    <div className="divide-y divide-border">
      {list.map((m) => (
        <MatchRow key={m.id} match={m} teams={teams} open={openId === m.id} cupMode={cupMode} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Panel title={`${cupMode ? "Jogos da fase de grupos" : "Partidas"} (${filtered.length})`} action={<Button size="sm" onClick={() => setCreating((v) => !v)}>+ Nova partida</Button>}>
        {creating && <MatchCreateForm teamOptions={teamOptions} onCancel={() => setCreating(false)} onSubmit={(f) => create.mutate(f)} cupMode={cupMode} groupOptions={groups.map((group) => ({ value: group.id, label: group.name }))} />}
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          {!cupMode && <SelectField label="Rodada" value={roundFilter} onChange={setRoundFilter} options={rounds.map((r) => ({ value: String(r), label: `Rodada ${r}` }))} placeholder="Todas" />}
          <SelectField label="Clube" value={teamFilter} onChange={setTeamFilter} options={teamOptions} placeholder="Todos" />
          <SelectField label="Status" value={statusFilter} onChange={setStatusFilter} options={MATCH_STATUS_OPTIONS} placeholder="Todos" />
        </div>
        {filtered.length === 0 && <EmptyState>Nenhuma partida encontrada.</EmptyState>}
        {cupMode ? (
          <div className="space-y-5">
            {grouped.map(({ group, matches: groupMatches }) => <section key={group.id}><h3 className="mb-2 font-display text-lg font-bold uppercase text-primary">{group.name}</h3>{renderRows(groupMatches)}</section>)}
            {filtered.some((match) => !match.group_id) && <section><h3 className="mb-2 font-display text-lg font-bold uppercase text-primary">Grupo a definir</h3>{renderRows(filtered.filter((match) => !match.group_id))}</section>}
          </div>
        ) : renderRows(filtered)}
      </Panel>
    </div>
  );
}

function MatchCreateForm({
  teamOptions,
  onCancel,
  onSubmit,
}: {
  teamOptions: { value: string; label: string }[];
  onCancel: () => void;
  onSubmit: (f: MatchForm) => void;
}) {
  const [f, setF] = useState<MatchForm>({
    round: "1",
    home_team_id: "",
    away_team_id: "",
    match_date: "",
    kickoff: "",
    venue: "",
    address: "",
    status: "to_define",
    notes: "",
  });
  return (
    <div className="mb-4 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="Rodada" type="number" value={f.round} onChange={(v) => setF({ ...f, round: v })} />
        <SelectField label="Mandante" value={f.home_team_id} onChange={(v) => setF({ ...f, home_team_id: v })} options={teamOptions} placeholder="Selecione" />
        <SelectField label="Visitante" value={f.away_team_id} onChange={(v) => setF({ ...f, away_team_id: v })} options={teamOptions} placeholder="Selecione" />
        <SelectField label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={MATCH_STATUS_OPTIONS} />
        <TextField label="Data" type="date" value={f.match_date} onChange={(v) => setF({ ...f, match_date: v })} />
        <TextField label="Horário" type="time" value={f.kickoff} onChange={(v) => setF({ ...f, kickoff: v })} />
        <TextField label="Local" value={f.venue} onChange={(v) => setF({ ...f, venue: v })} />
        <TextField label="Endereço" value={f.address} onChange={(v) => setF({ ...f, address: v })} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          disabled={!f.home_team_id || !f.away_team_id || f.home_team_id === f.away_team_id}
          onClick={() => onSubmit(f)}
        >
          Criar partida
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function MatchRow({
  match,
  teams,
  open,
  onToggle,
}: {
  match: Match;
  teams: { id: string; name: string; short_name: string }[];
  open: boolean;
  onToggle: () => void;
}) {
  const refresh = useRefresh();
  const { season } = useSeason();
  const [f, setF] = useState<MatchForm>({
    round: String(match.round),
    home_team_id: match.home_team_id,
    away_team_id: match.away_team_id,
    match_date: match.match_date ?? "",
    kickoff: match.kickoff?.slice(0, 5) ?? "",
    venue: match.venue ?? "",
    address: match.address ?? "",
    status: match.status,
    notes: match.notes ?? "",
  });
  const [home, setHome] = useState(match.home_score === null ? "" : String(match.home_score));
  const [away, setAway] = useState(match.away_score === null ? "" : String(match.away_score));

  const teamName = (id: string) => teams.find((t) => t.id === id)?.short_name ?? "?";
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>, ) => {
      const { error } = await db.from("matches").update(patch).eq("id", match.id);
      if (error) throw error;
      await logAction("Partida atualizada", "matches", match.id, patch);
    },
    onSuccess: () => {
      toast.success("Partida atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const swap = useMutation({
    mutationFn: async () => callRpc("admin_swap_home_away", { _match_id: match.id }),
    onSuccess: () => {
      toast.success("Mando invertido");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      const { data, error } = await db
        .from("matches")
        .insert({
          season_id: match.season_id,
          round: match.round,
          leg: match.leg,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          venue: match.venue,
          address: match.address,
          status: "to_define",
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAction("Partida duplicada", "matches", data.id, { origem: match.id });
    },
    onSuccess: () => {
      toast.success("Partida duplicada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await db.from("match_events").delete().eq("match_id", match.id);
      const { error } = await db.from("matches").delete().eq("id", match.id);
      if (error) throw error;
      await logAction("Partida excluída", "matches", match.id, { rodada: match.round });
    },
    onSuccess: () => {
      toast.success("Partida excluída");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const homologate = useMutation({
    mutationFn: async (value: boolean) => {
      const patch = value
        ? {
            home_score: Number(home || 0),
            away_score: Number(away || 0),
            status: "finished",
            homologated: true,
          }
        : { homologated: false, status: "finished" };
      const { error } = await db.from("matches").update(patch).eq("id", match.id);
      if (error) throw error;

      if (value && match.stage === "mata_mata") {
        await callRpc("process_competition_knockout_match", { p_match_id: match.id });
      }

      await logAction(value ? "Resultado homologado" : "Partida reaberta", "matches", match.id, patch);
    },
    onSuccess: () => {
      toast.success(match.stage === "mata_mata" ? "Partida homologada e mata-mata atualizado" : "Situação da partida atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="min-w-48 text-left" onClick={onToggle}>
          <p className="font-display font-bold uppercase">
            {teamName(match.home_team_id)} {match.home_score ?? "-"} × {match.away_score ?? "-"} {teamName(match.away_team_id)}
          </p>
          <p className="text-xs text-muted-foreground">
            Rodada {match.round} · {formatDate(match.match_date)} · {match.venue ?? "local a definir"} ·{" "}
            {match.homologated ? "Homologada" : MATCH_STATUS_OPTIONS.find((o) => o.value === match.status)?.label ?? match.status}
          </p>
        </button>
        <Button size="sm" variant="secondary" onClick={onToggle}>
          {open ? "Fechar" : "Gerenciar"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-4 rounded-md border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextField label="Rodada" type="number" value={f.round} onChange={(v) => setF({ ...f, round: v })} />
            <SelectField label="Mandante" value={f.home_team_id} onChange={(v) => setF({ ...f, home_team_id: v })} options={teamOptions} />
            <SelectField label="Visitante" value={f.away_team_id} onChange={(v) => setF({ ...f, away_team_id: v })} options={teamOptions} />
            <SelectField label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={MATCH_STATUS_OPTIONS} />
            <TextField label="Data" type="date" value={f.match_date} onChange={(v) => setF({ ...f, match_date: v })} />
            <TextField label="Horário" type="time" value={f.kickoff} onChange={(v) => setF({ ...f, kickoff: v })} />
            <TextField label="Local" value={f.venue} onChange={(v) => setF({ ...f, venue: v })} />
            <TextField label="Endereço" value={f.address} onChange={(v) => setF({ ...f, address: v })} />
            <div className="sm:col-span-2 lg:col-span-4">
              <TextField label="Observações / ocorrências" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                update.mutate({
                  round: Number(f.round || 1),
                  home_team_id: f.home_team_id,
                  away_team_id: f.away_team_id,
                  match_date: f.match_date || null,
                  kickoff: f.kickoff || null,
                  venue: f.venue || null,
                  address: f.address || null,
                  status: f.status,
                  notes: f.notes || null,
                })
              }
            >
              Salvar alterações
            </Button>
            <Button size="sm" variant="secondary" onClick={() => swap.mutate()}>
              Trocar mando
            </Button>
            <Button size="sm" variant="secondary" onClick={() => duplicate.mutate()}>
              Duplicar
            </Button>
            <ConfirmButton
              label="Excluir partida"
              title="Excluir partida"
              description={
                match.homologated || match.home_score !== null
                  ? "Esta partida possui resultado e estatísticas vinculadas. A exclusão poderá afetar a classificação, que será recalculada automaticamente."
                  : "A partida será removida da tabela."
              }
              confirmWord="EXCLUIR"
              onConfirm={() => remove.mutate()}
            />
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Resultado</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{teamName(f.home_team_id)}</span>
              <Input className="w-16" inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value)} />
              <span>×</span>
              <Input className="w-16" inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value)} />
              <span className="text-sm font-semibold">{teamName(f.away_team_id)}</span>
              <ConfirmButton
                variant="secondary"
                label="Salvar placar manual"
                title="Correção administrativa de placar"
                description="O placar informado substituirá o cálculo automático da súmula. A alteração será registrada nos logs."
                onConfirm={() => update.mutate({ home_score: Number(home || 0), away_score: Number(away || 0), status: "finished" })}
              />
              {match.stage === "mata_mata" && (
                <span className="w-full text-xs text-muted-foreground">
                  Em caso de empate, o vencedor do mata-mata é processado pela função oficial após a homologação.
                </span>
              )}
              {match.homologated ? (
                <ConfirmButton
                  label="Reabrir partida"
                  title="Reabrir partida homologada"
                  description="Esta partida já foi homologada. Reabrir permitirá alterar resultado e estatísticas. A operação é registrada nos logs."
                  onConfirm={() => homologate.mutate(false)}
                />
              ) : (
                <Button size="sm" onClick={() => homologate.mutate(true)}>
                  Homologar resultado
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Somente partidas homologadas afetam classificação, artilharia e estatísticas.
            </p>
          </div>

          <SumulaEditor matchId={match.id} homeTeamId={f.home_team_id} awayTeamId={f.away_team_id} seasonId={season?.id} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Súmula digital                                                       */
/* ------------------------------------------------------------------ */
const EVENT_TYPES = [
  { value: "goal", label: "Gol" },
  { value: "yellow", label: "Cartão amarelo" },
  { value: "red", label: "Cartão vermelho" },
  { value: "expulsion", label: "Expulsão" },
];

export function SumulaEditor({
  matchId,
  homeTeamId,
  awayTeamId,
}: {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  seasonId?: string | undefined;
}) {
  const refresh = useRefresh();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: events = [] } = useQuery({
    queryKey: ["match_events", matchId],
    queryFn: async () => {
      const { data, error } = await db.from("match_events").select("*").eq("match_id", matchId).order("minute");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        team_id: string | null;
        player_id: string | null;
        type: string;
        minute: number | null;
        note: string | null;
      }[];
    },
  });

  const [type, setType] = useState("goal");
  const [teamId, setTeamId] = useState(homeTeamId);
  const [playerId, setPlayerId] = useState("");
  const [minute, setMinute] = useState("");
  const [note, setNote] = useState("");

  const teamOptions = [homeTeamId, awayTeamId].map((id) => ({
    value: id,
    label: teams.find((t) => t.id === id)?.name ?? "Equipe",
  }));
  const playerOptions = players
    .filter((p) => p.current_team_id === teamId)
    .map((p) => ({ value: p.id, label: `${p.shirt_number ?? "-"} · ${p.full_name}` }));

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("match_events").insert({
        match_id: matchId,
        team_id: teamId,
        player_id: playerId || null,
        type,
        minute: minute ? Number(minute) : null,
        note: note || null,
      });
      if (error) throw error;
      await logAction(`Súmula: ${type} adicionado`, "match_events", matchId, { teamId, playerId, minute });
      if (type === "goal") await callRpc("admin_sync_score_from_events", { _match_id: matchId });
    },
    onSuccess: () => {
      toast.success("Evento adicionado");
      setPlayerId("");
      setMinute("");
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const edit = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown>; isGoal: boolean }) => {
      const { error } = await db.from("match_events").update(input.patch).eq("id", input.id);
      if (error) throw error;
      await logAction("Súmula: evento editado", "match_events", input.id, input.patch);
      if (input.isGoal) await callRpc("admin_sync_score_from_events", { _match_id: matchId });
    },
    onSuccess: () => {
      toast.success("Evento atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (input: { id: string; isGoal: boolean }) => {
      const { error } = await db.from("match_events").delete().eq("id", input.id);
      if (error) throw error;
      await logAction("Súmula: evento excluído", "match_events", input.id, null);
      if (input.isGoal) await callRpc("admin_sync_score_from_events", { _match_id: matchId });
    },
    onSuccess: () => {
      toast.success("Evento excluído");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: async () => callRpc("admin_sync_score_from_events", { _match_id: matchId }),
    onSuccess: () => {
      toast.success("Placar recalculado pela súmula");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Súmula digital</p>
        <Button size="sm" variant="secondary" onClick={() => sync.mutate()}>
          Recalcular placar pelos gols
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField label="Tipo" value={type} onChange={setType} options={EVENT_TYPES} />
        <SelectField label="Equipe" value={teamId} onChange={(v) => { setTeamId(v); setPlayerId(""); }} options={teamOptions} />
        <SelectField label="Atleta" value={playerId} onChange={setPlayerId} options={playerOptions} placeholder="Selecione" />
        <TextField label="Minuto" type="number" value={minute} onChange={setMinute} />
        <TextField label="Observação" value={note} onChange={setNote} />
      </div>
      <Button className="mt-2" size="sm" onClick={() => add.mutate()} disabled={!teamId}>
        + Adicionar à súmula
      </Button>

      <div className="mt-3 divide-y divide-border">
        {events.length === 0 && <EmptyState>Nenhum evento registrado.</EmptyState>}
        {events.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              {e.minute ?? "-"}' · {EVENT_TYPES.find((t) => t.value === e.type)?.label ?? e.type} ·{" "}
              {players.find((p) => p.id === e.player_id)?.full_name ?? "sem atleta"} ·{" "}
              {teams.find((t) => t.id === e.team_id)?.short_name ?? "-"}
              {e.note ? ` · ${e.note}` : ""}
            </span>
            <span className="flex items-center gap-2">
              <Input
                className="h-8 w-16"
                defaultValue={e.minute ?? ""}
                inputMode="numeric"
                onBlur={(ev) =>
                  ev.target.value !== String(e.minute ?? "") &&
                  edit.mutate({ id: e.id, patch: { minute: ev.target.value ? Number(ev.target.value) : null }, isGoal: e.type === "goal" })
                }
              />
              <Button size="sm" variant="destructive" onClick={() => remove.mutate({ id: e.id, isGoal: e.type === "goal" })}>
                Excluir
              </Button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
