import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md gradient-volt">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-stadium text-xl">Liga Regional</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Mais que um campeonato. Uma competição que constrói história.
          </p>
        </div>
        <FooterCol
          title="Competição"
          links={[
            { to: "/classificacao", label: "Classificação" },
            { to: "/jogos", label: "Jogos" },
            { to: "/artilharia", label: "Artilharia" },
            { to: "/estatisticas", label: "Estatísticas" },
          ]}
        />
        <FooterCol
          title="Liga"
          links={[
            { to: "/clubes", label: "Clubes" },
            { to: "/atletas", label: "Atletas" },
            { to: "/ranking", label: "Ranking histórico" },
            { to: "/regulamento", label: "Regulamento" },
          ]}
        />
        <FooterCol
          title="Institucional"
          links={[
            { to: "/sobre", label: "Sobre a Liga" },
            { to: "/noticias", label: "Notícias" },
            { to: "/contato", label: "Contato" },
            { to: "/auth", label: "Área restrita" },
          ]}
        />
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Liga Regional. Os clubes organizam seus jogos. A Liga organiza a competição.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
