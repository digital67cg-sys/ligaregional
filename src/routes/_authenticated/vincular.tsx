import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/useAccess";
import { playersQuery, teamsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/vincular")({
  component: Vincular,
  head: () => ({
    meta: [
      { title: "Configure seu perfil · Liga Regional" },
      { name: "description", content: "Solicite seu vínculo como atleta ou gestor de clube na Liga Regional." },
      { property: "og:title", content: "Configure seu perfil · Liga Regional" },
      { property: "og:description", content: "Solicite seu vínculo como atleta ou gestor de clube na Liga Regional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: unknown) => any };

function Vincular() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const access = useAccess();
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const [kind, setKind] = useState<"club_manager" | "athlete" | null>(null);
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [message, setMessage] = useState("");

  const { data: hasAdmin } = useQuery({
    queryKey: ["has_any_admin"],
    queryFn: async () => {
      const { data } = await db.rpc("has_any_admin");
      return data as boolean;
    },
  });

  const claimAdmin = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("claim_first_admin");
      if (error) throw error;
      if (!data) throw new Error("A Liga já possui um administrador.");
    },
    onSuccess: async () => {
      toast.success("Você agora é o administrador da Liga");
      await queryClient.invalidateQueries();
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("membership_requests").insert({
        user_id: access.userId,
        requested_role: kind,
        team_id: kind === "club_manager" ? teamId || null : playerId ? players.find((p) => p.id === playerId)?.current_team_id ?? null : null,
        player_id: kind === "athlete" ? playerId || null : null,
        message: message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada para a organização");
      queryClient.invalidateQueries({ queryKey: ["access"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (access.profile !== "user" && !access.loading) {
    navigate({ to: access.panelPath, replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Configure seu perfil"
        subtitle="Para acessar todos os recursos da Liga Regional, seu perfil precisa ser vinculado."
      />

      {access.pendingRequest ? (
        <div className="surface-card p-6">
          <p className="font-display text-xl font-bold uppercase">Aguardando vínculo</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua solicitação está em análise pela organização da Liga. Você receberá uma notificação assim que for
            aprovada.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setKind("athlete")}
              className={`surface-card p-5 text-left ${kind === "athlete" ? "ring-2 ring-primary" : ""}`}
            >
              <p className="font-display text-lg font-bold uppercase">Sou atleta</p>
              <p className="text-xs text-muted-foreground">Vincule sua conta à sua ficha de atleta.</p>
            </button>
            <button
              type="button"
              onClick={() => setKind("club_manager")}
              className={`surface-card p-5 text-left ${kind === "club_manager" ? "ring-2 ring-primary" : ""}`}
            >
              <p className="font-display text-lg font-bold uppercase">Sou gestor de clube</p>
              <p className="text-xs text-muted-foreground">Administre o elenco e os jogos do seu clube.</p>
            </button>
          </div>

          {kind && (
            <div className="surface-card space-y-4 p-5">
              {kind === "club_manager" ? (
                <div className="space-y-1">
                  <Label>Clube</Label>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                  >
                    <option value="">Selecione o clube</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Atleta</Label>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                  >
                    <option value="">Selecione seu cadastro de atleta</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Mensagem (opcional)</Label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-surface p-3 text-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explique seu vínculo com o clube"
                />
              </div>
              <Button
                onClick={() => {
                  if (kind === "club_manager" && !teamId) return toast.error("Selecione o clube");
                  if (kind === "athlete" && !playerId) return toast.error("Selecione o atleta");
                  request.mutate();
                }}
                disabled={request.isPending}
              >
                Enviar solicitação
              </Button>
            </div>
          )}
        </div>
      )}

      {hasAdmin === false && (
        <div className="surface-card mt-8 p-5">
          <p className="font-display text-lg font-bold uppercase">Primeiro acesso da Liga</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Nenhum administrador foi definido ainda. Assuma a administração desta Liga com a sua conta atual.
          </p>
          <Button variant="secondary" onClick={() => claimAdmin.mutate()} disabled={claimAdmin.isPending}>
            Tornar-me administrador
          </Button>
        </div>
      )}
    </div>
  );
}
