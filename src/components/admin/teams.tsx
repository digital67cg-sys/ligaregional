import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton, Panel, SelectField, TextField } from "@/components/admin/ui";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { callRpc, db, logAction, seasonTeamsQuery } from "@/lib/admin";
import { teamsQuery, type Team } from "@/lib/league";
import { useSeason } from "@/context/season";

type Form = {
  name: string;
  short_name: string;
  crest_url: string;
  city: string;
  district: string;
  colors: string;
  founded_year: string;
  responsible_name: string;
  phone: string;
  email: string;
  instagram: string;
  status: string;
};

const empty: Form = {
  name: "",
  short_name: "",
  crest_url: "",
  city: "",
  district: "",
  colors: "",
  founded_year: "",
  responsible_name: "",
  phone: "",
  email: "",
  instagram: "",
  status: "active",
};

export function TeamsSection() {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: seasonTeams = [] } = useQuery(seasonTeamsQuery(season?.id));
  const { data: matches = [] } = useQuery({
    queryKey: ["admin", "season_matches", season?.id],
    enabled: !!season?.id,
    queryFn: async () => {
      const { data, error } = await db.from("matches").select("id, home_team_id, away_team_id").eq("season_id", season!.id);
      if (error) throw error;
      return (data ?? []) as { id: string; home_team_id: string; away_team_id: string }[];
    },
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const inSeason = useMemo(() => new Set(seasonTeams.map((s) => s.team_id)), [seasonTeams]);
  const matchCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of matches) {
      m.set(x.home_team_id, (m.get(x.home_team_id) ?? 0) + 1);
      m.set(x.away_team_id, (m.get(x.away_team_id) ?? 0) + 1);
    }
    return m;
  }, [matches]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["teams"] });
    qc.invalidateQueries({ queryKey: ["season_teams"] });
    qc.invalidateQueries({ queryKey: ["standings"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        short_name: form.short_name || form.name.slice(0, 3).toUpperCase(),
        crest_url: form.crest_url || null,
        city: form.city || null,
        district: form.district || null,
        colors: form.colors || null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        responsible_name: form.responsible_name || null,
        phone: form.phone || null,
        email: form.email || null,
        instagram: form.instagram || null,
        status: form.status,
      };
      if (editing && editing !== "new") {
        const { error } = await db.from("teams").update(payload).eq("id", editing);
        if (error) throw error;
        await logAction("Clube atualizado", "teams", editing, payload);
      } else {
        const { data, error } = await db.from("teams").insert(payload).select("id").single();
        if (error) throw error;
        await logAction("Clube criado", "teams", data.id, payload);
      }
    },
    onSuccess: () => {
      toast.success("Clube salvo");
      setEditing(null);
      setForm(empty);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveError = save.error instanceof Error ? save.error.message : null;

  const toggleSeason = useMutation({
    mutationFn: async (input: { teamId: string; add: boolean }) => {
      if (!season) throw new Error("Selecione uma temporada");
      if (input.add) {
        const { error } = await db.from("season_teams").insert({ season_id: season.id, team_id: input.teamId, status: "active" });
        if (error) throw error;
        await logAction("Clube adicionado à temporada", "season_teams", input.teamId, { season: season.name });
      } else {
        const { error } = await db.from("season_teams").delete().eq("season_id", season.id).eq("team_id", input.teamId);
        if (error) throw error;
        await logAction("Clube removido da temporada", "season_teams", input.teamId, { season: season.name });
      }
    },
    onSuccess: () => {
      toast.success("Temporada atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (input: { id: string; force: boolean }) => {
      await callRpc("admin_delete_team", { _team_id: input.id, _force: input.force });
    },
    onSuccess: () => {
      toast.success("Operação concluída");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (t: Team) => {
    setEditing(t.id);
    setForm({
      name: t.name,
      short_name: t.short_name,
      crest_url: t.crest_url ?? "",
      city: t.city ?? "",
      district: t.district ?? "",
      colors: t.colors ?? "",
      founded_year: t.founded_year ? String(t.founded_year) : "",
      responsible_name: t.responsible_name ?? "",
      phone: t.phone ?? "",
      email: t.email ?? "",
      instagram: t.instagram ?? "",
      status: t.status,
    });
  };

  const filtered = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <Panel
        title={`Clubes (${teams.length}) · ${inSeason.size} na temporada`}
        action={
          <div className="flex gap-2">
            <Input className="h-9 w-40" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button
              size="sm"
              onClick={() => {
                setEditing("new");
                setForm(empty);
              }}
            >
              + Nova equipe
            </Button>
          </div>
        }
      >
        <div className="divide-y divide-border">
          {filtered.map((t) => {
            const games = matchCount.get(t.id) ?? 0;
            return (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-40">
                  <p className="font-display font-bold uppercase">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.short_name} · {t.city ?? "-"} · {t.status}
                    {inSeason.has(t.id) ? " · na temporada" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>
                    Editar
                  </Button>
                  {inSeason.has(t.id) ? (
                    <ConfirmButton
                      variant="secondary"
                      label="Remover da temporada"
                      title="Remover equipe da temporada"
                      description={
                        games > 0
                          ? `Esta equipe possui ${games} partida(s) registradas nesta temporada. A remoção poderá afetar a tabela e as estatísticas. As partidas não serão apagadas automaticamente.`
                          : "A equipe deixará de participar desta temporada. O cadastro e o histórico serão preservados."
                      }
                      onConfirm={() => toggleSeason.mutate({ teamId: t.id, add: false })}
                    />
                  ) : (
                    <Button size="sm" onClick={() => toggleSeason.mutate({ teamId: t.id, add: true })}>
                      Adicionar à temporada
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      db
                        .from("teams")
                        .update({ status: t.status === "active" ? "suspended" : "active" })
                        .eq("id", t.id)
                        .then(() => refresh())
                    }
                  >
                    {t.status === "active" ? "Suspender" : "Reativar"}
                  </Button>
                  <ConfirmButton
                    label="Excluir"
                    title="Excluir definitivamente"
                    description="Se o clube possuir histórico na Liga, ele será apenas inativado e removido das temporadas — a história nunca é apagada. Caso não possua histórico, o cadastro será excluído."
                    confirmWord="EXCLUIR"
                    onConfirm={() => remove.mutate({ id: t.id, force: true })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {editing && (
        <Panel title={editing === "new" ? "Nova equipe" : "Editar equipe"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <TextField label="Nome abreviado" value={form.short_name} onChange={(v) => setForm({ ...form, short_name: v })} />
            <TextField label="Escudo (URL)" value={form.crest_url} onChange={(v) => setForm({ ...form, crest_url: v })} />
            <TextField label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <TextField label="Bairro / região" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
            <TextField label="Cores" value={form.colors} onChange={(v) => setForm({ ...form, colors: v })} />
            <TextField label="Fundação" type="number" value={form.founded_year} onChange={(v) => setForm({ ...form, founded_year: v })} />
            <TextField label="Responsável" value={form.responsible_name} onChange={(v) => setForm({ ...form, responsible_name: v })} />
            <TextField label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <TextField label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <TextField label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={[
                { value: "active", label: "Ativo" },
                { value: "suspended", label: "Suspenso" },
                { value: "inactive", label: "Inativo" },
              ]}
            />
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
