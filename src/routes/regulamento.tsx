import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { regulationsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/regulamento")({
  head: () => ({
    meta: [
      { title: "Regulamento — Liga Regional" },
      { name: "description", content: "Regulamento oficial da Liga Regional: formato, disciplina, transferências e arbitragem." },
      { property: "og:title", content: "Regulamento — Liga Regional" },
      { property: "og:description", content: "Regras oficiais da competição em pontos corridos." },
    ],
  }),
  component: Regulamento,
});

function Regulamento() {
  const { data: regs = [] } = useQuery(regulationsQuery);
  const current = regs[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Regulamento"
        subtitle={current ? `Versão ${current.version} · atualizado em ${new Date(current.updated_at).toLocaleDateString("pt-BR")}` : undefined}
      />
      <article className="surface-card whitespace-pre-line p-6 text-sm leading-relaxed">
        {current?.content ?? "Regulamento em elaboração pela organização da Liga."}
      </article>
      {current?.file_url && (
        <a
          href={current.file_url}
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Baixar PDF do regulamento
        </a>
      )}
    </div>
  );
}
