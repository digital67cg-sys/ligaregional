import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Erros de autorização nunca podem ser silenciados como "usuário sem perfil":
 * uma falha de leitura (RLS, privilégio, rede) rebaixaria um administrador
 * legítimo a usuário comum. Falhamos de forma explícita.
 */
function assertNoError(result: { error?: { message?: string } | null }, what: string) {
  if (result?.error) {
    throw new Error(`Falha ao verificar permissões (${what}): ${result.error.message ?? "erro desconhecido"}`);
  }
}

export async function loadAccess() {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw redirect({ to: "/auth" });

  const [roles, managed, players] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId),
    db.from("team_managers").select("team_id").eq("user_id", userId),
    db.from("players").select("id").eq("user_id", userId),
  ]);

  assertNoError(roles, "perfis");
  assertNoError(managed, "clubes gerenciados");
  assertNoError(players, "cadastro de atleta");

  const roleList: string[] = (roles.data ?? []).map((r: { role: string }) => r.role);
  const teamIds: string[] = (managed.data ?? []).map((r: { team_id: string }) => r.team_id);
  const playerId: string | null = (players.data ?? [])[0]?.id ?? null;

  return { userId, roles: roleList, teamIds, playerId };
}


export async function requireAdmin() {
  const access = await loadAccess();
  if (!access.roles.includes("admin")) throw redirect({ to: "/vincular" });
  return access;
}

export async function requireClubManager() {
  const access = await loadAccess();
  if (access.roles.includes("admin")) return access;
  if (!access.roles.includes("club_manager") || access.teamIds.length === 0) throw redirect({ to: "/vincular" });
  return access;
}

export async function requireAthlete() {
  const access = await loadAccess();
  if (!access.playerId) throw redirect({ to: "/vincular" });
  return access;
}
