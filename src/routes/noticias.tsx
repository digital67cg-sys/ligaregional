import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { newsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias — Liga Regional" },
      { name: "description", content: "Comunicados oficiais, notas e novidades da Liga Regional." },
      { property: "og:title", content: "Notícias — Liga Regional" },
      { property: "og:description", content: "Tudo o que acontece na competição." },
    ],
  }),
  component: Noticias,
});

function Noticias() {
  const { data: news = [] } = useQuery(newsQuery);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader title="Notícias" subtitle="Comunicados oficiais e novidades da organização" />
      <div className="space-y-4">
        {news.map((n) => (
          <article key={n.id} className="surface-card p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {n.category}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.published_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold uppercase leading-tight">{n.title}</h2>
            {n.subtitle && <p className="mt-1 text-sm text-muted-foreground">{n.subtitle}</p>}
            {n.content && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{n.content}</p>}
          </article>
        ))}
        {news.length === 0 && (
          <p className="surface-card p-4 text-sm text-muted-foreground">Nenhuma notícia publicada.</p>
        )}
      </div>
    </div>
  );
}
