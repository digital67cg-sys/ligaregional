import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel, SelectField, StatCard, TextField } from "@/components/admin/ui";
import { awardsQuery, db, logAction, rows, type Award } from "@/lib/admin";
import { financeQuery, playersQuery, teamsQuery } from "@/lib/league";
import { useSeason } from "@/context/season";

const PAY_STATUS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "late", label: "Atrasado" },
  { value: "exempt", label: "Isento" },
];

const money = (v: number) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

/** Filiações (manutenção da Liga) e Inscrições (premiação) — geridas separadamente. */
export function FeesSection({ kind }: { kind: "affiliations" | "registrations" }) {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: list = [] } = useQuery({
    queryKey: ["admin", kind, season?.id],
    enabled: !!season?.id,
    queryFn: () =>
      rows<{ id: string; team_id: string; amount: number; status: string; due_date?: string | null }>(
        db.from(kind).select("*").eq("season_id", season!.id),
      ),
  });
  const [teamId, setTeamId] = useState("");
  const [amount, setAmount] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", kind] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const title = kind === "affiliations" ? "Filiações · manutenção da Liga" : "Inscrições · fundo de premiação";

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await db.from(kind).insert({
        season_id: season!.id,
        team_id: teamId,
        amount: Number(amount || 0),
        status: "pending",
      });
      if (error) throw error;
      await logAction(`Cobrança de ${kind === "affiliations" ? "filiação" : "inscrição"} criada`, kind, teamId, { amount });
    },
    onSuccess: () => {
      toast.success("Cobrança registrada");
      setAmount("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status: input.status };
      if (kind === "registrations") patch['paid_at'] = input.status === "paid" ? new Date().toISOString() : null;
      const { error } = await db.from(kind).update(patch).eq("id", input.id);
      if (error) throw error;
      await logAction("Situação financeira atualizada", kind, input.id, patch);
    },
    onSuccess: () => {
      toast.success("Atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = list.reduce((s, r) => s + Number(r.amount || 0), 0);
  const paid = list.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Previsto" value={money(total)} />
        <StatCard label="Recebido" value={money(paid)} />
        <StatCard label="Pendente" value={money(total - paid)} />
      </div>
      <Panel title={title}>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <SelectField
            label="Clube"
            value={teamId}
            onChange={setTeamId}
            options={teams.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Selecione"
          />
          <TextField label="Valor" type="number" value={amount} onChange={setAmount} />
          <Button className="self-end" onClick={() => add.mutate()} disabled={!teamId || !amount}>
            + Registrar cobrança
          </Button>
        </div>
        {list.length === 0 && <EmptyState>Nenhum lançamento nesta temporada.</EmptyState>}
        <div className="divide-y divide-border">
          {list.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-semibold">{teams.find((t) => t.id === r.team_id)?.name ?? "Clube"}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{money(r.amount)}</span>
                <select
                  className="h-9 rounded-md border border-border bg-surface px-2 text-xs"
                  value={r.status}
                  onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value })}
                >
                  {PAY_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function FinanceOverview() {
  const { season } = useSeason();
  const { data: finance } = useQuery(financeQuery(season?.id));
  const { data: awards = [] } = useQuery(awardsQuery(season?.id));

  const affTotal = (finance?.affiliations ?? []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const affPaid = (finance?.affiliations ?? []).filter((a) => a.status === "paid").reduce((s, a) => s + Number(a.amount || 0), 0);
  const regTotal = (finance?.registrations ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const regPaid = (finance?.registrations ?? []).filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
  const awardTotal = awards.reduce((s, a) => s + Number(a.amount || 0), 0);
  const awardPaid = awards.filter((a) => a.status === "paid").reduce((s, a) => s + Number(a.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Filiação prevista" value={money(affTotal)} hint={`Recebido ${money(affPaid)}`} />
        <StatCard label="Inscrição prevista" value={money(regTotal)} hint={`Recebido ${money(regPaid)}`} />
        <StatCard label="Premiação total" value={money(awardTotal)} hint={`Pago ${money(awardPaid)}`} />
        <StatCard label="Saldo da Liga" value={money(affPaid + regPaid - awardPaid)} />
      </div>
      <Panel title="Separação das receitas">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Taxa de filiação:</strong> destinada à manutenção da Liga ({money(affTotal)}).
          </li>
          <li>
            <strong className="text-foreground">Taxa de inscrição:</strong> destinada integralmente à premiação ({money(regTotal)}).
          </li>
          <li>
            <strong className="text-foreground">Arbitragem:</strong> rateada entre mandante e visitante em cada partida.
          </li>
          <li>
            <strong className="text-foreground">Premiação:</strong> distribuída conforme as categorias configuradas.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

const AWARD_CATEGORIES = [
  "Campeão",
  "Vice-campeão",
  "Terceiro lugar",
  "Artilheiro",
  "Melhor goleiro",
  "Melhor jogador",
  "Outros",
];

export function AwardsSection() {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: awards = [] } = useQuery(awardsQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const [category, setCategory] = useState(AWARD_CATEGORIES[0]!);
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["awards"] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("awards").insert({
        season_id: season!.id,
        category,
        team_id: teamId || null,
        player_id: playerId || null,
        amount: Number(amount || 0),
        status: "pending",
      });
      if (error) throw error;
      await logAction("Premiação configurada", "awards", null, { category, amount });
    },
    onSuccess: () => {
      toast.success("Premiação registrada");
      setAmount("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Award> }) => {
      const { error } = await db.from("awards").update(input.patch).eq("id", input.id);
      if (error) throw error;
      await logAction("Premiação atualizada", "awards", input.id, input.patch);
    },
    onSuccess: () => {
      toast.success("Premiação atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("awards").delete().eq("id", id);
      if (error) throw error;
      await logAction("Premiação removida", "awards", id, null);
    },
    onSuccess: () => {
      toast.success("Premiação removida");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = awards.reduce((s, a) => s + Number(a.amount || 0), 0);
  const paid = awards.filter((a) => a.status === "paid").reduce((s, a) => s + Number(a.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Premiação total" value={money(total)} />
        <StatCard label="Distribuída" value={money(paid)} />
        <StatCard label="Pendente" value={money(total - paid)} />
      </div>
      <Panel title="Premiação da temporada">
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <SelectField label="Categoria" value={category} onChange={setCategory} options={AWARD_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <SelectField label="Clube" value={teamId} onChange={setTeamId} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="—" />
          <SelectField
            label="Atleta"
            value={playerId}
            onChange={setPlayerId}
            options={players.map((p) => ({ value: p.id, label: p.full_name }))}
            placeholder="—"
          />
          <TextField label="Valor" type="number" value={amount} onChange={setAmount} />
          <Button className="self-end" onClick={() => add.mutate()} disabled={!season}>
            + Adicionar
          </Button>
        </div>
        {awards.length === 0 && <EmptyState>Nenhuma premiação configurada nesta temporada.</EmptyState>}
        <div className="divide-y divide-border">
          {awards.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>
                <strong>{a.category}</strong> ·{" "}
                {teams.find((t) => t.id === a.team_id)?.name ?? players.find((p) => p.id === a.player_id)?.full_name ?? "—"}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{money(a.amount)}</span>
                <select
                  className="h-9 rounded-md border border-border bg-surface px-2 text-xs"
                  value={a.status}
                  onChange={(e) => update.mutate({ id: a.id, patch: { status: e.target.value } })}
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
                <Button size="sm" variant="destructive" onClick={() => remove.mutate(a.id)}>
                  Excluir
                </Button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
