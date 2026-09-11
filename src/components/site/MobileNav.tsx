import { Link } from "@tanstack/react-router";
import { Home, CalendarDays, ListOrdered, Trophy, Menu, Layers } from "lucide-react";
import { useSeason } from "@/context/season";

const LEAGUE_ITEMS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/classificacao", label: "Tabela", icon: ListOrdered },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/sobre", label: "Menu", icon: Menu },
] as const;

const CUP_ITEMS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/taca-regional", label: "Grupos", icon: Layers },
  { to: "/classificacao", label: "Tabela", icon: ListOrdered },
  { to: "/sobre", label: "Menu", icon: Menu },
] as const;

export function MobileNav() {
  const { season } = useSeason();
  const items = season?.competition_type === "grupos_mata_mata" ? CUP_ITEMS : LEAGUE_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
