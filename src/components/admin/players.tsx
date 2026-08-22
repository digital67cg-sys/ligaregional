import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton, Panel, SelectField, TextField } from "@/components/admin/ui";
import { db, logAction, PLAYER_STATUS_OPTIONS } from "@/lib/admin";
import { playersQuery, teamsQuery, type Player } from "@/lib/league";

type Form = {
  full_name: string;
  nickname: string;
  photo_url: string;
  birth_date: string;
  position: string;
  shirt_number: string;
  document: string;
  current_team_id: string;
  status: string;
};

const empty: Form = {
  full_name: "",
  nickname: "",
  photo_url: "",
  birth_date: "",
  position: "",
  shirt_number: "",
  document: "",
  current_team_id: "",
  status: "pending",
};

export function PlayersSection() {
  const qc = useQueryClient();
  const { data: players = [] } = useQuery(playersQuery);
  const { data: teams = [] } = useQuery(teamsQuery);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name,
        nickname: form.nickname || null,
        photo_url: form.photo_url || null,
        birth_date: form.birth_date || null,
        position: form.position || null,
        shirt_number: form.shirt_number ? Number(form.shirt_number) : null,
        document: form.document || null,
        current_team_id: form.current_team_id || null,
        status: form.status,
      };
      if (editing && editing !== "new") {
        const { error } = await db.from("players").update(payload).eq("id", editing);
        if (error) throw error;
        await logAction("Atleta atualizado", "players", editing, payload);
      } else {
        const { data, error } = await db.from("players").insert(payload).select("id").single();
        if (error) throw error;
        await logAction("Atleta cadastrado", "players", data.id, payload);
      }
    },
    onSuccess: () => {
      toast.success("Atleta salvo");
      setEditing(null);
      setForm(empty);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await db.from("players").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
      await logAction(`Atleta marcado como ${input.status}`, "players", input.id, null);
    },
    onSuccess: () => {
      toast.success("Situação atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("players").update({ status: "inactive", current_team_id: null }).eq("id", id);
      if (error) throw error;
      await logAction("Atleta removido do clube/temporada", "players", id, null);
    },
    onSuccess: () => {
      toast.success("Atleta removido da temporada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (p: Player & { document?: string | null }) => {
    setEditing(p.id);
    setForm({
      full_name: p.full_name,
      nickname: p.nickname ?? "",
      photo_url: p.photo_url ?? "",
      birth_date: p.birth_date ?? "",
      position: p.position ?? "",
      shirt_number: p.shirt_number ? String(p.shirt_number) : "",
      document: p.document ?? "",
      current_team_id: p.current_team_id ?? "",
      status: p.status,
    });
  };

  const filtered = players.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) &&
      (!teamFilter || p.current_team_id === teamFilter) &&
      (!statusFilter || p.status === statusFilter),
  );
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="space-y-4">
      <Panel
        title={`Atletas (${filtered.length})`}
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing("new");
              setForm(empty);
            }}
          >
            + Novo atleta
          </Button>
        }
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Input placeholder="Buscar atleta" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SelectField label="Clube" value={teamFilter} onChange={setTeamFilter} options={teamOptions} placeholder="Todos" />
          <SelectField label="Situação" value={statusFilter} onChange={setStatusFilter} options={PLAYER_STATUS_OPTIONS} placeholder="Todas" />
        </div>
        <div className="divide-y divide-border">
          {filtered.slice(0, 300).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-40">
                <p className="font-semibold">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {teams.find((t) => t.id === p.current_team_id)?.short_name ?? "sem clube"} · {p.position ?? "-"} ·{" "}
                  {PLAYER_STATUS_OPTIONS.find((o) => o.value === p.status)?.label ?? p.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>
                  Editar
                </Button>
                {p.status !== "active" && (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: p.id, status: "active" })}>
                    Aprovar
                  </Button>
                )}
                {p.status === "active" && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: p.id, status: "suspended" })}>
                    Suspender
                  </Button>
                )}
                <ConfirmButton
                  variant="secondary"
                  label="Remover da temporada"
                  title="Remover atleta"
                  description="O atleta será inativado e desvinculado do clube. O cadastro e o histórico esportivo são preservados."
                  onConfirm={() => remove.mutate(p.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {editing && (
        <Panel title={editing === "new" ? "Novo atleta" : "Editar atleta"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Nome completo" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <TextField label="Nome esportivo" value={form.nickname} onChange={(v) => setForm({ ...form, nickname: v })} />
            <TextField label="Foto (URL)" value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} />
            <TextField label="Nascimento" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
            <TextField label="Posição" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
            <TextField label="Número" type="number" value={form.shirt_number} onChange={(v) => setForm({ ...form, shirt_number: v })} />
            <TextField label="Documentação" value={form.document} onChange={(v) => setForm({ ...form, document: v })} />
            <SelectField
              label="Clube"
              value={form.current_team_id}
              onChange={(v) => setForm({ ...form, current_team_id: v })}
              options={teamOptions}
              placeholder="Sem clube"
            />
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={PLAYER_STATUS_OPTIONS} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.full_name}>
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
