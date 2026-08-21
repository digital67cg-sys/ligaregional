import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles, useManagedTeams } from "@/hooks/useAuth";
import { useSeason } from "@/context/season";
import { formatDate, formatTime, matchesQuery, playersQuery, teamsQuery, MATCH_STATUS } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/painel")({
  component: Painel,
});

function Painel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: roles = [] } = useRoles(user?.id);
  const { data: managedTeams = [] } = useManagedTeams(user?.id);
  const { season } = useSeason();
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: players = [] } = useQuery(playersQuery);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const isAdmin = roles.includes("admin");
  const myMatches = matches.filter(
    (m) => managedTeams.includes(m.home_team_id) || managedTeams.includes(m.away_team_id),
  );
  const myPlayer = players.find((p) => p.id && managedTeams.length === 0 && false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
  };

  const schedule = useMutation({
    mutationFn: async (input: { id: string; match_date: string; kickoff: string; venue: string }) => {
      const { error } = await supabase
        .from("matches")
        .update({
          match_date: input.match_date,
          kickoff: input.kickoff,
          venue: input.venue,
          status: "scheduled",
          away_confirmed: false,
          proposal_by: user?.id ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta enviada ao visitante");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ away_confirmed: true, status: "confirmed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partida confirmada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const homologate = useMutation({
    mutationFn: async (input: { id: string; home: number; away: number }) => {
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: input.home,
          away_score: input.away,
          status: "finished",
          homologated: true,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resultado homologado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const pendingAdmin = matches.filter((m) => !m.homologated);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Painel"
        subtitle={`${user?.email ?? ""} · ${roles.length ? roles.join(", ") : "atleta"}`}
        action={
          <Button variant="secondary" onClick={signOut}>
            Sair
          </Button>
        }
      />

      {managedTeams.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-stadium text-2xl">Meus jogos</h2>
          <div className="space-y-3">
            {myMatches.map((m) => (
              <MatchRow
                key={m.id}
                matchId={m.id}
                title={`${teamMap.get(m.home_team_id)?.short_name} × ${teamMap.get(m.away_team_id)?.short_name}`}
                info={`Rodada ${m.round} · ${MATCH_STATUS[m.status] ?? m.status} · ${formatDate(m.match_date)} ${formatTime(m.kickoff)} · ${m.venue ?? "local a definir"}`}
                canPropose={managedTeams.includes(m.home_team_id) && !m.homologated}
                canConfirm={managedTeams.includes(m.away_team_id) && !m.away_confirmed && !!m.match_date}
                onPropose={(v) => schedule.mutate({ id: m.id, ...v })}
                onConfirm={() => confirm.mutate(m.id)}
              />
            ))}
            {myMatches.length === 0 && (
              <p className="surface-card p-4 text-sm text-muted-foreground">Nenhum jogo para seus clubes.</p>
            )}
          </div>
        </section>
      )}

      {isAdmin && (
        <section>
          <h2 className="mb-3 text-stadium text-2xl">Homologação de resultados</h2>
          <div className="space-y-3">
            {pendingAdmin.slice(0, 20).map((m) => (
              <ScoreRow
                key={m.id}
                title={`${teamMap.get(m.home_team_id)?.short_name} × ${teamMap.get(m.away_team_id)?.short_name}`}
                info={`Rodada ${m.round} · ${formatDate(m.match_date)}`}
                onSubmit={(home, away) => homologate.mutate({ id: m.id, home, away })}
              />
            ))}
          </div>
        </section>
      )}

      {managedTeams.length === 0 && !isAdmin && (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Sua conta ainda não está vinculada a um clube. Entre em contato com a organização da Liga para vincular
          seu perfil como dirigente ou atleta.
          {myPlayer && <span> Atleta: {myPlayer.full_name}</span>}
        </div>
      )}
    </div>
  );
}

function MatchRow({
  title,
  info,
  canPropose,
  canConfirm,
  onPropose,
  onConfirm,
}: {
  matchId: string;
  title: string;
  info: string;
  canPropose: boolean;
  canConfirm: boolean;
  onPropose: (v: { match_date: string; kickoff: string; venue: string }) => void;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold uppercase">{title}</p>
          <p className="text-xs text-muted-foreground">{info}</p>
        </div>
        <div className="flex gap-2">
          {canPropose && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(!open)}>
              Propor mando
            </Button>
          )}
          {canConfirm && (
            <Button size="sm" onClick={onConfirm}>
              Confirmar
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Local</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ginásio / campo" />
          </div>
          <Button
            className="self-end"
            onClick={() => {
              if (!date || !time) return toast.error("Informe data e horário");
              onPropose({ match_date: date, kickoff: time, venue });
              setOpen(false);
            }}
          >
            Enviar
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  title,
  info,
  onSubmit,
}: {
  title: string;
  info: string;
  onSubmit: (home: number, away: number) => void;
}) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  return (
    <div className="surface-card flex flex-wrap items-center gap-3 p-4">
      <div className="flex-1">
        <p className="font-display text-lg font-bold uppercase">{title}</p>
        <p className="text-xs text-muted-foreground">{info}</p>
      </div>
      <Input className="w-16" inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value)} />
      <Input className="w-16" inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value)} />
      <Button
        size="sm"
        onClick={() => {
          const h = Number(home);
          const a = Number(away);
          if (Number.isNaN(h) || Number.isNaN(a) || home === "" || away === "")
            return toast.error("Informe o placar");
          onSubmit(h, a);
        }}
      >
        Homologar
      </Button>
    </div>
  );
}
