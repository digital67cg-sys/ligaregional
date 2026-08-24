import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmButton, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { backupsQuery, callRpc, MAINTENANCE_LABEL, maintenanceQuery } from "@/lib/admin";
import { useSeason } from "@/context/season";
import { matchesQuery } from "@/lib/league";

export function MaintenanceSection() {
  const qc = useQueryClient();
  const { season, seasons } = useSeason();
  const { data: log = [] } = useQuery(maintenanceQuery);
  const { data: backups = [] } = useQuery(backupsQuery);
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));

  const refresh = () => {
    qc.invalidateQueries();
  };

  const run = useMutation({
    mutationFn: async (input: { fn: string; args: Record<string, unknown> }) => callRpc<number>(input.fn, input.args),
    onSuccess: (affected) => {
      toast.success(`Operação concluída (${affected ?? 0} registros afetados)`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seasonName = (id: string | null) => seasons.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Temporada ativa" value={season?.name ?? "—"} />
        <StatCard label="Partidas" value={matches.length} />
        <StatCard label="Homologadas" value={matches.filter((m) => m.homologated).length} />
        <StatCard label="Backups" value={backups.length} />
      </div>

      <Panel title="Manutenção da temporada">
        <p className="mb-3 text-sm text-muted-foreground">
          Toda operação destrutiva gera um backup automático da temporada antes de executar. O histórico da Liga (ranking histórico,
          notícias, temporadas anteriores e registros de vínculo) nunca é apagado.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Reset esportivo</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Zera placares, súmulas e homologações mantendo o calendário de partidas.
            </p>
            <ConfirmButton
              label="Executar reset esportivo"
              title="Reset esportivo"
              description="Placares, gols, cartões e homologações da temporada serão apagados. As partidas e datas permanecem."
              confirmWord="RESETAR"
              disabled={!season}
              onConfirm={() => run.mutate({ fn: "admin_reset_sport", args: { _season_id: season!.id } })}
            />
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Reset de tabela</p>
            <p className="mb-2 text-xs text-muted-foreground">Remove todas as rodadas e partidas para gerar a tabela novamente.</p>
            <ConfirmButton
              label="Executar reset de tabela"
              title="Reset de tabela"
              description="Todas as partidas e rodadas desta temporada serão excluídas. Clubes, atletas e financeiro permanecem."
              confirmWord="TABELA"
              disabled={!season}
              onConfirm={() => run.mutate({ fn: "admin_reset_fixtures", args: { _season_id: season!.id } })}
            />
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">Reset total da temporada</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Apaga partidas, súmulas, inscrições e transferências da temporada atual.
            </p>
            <ConfirmButton
              label="Executar reset total"
              title="Reset total da temporada"
              description="Dados esportivos e de inscrição desta temporada serão apagados. O histórico da Liga é preservado."
              confirmWord="TEMPORADA"
              disabled={!season}
              onConfirm={() => run.mutate({ fn: "admin_reset_season", args: { _season_id: season!.id } })}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Backups da temporada">
        {backups.length === 0 && <EmptyState>Nenhum backup gerado ainda.</EmptyState>}
        <div className="divide-y divide-border">
          {backups.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>
                <strong>{seasonName(b.season_id)}</strong> · {b.reason ?? "backup"}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("pt-BR")}</span>
              <ConfirmButton
                label="Restaurar"
                variant="secondary"
                title="Restaurar backup"
                description="Os dados atuais da temporada serão substituídos pelo conteúdo deste backup."
                confirmWord="RESTAURAR"
                onConfirm={() => run.mutate({ fn: "admin_restore_backup", args: { _backup_id: b.id } })}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Histórico de manutenção">
        {log.length === 0 && <EmptyState>Nenhuma operação executada.</EmptyState>}
        <div className="divide-y divide-border">
          {log.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                {MAINTENANCE_LABEL[l.operation] ?? l.operation} · {seasonName(l.season_id)}
                {l.description ? ` · ${l.description}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {l.affected_matches} registros · {new Date(l.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
