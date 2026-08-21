import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Cliente sem tipagem gerada — usado nos módulos administrativos. */
export const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: unknown) => any;
};

export async function rows<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await promise;
  if (error) throw error;
  return (data ?? []) as T[];
}

/** Registra uma ação administrativa no log de auditoria. */
export async function logAction(action: string, entity: string, entityId: string | null, details?: unknown) {
  await db.rpc("admin_log", {
    _action: action,
    _entity: entity,
    _entity_id: entityId,
    _details: details ?? null,
  });
}

export async function callRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export type SeasonTeam = { id: string; season_id: string; team_id: string; status: string };
export type Award = {
  id: string;
  season_id: string;
  category: string;
  team_id: string | null;
  player_id: string | null;
  amount: number;
  status: string;
  notes: string | null;
};
export type MaintenanceEntry = {
  id: string;
  season_id: string | null;
  admin_id: string | null;
  operation: string;
  description: string | null;
  affected_matches: number;
  backup_id: string | null;
  created_at: string;
};
export type Backup = { id: string; season_id: string; reason: string | null; created_at: string };
export type NewsItem = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  content: string | null;
  category: string;
  status: string;
  author: string | null;
  published_at: string;
};

export const seasonTeamsQuery = (seasonId: string | undefined) =>
  queryOptions({
    queryKey: ["season_teams", seasonId],
    enabled: !!seasonId,
    queryFn: () => rows<SeasonTeam>(db.from("season_teams").select("*").eq("season_id", seasonId)),
  });

export const awardsQuery = (seasonId: string | undefined) =>
  queryOptions({
    queryKey: ["awards", seasonId],
    enabled: !!seasonId,
    queryFn: () => rows<Award>(db.from("awards").select("*").eq("season_id", seasonId).order("created_at")),
  });

export const maintenanceQuery = queryOptions({
  queryKey: ["admin", "maintenance_log"],
  queryFn: () =>
    rows<MaintenanceEntry>(
      db.from("maintenance_log").select("*").order("created_at", { ascending: false }).limit(100),
    ),
});

export const backupsQuery = queryOptions({
  queryKey: ["admin", "season_backups"],
  queryFn: () =>
    rows<Backup>(
      db.from("season_backups").select("id, season_id, reason, created_at").order("created_at", { ascending: false }).limit(50),
    ),
});

export const adminNewsQuery = queryOptions({
  queryKey: ["admin", "news"],
  queryFn: () => rows<NewsItem>(db.from("news").select("*").order("published_at", { ascending: false })),
});

export const MAINTENANCE_LABEL: Record<string, string> = {
  generate_fixtures: "Geração de tabela",
  reset_sport: "Reset esportivo",
  reset_fixtures: "Reset de tabela",
  reset_season: "Reset total da temporada",
  restore_backup: "Restauração de backup",
};

export const NEWS_CATEGORIES = [
  "Liga",
  "Clubes",
  "Jogos",
  "Resultados",
  "Mercado",
  "Destaques",
  "Institucional",
] as const;

export const NEWS_STATUS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
};

export const MATCH_STATUS_OPTIONS = [
  { value: "to_define", label: "A definir" },
  { value: "scheduled", label: "Aguardando confirmação" },
  { value: "confirmed", label: "Confirmada" },
  { value: "live", label: "Em andamento" },
  { value: "finished", label: "Encerrada" },
  { value: "postponed", label: "Adiada" },
  { value: "canceled", label: "Cancelada" },
  { value: "wo", label: "W.O." },
];

export const PLAYER_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "review", label: "Em análise" },
  { value: "active", label: "Aprovado" },
  { value: "suspended", label: "Suspenso" },
  { value: "inactive", label: "Inativo" },
];

export const SEASON_STATUS_OPTIONS = [
  { value: "planning", label: "Planejamento" },
  { value: "registration", label: "Inscrições abertas" },
  { value: "in_progress", label: "Em andamento" },
  { value: "finished", label: "Encerrada" },
  { value: "archived", label: "Arquivada" },
];
