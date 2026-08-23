import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton, EmptyState, Panel, Scroller, SelectField, TextField } from "@/components/admin/ui";
import { db, logAction, rows } from "@/lib/admin";
import { formatDate, matchesQuery, playersQuery, refereesQuery, teamsQuery } from "@/lib/league";
import { ROLE_LABEL } from "@/hooks/useAccess";
import { useSeason } from "@/context/season";

type Profile = { id: string; full_name: string | null; email: string | null; status: string };

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "blocked", label: "Bloqueado" },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "club_manager", label: "Gestor de clube" },
  { value: "athlete", label: "Atleta" },
];

function useUsersData() {
  const profiles = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: () => rows<Profile>(db.from("profiles").select("id, full_name, email, status").order("full_name")),
  });
  const roles = useQuery({
    queryKey: ["admin", "user_roles"],
    queryFn: () => rows<{ user_id: string; role: string }>(db.from("user_roles").select("user_id, role")),
  });
  const managers = useQuery({
    queryKey: ["admin", "team_managers"],
    queryFn: () => rows<{ user_id: string; team_id: string }>(db.from("team_managers").select("user_id, team_id")),
  });
  return { profiles, roles, managers };
}

export function UsersSection() {
  const qc = useQueryClient();
  const { profiles, roles, managers } = useUsersData();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const [search, setSearch] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["access"] });
  };

  const rolesByUser = useMemo(() => new Map((roles.data ?? []).map((r) => [r.user_id, r.role])), [roles.data]);
  const teamByUser = useMemo(() => new Map((managers.data ?? []).map((m) => [m.user_id, m.team_id])), [managers.data]);
  const playerByUser = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string; current_team_id: string | null }>();
    for (const p of players as unknown as { id: string; full_name: string; user_id?: string | null; current_team_id: string | null }[]) {
      if (p.user_id) map.set(p.user_id, { id: p.id, full_name: p.full_name, current_team_id: p.current_team_id });
    }
    return map;
  }, [players]);

  const setMembership = useMutation({
    mutationFn: async (input: { userId: string; role: string; teamId: string | null; playerId: string | null }) => {
      const { error } = await db.rpc("admin_set_user_membership", {
        _user_id: input.userId,
        _role: input.role,
        _team_id: input.teamId,
        _player_id: input.playerId,
      });
      if (error) throw error;
      await logAction("Vínculo de usuário definido", "user_roles", input.userId, { role: input.role });
    },
    onSuccess: () => {
      toast.success("Vínculo atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { userId: string; status: string }) => {
      const { error } = await db.from("profiles").update({ status: input.status }).eq("id", input.userId);
      if (error) throw error;
      await logAction("Status de usuário alterado", "profiles", input.userId, { status: input.status });
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (profiles.data ?? []).filter((p) =>
    `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Panel title={`Usuários (${list.length})`}>
      <div className="mb-3 max-w-xs">
        <TextField label="Buscar" value={search} onChange={setSearch} placeholder="Nome ou e-mail" />
      </div>
      {list.length === 0 && <EmptyState>Nenhum usuário encontrado.</EmptyState>}
      <Scroller>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <th className="p-2">Usuário</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Perfil</th>
              <th className="p-2">Clube</th>
              <th className="p-2">Status</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const linkedPlayer = playerByUser.get(p.id);
              const role = rolesByUser.get(p.id) ?? (linkedPlayer ? "athlete" : "user");
              const teamId = teamByUser.get(p.id) ?? linkedPlayer?.current_team_id ?? null;
              return (
                <UserRow
                  key={p.id}
                  profile={p}
                  role={role}
                  teamName={
                    teamId ? (teams.find((t) => t.id === teamId)?.name ?? "-") : role === "admin" ? "Liga Regional" : "Sem vínculo"
                  }
                  teams={teams}
                  players={players}
                  defaultTeamId={teamId}
                  defaultPlayerId={linkedPlayer?.id ?? null}
                  onSave={(newRole, tId, pId) => setMembership.mutate({ userId: p.id, role: newRole, teamId: tId, playerId: pId })}
                  onStatus={(status) => setStatus.mutate({ userId: p.id, status })}
                />
              );
            })}
          </tbody>
        </table>
      </Scroller>
    </Panel>
  );
}

function UserRow({
  profile,
  role,
  teamName,
  teams,
  players,
  defaultTeamId,
  defaultPlayerId,
  onSave,
  onStatus,
}: {
  profile: Profile;
  role: string;
  teamName: string;
  teams: { id: string; name: string }[];
  players: { id: string; full_name: string }[];
  defaultTeamId: string | null;
  defaultPlayerId: string | null;
  onSave: (role: string, teamId: string | null, playerId: string | null) => void;
  onStatus: (status: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [newRole, setNewRole] = useState(role === "user" ? "athlete" : role);
  const [teamId, setTeamId] = useState(defaultTeamId ?? "");
  const [playerId, setPlayerId] = useState(defaultPlayerId ?? "");

  return (
    <>
      <tr className="border-t border-border">
        <td className="p-2 font-semibold">{profile.full_name ?? "-"}</td>
        <td className="p-2 text-muted-foreground">{profile.email}</td>
        <td className="p-2">{ROLE_LABEL[role] ?? role}</td>
        <td className="p-2">{teamName}</td>
        <td className="p-2">{STATUS_OPTIONS.find((s) => s.value === profile.status)?.label ?? profile.status}</td>
        <td className="p-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
            Editar
          </Button>
        </td>
      </tr>
      {editing && (
        <tr className="bg-secondary/30">
          <td colSpan={6} className="p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <SelectField label="Função" value={newRole} onChange={setNewRole} options={ROLE_OPTIONS} />
              {newRole === "club_manager" && (
                <SelectField
                  label="Clube vinculado"
                  value={teamId}
                  onChange={setTeamId}
                  options={teams.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Selecione"
                />
              )}
              {newRole === "athlete" && (
                <SelectField
                  label="Atleta vinculado"
                  value={playerId}
                  onChange={setPlayerId}
                  options={players.map((p) => ({ value: p.id, label: p.full_name }))}
                  placeholder="Selecione"
                />
              )}
              <SelectField label="Status" value={profile.status} onChange={onStatus} options={STATUS_OPTIONS} />
              <Button
                className="self-end"
                onClick={() => {
                  onSave(
                    newRole,
                    newRole === "club_manager" ? teamId || null : null,
                    newRole === "athlete" ? playerId || null : null,
                  );
                  setEditing(false);
                }}
              >
                Salvar vínculo
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RequestsSection() {
  const qc = useQueryClient();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: () => rows<Profile>(db.from("profiles").select("id, full_name, email, status").order("full_name")),
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "membership_requests"],
    queryFn: () =>
      rows<{
        id: string;
        user_id: string;
        requested_role: string;
        team_id: string | null;
        player_id: string | null;
        message: string | null;
        status: string;
      }>(db.from("membership_requests").select("*").order("created_at", { ascending: false })),
  });

  const review = useMutation({
    mutationFn: async (input: { id: string; approve: boolean }) => {
      const { error } = await db.rpc("review_membership_request", {
        _request_id: input.id,
        _approve: input.approve,
        _notes: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada");
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["access"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await db.from("membership_requests").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "membership_requests"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel title={`Solicitações de vínculo (${requests.filter((r) => r.status === "pending").length} pendentes)`}>
      {requests.length === 0 && <EmptyState>Nenhuma solicitação.</EmptyState>}
      <div className="divide-y divide-border">
        {requests.map((r) => {
          const profile = profiles.find((p) => p.id === r.user_id);
          return (
            <div key={r.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{profile?.full_name ?? profile?.email ?? r.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[r.requested_role] ?? r.requested_role} · {r.status}
                    {r.message ? ` · "${r.message}"` : ""}
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review.mutate({ id: r.id, approve: true })}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => review.mutate({ id: r.id, approve: false })}>
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
              {r.status === "pending" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {r.requested_role === "club_manager" && (
                    <SelectField
                      label="Clube"
                      value={r.team_id ?? ""}
                      onChange={(v) => assign.mutate({ id: r.id, patch: { team_id: v || null } })}
                      options={teams.map((t) => ({ value: t.id, label: t.name }))}
                      placeholder="Selecione o clube"
                    />
                  )}
                  {r.requested_role === "athlete" && (
                    <SelectField
                      label="Atleta"
                      value={r.player_id ?? ""}
                      onChange={(v) => assign.mutate({ id: r.id, patch: { player_id: v || null } })}
                      options={players.map((p) => ({ value: p.id, label: p.full_name }))}
                      placeholder="Selecione o atleta"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function TransfersSection() {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: transfers = [] } = useQuery({
    queryKey: ["admin", "transfers"],
    queryFn: () =>
      rows<{ id: string; player_id: string; status: string; type: string; from_team_id: string | null; to_team_id: string | null }>(
        db.from("transfers").select("*").order("created_at", { ascending: false }),
      ),
  });
  const [playerId, setPlayerId] = useState("");
  const [toTeam, setToTeam] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "transfers"] });
    qc.invalidateQueries({ queryKey: ["players"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const player = players.find((p) => p.id === playerId);
      const { error } = await db.from("transfers").insert({
        season_id: season!.id,
        player_id: playerId,
        from_team_id: player?.current_team_id ?? null,
        to_team_id: toTeam,
        type: "transfer",
        status: "pending",
      });
      if (error) throw error;
      await logAction("Transferência criada pela organização", "transfers", playerId, { toTeam });
    },
    onSuccess: () => {
      toast.success("Transferência registrada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async (input: { id: string; status: string; playerId: string; toTeam: string | null }) => {
      const { error } = await db.from("transfers").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
      if (input.status === "approved" && input.toTeam) {
        const { error: e2 } = await db.from("players").update({ current_team_id: input.toTeam }).eq("id", input.playerId);
        if (e2) throw e2;
      }
      await logAction(`Transferência ${input.status}`, "transfers", input.id, null);
    },
    onSuccess: () => {
      toast.success("Transferência atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel title="Transferências">
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <SelectField
          label="Atleta"
          value={playerId}
          onChange={setPlayerId}
          options={players.map((p) => ({ value: p.id, label: p.full_name }))}
          placeholder="Selecione"
        />
        <SelectField
          label="Clube destino"
          value={toTeam}
          onChange={setToTeam}
          options={teams.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="Selecione"
        />
        <Button className="self-end" onClick={() => create.mutate()} disabled={!playerId || !toTeam || !season}>
          + Nova transferência
        </Button>
      </div>
      {transfers.length === 0 && <EmptyState>Nenhuma transferência registrada.</EmptyState>}
      <div className="divide-y divide-border">
        {transfers.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>
              {players.find((p) => p.id === t.player_id)?.full_name ?? "Atleta"} ·{" "}
              {teams.find((x) => x.id === t.from_team_id)?.short_name ?? "sem clube"} →{" "}
              {teams.find((x) => x.id === t.to_team_id)?.short_name ?? "-"}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.type} · {t.status}
            </span>
            {t.status === "pending" && (
              <span className="flex gap-2">
                <Button size="sm" onClick={() => decide.mutate({ id: t.id, status: "approved", playerId: t.player_id, toTeam: t.to_team_id })}>
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => decide.mutate({ id: t.id, status: "rejected", playerId: t.player_id, toTeam: null })}
                >
                  Rejeitar
                </Button>
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

const REFEREE_ROLES = [
  { value: "referee", label: "Árbitro" },
  { value: "assistant", label: "Auxiliar" },
  { value: "table", label: "Mesa" },
];

export function RefereesSection() {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: referees = [] } = useQuery(refereesQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: assignments = [] } = useQuery({
    queryKey: ["admin", "referee_assignments", season?.id],
    queryFn: () =>
      rows<{ id: string; match_id: string; referee_id: string | null; fee: number; payment_status: string; confirmed: boolean }>(
        db.from("referee_assignments").select("*"),
      ),
  });

  const [name, setName] = useState("");
  const [role, setRole] = useState("referee");
  const [phone, setPhone] = useState("");
  const [matchId, setMatchId] = useState("");
  const [refereeId, setRefereeId] = useState("");
  const [fee, setFee] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["referees"] });
    qc.invalidateQueries({ queryKey: ["admin", "referee_assignments"] });
  };

  const addReferee = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("referees").insert({ name, role, phone: phone || null, status: "active" });
      if (error) throw error;
      await logAction("Árbitro cadastrado", "referees", null, { name });
    },
    onSuccess: () => {
      toast.success("Árbitro cadastrado");
      setName("");
      setPhone("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeReferee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("referees").update({ status: "inactive" }).eq("id", id);
      if (error) throw error;
      await logAction("Árbitro inativado", "referees", id, null);
    },
    onSuccess: () => {
      toast.success("Árbitro inativado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: async () => {
      const amount = Number(fee || 0);
      const { error } = await db.from("referee_assignments").insert({
        match_id: matchId,
        referee_id: refereeId || null,
        fee: amount,
        home_share: amount / 2,
        away_share: amount / 2,
        payment_status: "pending",
        confirmed: true,
      });
      if (error) throw error;
      await logAction("Arbitragem designada", "referee_assignments", matchId, { fee: amount });
    },
    onSuccess: () => {
      toast.success("Arbitragem designada");
      setFee("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAssignment = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await db.from("referee_assignments").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const matchLabel = (id: string) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return "Partida";
    return `R${m.round} · ${teams.find((t) => t.id === m.home_team_id)?.short_name ?? "?"} × ${teams.find((t) => t.id === m.away_team_id)?.short_name ?? "?"} · ${formatDate(m.match_date)}`;
  };

  return (
    <div className="space-y-4">
      <Panel title="Quadro de arbitragem">
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <TextField label="Nome" value={name} onChange={setName} />
          <SelectField label="Função" value={role} onChange={setRole} options={REFEREE_ROLES} />
          <TextField label="Telefone" value={phone} onChange={setPhone} />
          <Button className="self-end" onClick={() => addReferee.mutate()} disabled={!name}>
            + Cadastrar
          </Button>
        </div>
        {referees.length === 0 && <EmptyState>Nenhum árbitro cadastrado.</EmptyState>}
        <div className="divide-y divide-border">
          {referees.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="font-semibold">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {REFEREE_ROLES.find((x) => x.value === r.role)?.label ?? r.role} · {r.phone ?? "sem telefone"} · {r.status}
              </span>
              {r.status === "active" && (
                <ConfirmButton
                  label="Inativar"
                  title="Inativar árbitro"
                  description="O árbitro deixa de aparecer nas designações, mas o histórico é preservado."
                  onConfirm={() => removeReferee.mutate(r.id)}
                />
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Designações e taxas (rateio 50% mandante / 50% visitante)">
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <SelectField
            label="Partida"
            value={matchId}
            onChange={setMatchId}
            options={matches.map((m) => ({ value: m.id, label: matchLabel(m.id) }))}
            placeholder="Selecione"
          />
          <SelectField
            label="Árbitro"
            value={refereeId}
            onChange={setRefereeId}
            options={referees.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="A definir"
          />
          <TextField label="Taxa (R$)" type="number" value={fee} onChange={setFee} />
          <Button className="self-end" onClick={() => assign.mutate()} disabled={!matchId}>
            + Designar
          </Button>
        </div>
        {assignments.length === 0 && <EmptyState>Nenhuma designação registrada.</EmptyState>}
        <div className="divide-y divide-border">
          {assignments.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>{matchLabel(a.match_id)}</span>
              <span className="text-xs text-muted-foreground">
                {referees.find((r) => r.id === a.referee_id)?.name ?? "A definir"} · R$ {a.fee}
              </span>
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-xs"
                value={a.payment_status}
                onChange={(e) => updateAssignment.mutate({ id: a.id, patch: { payment_status: e.target.value } })}
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
