import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSeason } from "@/context/season";
import {
  financeQuery,
  formatDate,
  matchesQuery,
  playersQuery,
  refereesQuery,
  sortStandings,
  standingsQuery,
  teamsQuery,
  topScorersQuery,
  clubRankingQuery,
  newsQuery,
  regulationsQuery,
  seasonsQuery,
} from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "@/hooks/useAccess";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => requireAdmin(),
  component: PainelAdmin,
  head: () => ({
    meta: [
      { title: "Painel Administrativo · Liga Regional" },
      { name: "description", content: "Controle total da Liga Regional: clubes, atletas, usuários, jogos e finanças." },
      { property: "og:title", content: "Painel Administrativo · Liga Regional" },
      { property: "og:description", content: "Controle total da Liga Regional: clubes, atletas, usuários, jogos e finanças." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: unknown) => any };

const TABS = [
  "Dashboard",
  "Usuários",
  "Solicitações",
  "Clubes",
  "Atletas",
  "Temporadas",
  "Jogos",
  "Arbitragem",
  "Transferências",
  "Classificação",
  "Estatísticas",
  "Rankings",
  "Financeiro",
  "Premiação",
  "Notícias",
  "Regulamento",
  "Logs",
] as const;

type Profile = { id: string; full_name: string | null; email: string | null; status: string };

function useAdminData() {
  const profiles = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("id, full_name, email, status").order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
  const roles = useQuery({
    queryKey: ["admin", "user_roles"],
    queryFn: async () => {
      const { data, error } = await db.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as { user_id: string; role: string }[];
    },
  });
  const managers = useQuery({
    queryKey: ["admin", "team_managers"],
    queryFn: async () => {
      const { data, error } = await db.from("team_managers").select("user_id, team_id");
      if (error) throw error;
      return (data ?? []) as { user_id: string; team_id: string }[];
    },
  });
  const requests = useQuery({
    queryKey: ["admin", "membership_requests"],
    queryFn: async () => {
      const { data, error } = await db
        .from("membership_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        user_id: string;
        requested_role: string;
        team_id: string | null;
        player_id: string | null;
        message: string | null;
        status: string;
        created_at: string;
      }[];
    },
  });
  return { profiles, roles, managers, requests };
}

function PainelAdmin() {
  const queryClient = useQueryClient();
  const { season, seasons } = useSeason();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Dashboard");

  const { profiles, roles, managers, requests } = useAdminData();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: standings = [] } = useQuery(standingsQuery(season?.id));
  const { data: scorers = [] } = useQuery(topScorersQuery(season?.id));
  const { data: referees = [] } = useQuery(refereesQuery);
  const { data: finance } = useQuery(financeQuery(season?.id));
  const { data: ranking = [] } = useQuery(clubRankingQuery);
  const { data: news = [] } = useQuery(newsQuery);
  const { data: regulations = [] } = useQuery(regulationsQuery);
  useQuery(seasonsQuery);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles.data ?? []) map.set(r.user_id, r.role);
    return map;
  }, [roles.data]);
  const teamByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of managers.data ?? []) map.set(m.user_id, m.team_id);
    return map;
  }, [managers.data]);
  const playerByUser = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string; current_team_id: string | null }>();
    for (const p of players as unknown as { id: string; full_name: string; user_id?: string | null; current_team_id: string | null }[]) {
      if (p.user_id) map.set(p.user_id, { id: p.id, full_name: p.full_name, current_team_id: p.current_team_id });
    }
    return map;
  }, [players]);

  const invalidateAdmin = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["access"] });
  };

  const review = useMutation({
    mutationFn: async (input: { id: string; approve: boolean; notes?: string }) => {
      const { error } = await db.rpc("review_membership_request", {
        _request_id: input.id,
        _approve: input.approve,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada");
      invalidateAdmin();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setMembership = useMutation({
    mutationFn: async (input: { userId: string; role: string; teamId: string | null; playerId: string | null }) => {
      const { error } = await db.rpc("admin_set_user_membership", {
        _user_id: input.userId,
        _role: input.role,
        _team_id: input.teamId,
        _player_id: input.playerId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo atualizado");
      invalidateAdmin();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { userId: string; status: string }) => {
      const { error } = await db.from("profiles").update({ status: input.status }).eq("id", input.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      invalidateAdmin();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const homologate = useMutation({
    mutationFn: async (input: { id: string; home: number; away: number }) => {
      const { error } = await db
        .from("matches")
        .update({ home_score: input.home, away_score: input.away, status: "finished", homologated: true })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resultado homologado");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["standings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approvePlayer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("players").update({ status: "active" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atleta aprovado");
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const table = sortStandings(standings);
  const pending = (requests.data ?? []).filter((r) => r.status === "pending");
  const unlinked = (profiles.data ?? []).filter(
    (p) => !rolesByUser.get(p.id) && !playerByUser.get(p.id),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Painel Administrativo" subtitle="Administrador da Liga Regional" />

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {t}
            {t === "Solicitações" && pending.length > 0 && (
              <span className="ml-1 rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{pending.length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === "Dashboard" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Clubes" value={teams.length} />
          <Card label="Atletas" value={players.length} />
          <Card label="Usuários" value={profiles.data?.length ?? 0} />
          <Card label="Solicitações" value={pending.length} />
          <Card label="Jogos" value={matches.length} />
          <Card label="Homologados" value={matches.filter((m) => m.homologated).length} />
          <Card label="Sem vínculo" value={unlinked.length} />
          <Card label="Temporadas" value={seasons.length} />
        </div>
      )}

      {tab === "Usuários" && (
        <div className="overflow-x-auto">
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
              {(profiles.data ?? []).map((p) => {
                const role = rolesByUser.get(p.id) ?? (playerByUser.get(p.id) ? "athlete" : "user");
                const linkedPlayer = playerByUser.get(p.id);
                const teamId = teamByUser.get(p.id) ?? linkedPlayer?.current_team_id ?? null;
                return (
                  <UserRow
                    key={p.id}
                    profile={p}
                    role={role}
                    teamName={teamId ? (teamMap.get(teamId)?.name ?? "-") : role === "admin" ? "Liga Regional" : "Sem vínculo"}
                    teams={teams}
                    players={players}
                    defaultTeamId={teamId}
                    defaultPlayerId={linkedPlayer?.id ?? null}
                    onSave={(role, teamId, playerId) =>
                      setMembership.mutate({ userId: p.id, role, teamId, playerId })
                    }
                    onStatus={(status) => setStatus.mutate({ userId: p.id, status })}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Solicitações" && (
        <div className="space-y-3">
          {(requests.data ?? []).map((r) => {
            const profile = (profiles.data ?? []).find((p) => p.id === r.user_id);
            return (
              <div key={r.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display font-bold uppercase">
                    {profile?.full_name ?? profile?.email ?? r.user_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[r.requested_role]} ·{" "}
                    {r.team_id ? teamMap.get(r.team_id)?.name : r.player_id ? playerMap.get(r.player_id)?.full_name : "sem alvo"} ·{" "}
                    {r.status}
                  </p>
                  {r.message && <p className="text-xs text-muted-foreground">"{r.message}"</p>}
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
            );
          })}
          {(requests.data ?? []).length === 0 && (
            <p className="surface-card p-4 text-sm text-muted-foreground">Nenhuma solicitação.</p>
          )}
        </div>
      )}

      {tab === "Clubes" && (
        <div className="surface-card divide-y divide-border">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 text-sm">
              <Link to="/clubes/$teamId" params={{ teamId: t.id }} className="font-semibold">
                {t.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {t.city ?? "-"} · {t.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "Atletas" && (
        <div className="surface-card divide-y divide-border">
          {players.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <Link to="/atletas/$playerId" params={{ playerId: p.id }} className="font-semibold">
                {p.full_name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {p.current_team_id ? teamMap.get(p.current_team_id)?.short_name : "sem clube"} · {p.status}
              </span>
              {p.status !== "active" && (
                <Button size="sm" onClick={() => approvePlayer.mutate(p.id)}>
                  Aprovar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Temporadas" && (
        <div className="surface-card divide-y divide-border">
          {seasons.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 text-sm">
              <span className="font-semibold">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {s.year} · {s.status} {s.is_current ? "· atual" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "Jogos" && (
        <div className="space-y-3">
          {matches
            .filter((m) => !m.homologated)
            .slice(0, 40)
            .map((m) => (
              <ScoreRow
                key={m.id}
                title={`${teamMap.get(m.home_team_id)?.short_name} × ${teamMap.get(m.away_team_id)?.short_name}`}
                info={`Rodada ${m.round} · ${formatDate(m.match_date)}`}
                onSubmit={(home, away) => homologate.mutate({ id: m.id, home, away })}
              />
            ))}
        </div>
      )}

      {tab === "Arbitragem" && (
        <div className="surface-card divide-y divide-border">
          {referees.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <span className="font-semibold">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {r.role} · {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "Transferências" && <TransfersPanel />}

      {tab === "Classificação" && (
        <div className="surface-card divide-y divide-border">
          {table.map((r, i) => (
            <div key={r.team_id} className="flex items-center justify-between p-3 text-sm">
              <span>
                {i + 1}º {teamMap.get(r.team_id)?.name}
              </span>
              <span className="font-semibold">{r.points} pts</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Estatísticas" && (
        <div className="surface-card divide-y divide-border">
          {[...scorers]
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 20)
            .map((s) => (
              <div key={s.player_id} className="flex items-center justify-between p-3 text-sm">
                <span>{playerMap.get(s.player_id)?.full_name ?? "Atleta"}</span>
                <span className="font-semibold">{s.goals} gols</span>
              </div>
            ))}
        </div>
      )}

      {tab === "Rankings" && (
        <div className="surface-card divide-y divide-border">
          {ranking.map((r, i) => (
            <div key={`${r.team_id}-${i}`} className="flex items-center justify-between p-3 text-sm">
              <span>{teamMap.get(r.team_id)?.name}</span>
              <span className="font-semibold">{r.points} pts</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Financeiro" && (
        <div className="surface-card divide-y divide-border">
          {(finance?.affiliations ?? []).map((a, i) => (
            <div key={`a${i}`} className="flex items-center justify-between p-3 text-sm">
              <span>Afiliação · {teamMap.get(a.team_id)?.short_name}</span>
              <span className="font-semibold">
                R$ {a.amount} · {a.status}
              </span>
            </div>
          ))}
          {(finance?.registrations ?? []).map((r, i) => (
            <div key={`r${i}`} className="flex items-center justify-between p-3 text-sm">
              <span>Inscrição · {teamMap.get(r.team_id)?.short_name}</span>
              <span className="font-semibold">
                R$ {r.amount} · {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "Premiação" && (
        <div className="surface-card divide-y divide-border">
          {ranking
            .filter((r) => r.achievement)
            .map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <span>{teamMap.get(r.team_id)?.name}</span>
                <span className="text-xs text-muted-foreground">{r.achievement}</span>
              </div>
            ))}
          {ranking.filter((r) => r.achievement).length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nenhuma premiação registrada.</p>
          )}
        </div>
      )}

      {tab === "Notícias" && (
        <div className="surface-card divide-y divide-border">
          {news.map((n) => (
            <div key={n.id} className="flex items-center justify-between p-3 text-sm">
              <span>{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.category}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Regulamento" && (
        <div className="surface-card divide-y divide-border">
          {regulations.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <span>Versão {r.version}</span>
              <span className="text-xs text-muted-foreground">{formatDate(r.updated_at.slice(0, 10))}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Logs" && <LogsPanel />}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-stadium text-3xl">{value}</p>
    </div>
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
  const [newRole, setNewRole] = useState(role);
  const [teamId, setTeamId] = useState(defaultTeamId ?? "");
  const [playerId, setPlayerId] = useState(defaultPlayerId ?? "");

  return (
    <>
      <tr className="border-t border-border">
        <td className="p-2 font-semibold">{profile.full_name ?? "-"}</td>
        <td className="p-2 text-muted-foreground">{profile.email}</td>
        <td className="p-2">{ROLE_LABEL[role] ?? role}</td>
        <td className="p-2">{teamName}</td>
        <td className="p-2">{profile.status}</td>
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
              <div className="space-y-1">
                <Label>Função</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="admin">Administrador</option>
                  <option value="club_manager">Gestor de clube</option>
                  <option value="athlete">Atleta</option>
                </select>
              </div>
              {newRole === "club_manager" && (
                <div className="space-y-1">
                  <Label>Clube vinculado</Label>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {newRole === "athlete" && (
                <div className="space-y-1">
                  <Label>Atleta vinculado</Label>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm"
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
              )}
              <div className="space-y-1">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm"
                  value={profile.status}
                  onChange={(e) => onStatus(e.target.value)}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
              <Button
                className="self-end"
                onClick={() => {
                  onSave(newRole, newRole === "club_manager" ? teamId || null : null, newRole === "athlete" ? playerId || null : null);
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

function ScoreRow({ title, info, onSubmit }: { title: string; info: string; onSubmit: (home: number, away: number) => void }) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  return (
    <div className="surface-card flex flex-wrap items-center gap-3 p-4">
      <div className="flex-1">
        <p className="font-display text-lg font-bold uppercase">{title}</p>
        <p className="text-xs text-muted-foreground">{info}</p>
      </div>
      <Input className="w-16" inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value)} />
      <Input className="w-16" inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value)} />
      <Button
        size="sm"
        onClick={() => {
          const h = Number(home);
          const a = Number(away);
          if (home === "" || away === "" || Number.isNaN(h) || Number.isNaN(a)) {
            toast.error("Informe o placar");
            return;
          }
          onSubmit(h, a);
        }}
      >
        Homologar
      </Button>
    </div>
  );
}

function TransfersPanel() {
  const queryClient = useQueryClient();
  const { data: transfers = [] } = useQuery({
    queryKey: ["admin", "transfers"],
    queryFn: async () => {
      const { data, error } = await db.from("transfers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; player_id: string; status: string; type: string; to_team_id: string | null }[];
    },
  });
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);

  const decide = useMutation({
    mutationFn: async (input: { id: string; status: string; playerId: string; toTeam: string | null }) => {
      const { error } = await db.from("transfers").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
      if (input.status === "approved" && input.toTeam) {
        const { error: e2 } = await db.from("players").update({ current_team_id: input.toTeam }).eq("id", input.playerId);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Transferência atualizada");
      queryClient.invalidateQueries({ queryKey: ["admin", "transfers"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-card divide-y divide-border">
      {transfers.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <span>
            {players.find((p) => p.id === t.player_id)?.full_name ?? "Atleta"} →{" "}
            {teams.find((x) => x.id === t.to_team_id)?.short_name ?? "-"}
          </span>
          <span className="text-xs text-muted-foreground">
            {t.type} · {t.status}
          </span>
          {t.status === "pending" && (
            <span className="flex gap-2">
              <Button
                size="sm"
                onClick={() => decide.mutate({ id: t.id, status: "approved", playerId: t.player_id, toTeam: t.to_team_id })}
              >
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
      {transfers.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhuma transferência.</p>}
    </div>
  );
}

function LogsPanel() {
  const { data: logs = [] } = useQuery({
    queryKey: ["admin", "audit_log"],
    queryFn: async () => {
      const { data, error } = await db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as { id: string; action: string; entity: string | null; created_at: string }[];
    },
  });
  return (
    <div className="surface-card divide-y divide-border">
      {logs.map((l) => (
        <div key={l.id} className="flex items-center justify-between p-3 text-sm">
          <span>{l.action}</span>
          <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
        </div>
      ))}
      {logs.length === 0 && <p className="p-3 text-sm text-muted-foreground">Sem registros.</p>}
    </div>
  );
}
