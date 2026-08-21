import { Link } from "@tanstack/react-router";
import { Home, CalendarDays, ListOrdered, Trophy, Menu } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/jogos", label: "Jogos", icon: CalendarDays },
  { to: "/classificacao", label: "Tabela", icon: ListOrdered },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/sobre", label: "Menu", icon: Menu },
] as const;

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon }) => (
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
