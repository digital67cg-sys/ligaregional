import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton, EmptyState, Field, Panel, TextField } from "@/components/admin/ui";
import { db, logAction, rows } from "@/lib/admin";
import { leagueSettingsQuery, regulationsQuery } from "@/lib/league";
import { useSeason } from "@/context/season";

export function RegulationSection() {
  const qc = useQueryClient();
  const { season } = useSeason();
  const { data: regulations = [] } = useQuery(regulationsQuery);
  const [version, setVersion] = useState("1.0");
  const [fileUrl, setFileUrl] = useState("");
  const [content, setContent] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["regulations"] });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("regulations").insert({
        season_id: season?.id ?? null,
        version,
        file_url: fileUrl || null,
        content: content || null,
      });
      if (error) throw error;
      await logAction("Regulamento publicado", "regulations", null, { version });
    },
    onSuccess: () => {
      toast.success("Regulamento publicado");
      setContent("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("regulations").delete().eq("id", id);
      if (error) throw error;
      await logAction("Versão de regulamento removida", "regulations", id, null);
    },
    onSuccess: () => {
      toast.success("Versão removida");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Panel title="Nova versão do regulamento">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Versão" value={version} onChange={setVersion} />
          <TextField label="Arquivo PDF (URL)" value={fileUrl} onChange={setFileUrl} />
          <div className="sm:col-span-2">
            <Field label="Texto do regulamento">
              <textarea
                className="min-h-48 w-full rounded-md border border-border bg-surface p-2 text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <Button className="mt-3" onClick={() => save.mutate()} disabled={!version}>
          Publicar versão
        </Button>
      </Panel>

      <Panel title="Versões publicadas">
        {regulations.length === 0 && <EmptyState>Nenhuma versão publicada.</EmptyState>}
        <div className="divide-y divide-border">
          {regulations.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-semibold">Versão {r.version}</span>
              <span className="text-xs text-muted-foreground">
                atualizado em {new Date(r.updated_at).toLocaleDateString("pt-BR")}
              </span>
              <ConfirmButton
                label="Excluir"
                title="Excluir versão"
                description="Essa versão do regulamento deixará de aparecer na área pública."
                onConfirm={() => remove.mutate(r.id)}
              />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

type SettingsForm = {
  league_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  instagram: string;
  logo_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  ranking_points: string;
};

export function SettingsSection() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(leagueSettingsQuery);
  const [form, setForm] = useState<SettingsForm | null>(null);

  useEffect(() => {
    if (!settings || form) return;
    const s = settings as unknown as Record<string, unknown>;
    setForm({
      league_name: (s['league_name'] as string) ?? "",
      tagline: (s['tagline'] as string) ?? "",
      contact_email: (s['contact_email'] as string) ?? "",
      contact_phone: (s['contact_phone'] as string) ?? "",
      instagram: (s['instagram'] as string) ?? "",
      logo_url: (s['logo_url'] as string) ?? "",
      maintenance_mode: Boolean(s['maintenance_mode']),
      maintenance_message: (s['maintenance_message'] as string) ?? "",
      ranking_points: JSON.stringify(s['ranking_points'] ?? {}, null, 2),
    });
  }, [settings, form]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      let rankingPoints: unknown;
      try {
        rankingPoints = JSON.parse(form.ranking_points || "{}");
      } catch {
        throw new Error("Pontuação do ranking precisa ser um JSON válido");
      }
      const { error } = await db
        .from("league_settings")
        .update({
          league_name: form.league_name,
          tagline: form.tagline,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          instagram: form.instagram || null,
          logo_url: form.logo_url || null,
          maintenance_mode: form.maintenance_mode,
          maintenance_message: form.maintenance_message || null,
          ranking_points: rankingPoints,
        })
        .eq("id", 1);
      if (error) throw error;
      await logAction("Configurações da Liga atualizadas", "league_settings", null, null);
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["league_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) return <EmptyState>Carregando configurações…</EmptyState>;

  return (
    <Panel title="Configurações da Liga">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Nome da Liga" value={form.league_name} onChange={(v) => setForm({ ...form, league_name: v })} />
        <TextField label="Slogan" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
        <TextField label="E-mail de contato" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
        <TextField label="Telefone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
        <TextField label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
        <TextField label="Logo (URL)" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
        <div className="sm:col-span-2">
          <Field label="Pontuação do ranking histórico (JSON)">
            <textarea
              className="min-h-32 w-full rounded-md border border-border bg-surface p-2 font-mono text-xs"
              value={form.ranking_points}
              onChange={(e) => setForm({ ...form, ranking_points: e.target.value })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2 space-y-2 rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.maintenance_mode}
              onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
            />
            Modo manutenção na área pública
          </label>
          <TextField
            label="Mensagem de manutenção"
            value={form.maintenance_message}
            onChange={(v) => setForm({ ...form, maintenance_message: v })}
          />
        </div>
      </div>
      <Button className="mt-3" onClick={() => save.mutate()}>
        Salvar configurações
      </Button>
    </Panel>
  );
}

export function LogsSection() {
  const { data: logs = [] } = useQuery({
    queryKey: ["admin", "audit_log"],
    queryFn: () =>
      rows<{ id: string; action: string; entity: string | null; created_at: string; details: unknown }>(
        db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      ),
  });

  return (
    <Panel title="Logs de auditoria">
      {logs.length === 0 && <EmptyState>Sem registros.</EmptyState>}
      <div className="divide-y divide-border">
        {logs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              {l.action}
              {l.entity ? ` · ${l.entity}` : ""}
            </span>
            <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
