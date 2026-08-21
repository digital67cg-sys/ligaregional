import { Link } from "@tanstack/react-router";
import { TeamCrest } from "./TeamCrest";
import { pct, type StandingRow, type Team } from "@/lib/league";
import { cn } from "@/lib/utils";

export function StandingsTable({
  rows,
  teams,
  compact = false,
  limit,
}: {
  rows: StandingRow[];
  teams: Map<string, Team>;
  compact?: boolean;
  limit?: number;
}) {
  const list = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="overflow-hidden surface-card">
      <table className="w-full num-tabular text-sm">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="w-10 px-3 py-3 text-left">Pos</th>
            <th className="px-1 py-3 text-left">Clube</th>
            <th className="px-2 py-3 text-right font-bold text-foreground">P</th>
            <th className="px-2 py-3 text-right">J</th>
            <th className={cn("px-2 py-3 text-right", compact && "hidden sm:table-cell")}>V</th>
            <th className={cn("px-2 py-3 text-right", compact && "hidden sm:table-cell")}>E</th>
            <th className={cn("px-2 py-3 text-right", compact && "hidden sm:table-cell")}>D</th>
            <th className="hidden px-2 py-3 text-right md:table-cell">GP</th>
            <th className="hidden px-2 py-3 text-right md:table-cell">GC</th>
            <th className="px-2 py-3 text-right">SG</th>
            <th className="hidden px-3 py-3 text-right lg:table-cell">AP</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row, i) => {
            const team = teams.get(row.team_id);
            return (
              <tr
                key={row.team_id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/60"
              >
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded font-display text-xs font-extrabold",
                      i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-1 py-2.5">
                  <Link
                    to="/clubes/$teamId"
                    params={{ teamId: row.team_id }}
                    className="flex items-center gap-2 font-semibold hover:text-primary"
                  >
                    <TeamCrest size="sm" name={team?.name} short={team?.short_name} crest={team?.crest_url} />
                    <span className="hidden truncate sm:inline">{team?.name ?? "—"}</span>
                    <span className="sm:hidden">{team?.short_name ?? "—"}</span>
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-right font-display text-base font-extrabold">{row.points}</td>
                <td className="px-2 py-2.5 text-right text-muted-foreground">{row.played}</td>
                <td className={cn("px-2 py-2.5 text-right text-muted-foreground", compact && "hidden sm:table-cell")}>
                  {row.wins}
                </td>
                <td className={cn("px-2 py-2.5 text-right text-muted-foreground", compact && "hidden sm:table-cell")}>
                  {row.draws}
                </td>
                <td className={cn("px-2 py-2.5 text-right text-muted-foreground", compact && "hidden sm:table-cell")}>
                  {row.losses}
                </td>
                <td className="hidden px-2 py-2.5 text-right text-muted-foreground md:table-cell">{row.goals_for}</td>
                <td className="hidden px-2 py-2.5 text-right text-muted-foreground md:table-cell">
                  {row.goals_against}
                </td>
                <td className="px-2 py-2.5 text-right text-muted-foreground">
                  {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                </td>
                <td className="hidden px-3 py-2.5 text-right text-muted-foreground lg:table-cell">{pct(row)}%</td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                Sem dados de classificação para esta temporada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
