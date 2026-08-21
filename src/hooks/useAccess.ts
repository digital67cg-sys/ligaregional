import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type AppRole = "admin" | "club_manager" | "athlete";
export type AccessProfile = "admin" | "club_manager" | "athlete" | "user";

export type Access = {
  loading: boolean;
  userId: string | undefined;
  email: string | undefined;
  profile: AccessProfile;
  roles: AppRole[];
  teamIds: string[];
  teamId: string | null;
  playerId: string | null;
  playerName: string | null;
  pendingRequest: { id: string; requested_role: AppRole; status: string } | null;
  panelPath: "/admin" | "/clube" | "/atleta" | "/vincular";
  panelLabel: string;
};

const db = supabase as unknown as { from: (t: string) => any };

export function useAccess(): Access {
  const { user, loading: sessionLoading } = useSession();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["access", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [roles, managed, players, requests] = await Promise.all([
        db.from("user_roles").select("role").eq("user_id", userId),
        db.from("team_managers").select("team_id").eq("user_id", userId),
        db.from("players").select("id, full_name, current_team_id").eq("user_id", userId),
        db
          .from("membership_requests")
          .select("id, requested_role, status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      const player = (players.data ?? [])[0] ?? null;
      const request = (requests.data ?? [])[0] ?? null;
      return {
        roles: (roles.data ?? []).map((r: { role: AppRole }) => r.role) as AppRole[],
        teamIds: (managed.data ?? []).map((r: { team_id: string }) => r.team_id) as string[],
        playerId: (player?.id as string | undefined) ?? null,
        playerName: (player?.full_name as string | undefined) ?? null,
        playerTeamId: (player?.current_team_id as string | undefined) ?? null,
        pendingRequest: request && request.status === "pending" ? request : null,
      };
    },
  });

  const roles = query.data?.roles ?? [];
  const teamIds = query.data?.teamIds ?? [];
  const playerId = query.data?.playerId ?? null;

  let profile: AccessProfile = "user";
  if (roles.includes("admin")) profile = "admin";
  else if (roles.includes("club_manager") && teamIds.length > 0) profile = "club_manager";
  else if (playerId) profile = "athlete";

  const panelPath =
    profile === "admin" ? "/admin" : profile === "club_manager" ? "/clube" : profile === "athlete" ? "/atleta" : "/vincular";
  const panelLabel =
    profile === "admin"
      ? "Painel Administrativo"
      : profile === "club_manager"
        ? "Painel do Clube"
        : profile === "athlete"
          ? "Meu Painel"
          : "Configurar perfil";

  return {
    loading: sessionLoading || (!!userId && query.isLoading),
    userId,
    email: user?.email ?? undefined,
    profile,
    roles,
    teamIds,
    teamId: teamIds[0] ?? query.data?.playerTeamId ?? null,
    playerId,
    playerName: query.data?.playerName ?? null,
    pendingRequest: query.data?.pendingRequest ?? null,
    panelPath,
    panelLabel,
  };
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  club_manager: "Gestor de clube",
  athlete: "Atleta",
  user: "Usuário",
};
