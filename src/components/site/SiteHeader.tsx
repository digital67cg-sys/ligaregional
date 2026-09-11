import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Trophy, LogIn, LayoutDashboard } from "lucide-react";
import { useSeason } from "@/context/season";
import { useSession } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { SEASON_STATUS } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEAGUE_NAV = [
  { to: "/classificacao", label: "Classificação" },
  { to: "/jogos", label: "Jogos" },
  { to: "/clubes", label: "Clubes" },
  { to: "/atletas", label: "Atletas" },
  { to: "/artilharia", label: "Artilharia" },
  { to: "/estatisticas", label: "Estatísticas" },
  { to: "/ranking", label: "Ranking" },
  { to: "/noticias", label: "Notícias" },
  { to: "/regulamento", label: "Regulamento" },
  { to: "/sobre", label: "A Liga" },
  { to: "/contato", label: "Contato" },
] as const;

const CUP_NAV = [
  { to: "/", label: "Início" },
  { to: "/jogos", label: "Jogos" },
  { to: "/taca-regional", label: "Grupos" },
  { to: "/classificacao", label: "Classificação" },
  { to: "/taca-regional", label: "Mata-mata" },
  { to: "/artilharia", label: "Artilharia" },
  { to: "/ranking", label: "Ranking" },
  { to: "/regulamento", label: "Regulamento" },
  { to: "/noticias", label: "Notícias" },
  { to: "/contato", label: "Contato" },
] as const;

function seasonLabel(season: { name: string; year?: number | null }) {
  const name = String(season.name);
  const year = season.year ? String(season.year) : "";
  return year && name.includes(year) ? name : `${name}${year ? ` ${year}` : ""}`;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { seasons, season, setSeasonId } = useSeason();
  const { user } = useSession();
  const access = useAccess();
  const navigate = useNavigate();
  const isCup = season?.competition_type === "grupos_mata_mata";
  const nav = isCup ? CUP_NAV : LEAGUE_NAV;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md gradient-volt">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="leading-none">
            <span className="block text-stadium text-lg uppercase">LIGA REGIONAL</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {season
                ? `${season.year} • ${isCup ? `${season.name} • ` : ""}${SEASON_STATUS[season.status] ?? season.status}`
                : "TEMPORADA"}
            </span>
          </span>
        </Link>

        <nav className="ml-6 hidden flex-1 items-center gap-1 xl:flex">
          {nav.slice(0, 8).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {seasons.length > 0 && (
            <select
              aria-label="Selecionar competição"
              value={season?.id ?? ""}
              onChange={(e) => setSeasonId(e.target.value)}
              className="hidden h-9 max-w-[200px] truncate rounded-md border border-border bg-surface px-2 text-xs font-semibold uppercase tracking-wide text-foreground sm:block"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {seasonLabel(s)}
                </option>
              ))}
            </select>
          )}
          {user ? (
            <Button size="sm" onClick={() => navigate({ to: access.panelPath })}>
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">{access.panelLabel}</span>
              <span className="sm:hidden">Painel</span>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/auth" })}>
              <LogIn className="mr-1.5 h-4 w-4" /> Entrar
            </Button>
          )}
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface xl:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border bg-surface xl:hidden",
          open ? "max-h-[70vh]" : "max-h-0 border-t-0",
        )}
      >
        <div className="px-3 pt-3">
          {seasons.length > 0 && (
            <select
              aria-label="Selecionar competição no celular"
              value={season?.id ?? ""}
              onChange={(e) => setSeasonId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold uppercase tracking-wide text-foreground"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {seasonLabel(s)}
                </option>
              ))}
            </select>
          )}
        </div>
        <nav className="grid grid-cols-2 gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
