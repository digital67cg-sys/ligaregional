import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadAccess } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/painel")({
  beforeLoad: async () => {
    const access = await loadAccess();
    if (access.roles.includes("admin")) throw redirect({ to: "/admin" });
    if (access.roles.includes("club_manager") && access.teamIds.length > 0) throw redirect({ to: "/clube" });
    if (access.playerId) throw redirect({ to: "/atleta" });
    throw redirect({ to: "/vincular" });
  },
  component: () => null,
});
