import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel, SelectField, TextField, Field } from "@/components/admin/ui";
import { db, logAction, SEASON_STATUS_OPTIONS } from "@/lib/admin";
import { seasonsQuery, type Season } from "@/lib/league";
import { useSeason } from "@/context/season";

type Form = {
  name: string;
  year: string;
  start_date: string;
  end_date: string;
  status: string;
  competition_type: string;
  registration_fee: string;
  affiliation_fee: string;
  transfer_window_start: string;
  transfer_window_end: string;
  notes: string;
};

const COMPETITION_TYPE_OPTIONS = [
  { value: "pontos_corridos", label: "Pontos Corridos" },
  { value: "grupos_mata_mata", label: "Grupos + Mata-Mata" },
];

const empty: Form = {
  name: "",
  year: String(new Date().getFullYear()),
  start_date: "",
  end_date: "",
  status: "planning",
  competition_type: "pontos_corridos",
  registration_fee: "0",
  affiliation_fee: "0",
  transfer_window_start: "",
  transfer_window_end: "",
  notes: "",
};

export function SeasonsSection() {
  const qc = useQueryClient();
  const { data: seasons = [] } = useQuery(seasonsQuery);
  const { seasonId, setSeasonId } = useSeason();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["seasons"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        year: Number(form.year),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        competition_type: form.competition_type,
        registration_fee: Number(form.registration_fee || 0),
        affiliation_fee: Number(form.affiliation_fee || 0),
        transfer_window_start: form.transfer_window_start || null,
        transfer_window_end: form.transfer_window_end || null,
        notes: form.notes || null,
      };
      if (editing && editing !== "new") {
        const { error } = await db.from("seasons").update(payload).eq("id", editing);
        if (error) throw error;
        await logAction("Temporada atualizada", "seasons", editing, payload);
      } else {
        const { data, error } = await db.from("seasons").insert(payload).select("id").single();
        if (error) throw error;
        await logAction("Temporada criada", "seasons", data.id, payload);
      }
    },
    onSuccess: () => {
      toast.success("Temporada salva");
      setEditing(null);
      setForm(empty);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await db.from("seasons").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
      await logAction(`Temporada marcada como ${input.status}`, "seasons", input.id, null);
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setCurrent = useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await db.from("seasons").update({ is_current: false }).neq("id", id);
      if (e1) throw e1;
      const { error } = await db.from("seasons").update({ is_current: true }).eq("id", id);
      if (error) throw error;
      await logAction("Temporada ativa alterada", "seasons", id, null);
    },
    onSuccess: (_d, id) => {
      toast.success("Temporada ativa definida");
      setSeasonId(id);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (s: Season & { notes?: string | null; competition_type?: string }) => {
    setEditing(s.id);
    setForm({
      name: s.name,
      year: String(s.year),
      start_date: s.start_date ?? "",
      end_date: s.end_date ?? "",
      status: s.status,
      competition_type: s.competition_type ?? "pontos_corridos",
      registration_fee: String(s.registration_fee ?? 0),
      affiliation_fee: String(s.affiliation_fee ?? 0),
      transfer_window_start: s.transfer_window_start ?? "",
      transfer_window_end: s.transfer_window_end ?? "",
      notes: s.notes ?? "",
    });
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Temporadas"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing("new");
              setForm(empty);
            }}
          >
            + Nova temporada
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {seasons.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-display font-bold uppercase">
                  {s.name} {s.is_current && <span className="text-primary">· atual</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.year} · {(s as any).competition_type === 'grupos_mata_mata' ? 'Grupos + Mata-Mata' : 'Pontos Corridos'} · {SEASON_STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status} · Filiação R${" "}
                  {s.affiliation_fee} · Inscrição R$ {s.registration_fee}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSeasonId(s.id)} disabled={seasonId === s.id}>
                  Selecionar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => startEdit(s)}>
                  Editar
                </Button>
                {!s.is_current && (
                  <Button size="sm" variant="secondary" onClick={() => setCurrent.mutate(s.id)}>
                    Tornar ativa
                  </Button>
                )}
                {s.status !== "finished" ? (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: s.id, status: "finished" })}>
                    Encerrar
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: s.id, status: "in_progress" })}>
                    Reabrir
                  </Button>
                )}
                {s.status !== "archived" && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: s.id, status: "archived" })}>
                    Arquivar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {editing && (
        <Panel title={editing === "new" ? "Nova temporada" : "Editar temporada"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <TextField label="Ano" type="number" value={form.year} onChange={(v) => setForm({ ...form, year: v })} />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={SEASON_STATUS_OPTIONS}
            />
            <SelectField
              label="Tipo de competição"
              value={form.competition_type}
              onChange={(v) => setForm({ ...form, competition_type: v })}
              options={COMPETITION_TYPE_OPTIONS}
            />
            <TextField label="Data inicial" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
            <TextField label="Data final" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            <TextField
              label="Taxa de filiação (manutenção da Liga)"
              type="number"
              value={form.affiliation_fee}
              onChange={(v) => setForm({ ...form, affiliation_fee: v })}
            />
            <TextField
              label="Taxa de inscrição (premiação)"
              type="number"
              value={form.registration_fee}
              onChange={(v) => setForm({ ...form, registration_fee: v })}
            />
            <TextField
              label="Janela de transferências — abertura"
              type="date"
              value={form.transfer_window_start}
              onChange={(v) => setForm({ ...form, transfer_window_start: v })}
            />
            <TextField
              label="Janela de transferências — fechamento"
              type="date"
              value={form.transfer_window_end}
              onChange={(v) => setForm({ ...form, transfer_window_end: v })}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Observações">
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-surface p-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.name}>
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
