import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton, EmptyState, Field, Panel, SelectField, TextField } from "@/components/admin/ui";
import { adminNewsQuery, db, logAction, NEWS_CATEGORIES, NEWS_STATUS, type NewsItem } from "@/lib/admin";

type Form = {
  title: string;
  subtitle: string;
  image_url: string;
  content: string;
  category: string;
  author: string;
  status: string;
  published_at: string;
};

const empty: Form = {
  title: "",
  subtitle: "",
  image_url: "",
  content: "",
  category: "Liga",
  author: "",
  status: "draft",
  published_at: new Date().toISOString().slice(0, 10),
};

export function NewsSection() {
  const qc = useQueryClient();
  const { data: news = [] } = useQuery(adminNewsQuery);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["news"] });
    qc.invalidateQueries({ queryKey: ["admin", "news"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        image_url: form.image_url || null,
        content: form.content || null,
        category: form.category,
        author: form.author || null,
        status: form.status,
        published_at: new Date(`${form.published_at}T12:00:00`).toISOString(),
      };
      if (editing && editing !== "new") {
        const { error } = await db.from("news").update(payload).eq("id", editing);
        if (error) throw error;
        await logAction("Notícia atualizada", "news", editing, { titulo: payload.title });
      } else {
        const { data, error } = await db.from("news").insert(payload).select("id").single();
        if (error) throw error;
        await logAction("Notícia criada", "news", data.id, { titulo: payload.title });
      }
    },
    onSuccess: () => {
      toast.success("Notícia salva");
      setEditing(null);
      setForm(empty);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await db.from("news").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
      await logAction(`Notícia marcada como ${NEWS_STATUS[input.status] ?? input.status}`, "news", input.id, null);
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("news").delete().eq("id", id);
      if (error) throw error;
      await logAction("Notícia excluída", "news", id, null);
    },
    onSuccess: () => {
      toast.success("Notícia excluída");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (n: NewsItem) => {
    setEditing(n.id);
    setForm({
      title: n.title,
      subtitle: n.subtitle ?? "",
      image_url: n.image_url ?? "",
      content: n.content ?? "",
      category: n.category,
      author: n.author ?? "",
      status: n.status ?? "published",
      published_at: n.published_at.slice(0, 10),
    });
  };

  return (
    <div className="space-y-4">
      <Panel
        title={`Notícias (${news.length})`}
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing("new");
              setForm(empty);
            }}
          >
            + Nova notícia
          </Button>
        }
      >
        {news.length === 0 && <EmptyState>Nenhuma notícia publicada.</EmptyState>}
        <div className="divide-y divide-border">
          {news.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-48">
                <p className="font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">
                  {n.category} · {NEWS_STATUS[n.status] ?? n.status} · {new Date(n.published_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => startEdit(n)}>
                  Editar
                </Button>
                {n.status !== "published" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: n.id, status: "published" })}>
                    Publicar
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: n.id, status: "draft" })}>
                    Despublicar
                  </Button>
                )}
                {n.status !== "archived" && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: n.id, status: "archived" })}>
                    Arquivar
                  </Button>
                )}
                <ConfirmButton
                  label="Excluir"
                  title="Excluir notícia"
                  description="A notícia será removida definitivamente da área pública."
                  onConfirm={() => remove.mutate(n.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {editing && (
        <Panel title={editing === "new" ? "Nova notícia" : "Editar notícia"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <TextField label="Subtítulo" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
            <TextField label="Imagem (URL)" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
            <SelectField
              label="Categoria"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              options={NEWS_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <TextField label="Autor" value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
            <TextField label="Data" type="date" value={form.published_at} onChange={(v) => setForm({ ...form, published_at: v })} />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={Object.entries(NEWS_STATUS).map(([value, label]) => ({ value, label }))}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Conteúdo">
                <textarea
                  className="min-h-40 w-full rounded-md border border-border bg-surface p-2 text-sm"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.title}>
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
