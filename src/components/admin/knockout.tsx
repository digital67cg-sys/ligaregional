import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel, SelectField, StatCard, TextField } from "@/components/admin/ui";
import { callRpc, db, logAction } from "@/lib/admin";
import {
  competitionGroupTeamsQuery,
  competitionGroupsQuery,
  competitionKnockoutStagesQuery,
  competitionQualifiedTeamsQuery,
  matchesQuery,
  teamsQuery,
} from "@/lib/league";
import { useSeason } from "@/context/season";
import { MatchesSection } from "@/components/admin/matches";

type CupTab = "overview" | "groups" | "standings" | "qualified" | "knockout" | "matches" | "settings";

const TABS: { value: CupTab; label: string }[] = [
  { value: "overview", label: "Visão Geral" },
  { value: "groups", label: "Grupos" },
  { value: "standings", label: "Classificação" },
  { value: "qualified", label: "Classificados" },
  { value: "knockout", label: "Mata-Mata" },
  { value: "matches", label: "Jogos" },
  { value: "settings", label: "Configuração" },
];

export function KnockoutSection() {
  const { season } = useSeason();
  const qc = useQueryClient();
  const [tab, setTab] = useState<CupTab>("overview");
  const [groupName, setGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [position, setPosition] = useState("1");
  const [stage, setStage] = useState({
    name: "",
    stage_type: "quartas",
    stage_order: "1",
    teams_count: "8",
    matches_count: "4",
  });
  const [config, setConfig] = useState({
    team_count: String((season as any)?.team_count ?? ""),
    group_count: String((season as any)?.group_count ?? ""),
    qualified_per_group: String((season as any)?.qualified_per_group ?? ""),
  });

  const { data: groups = [] } = useQuery(competitionGroupsQuery(season?.id));
  const { data: groupTeams = [] } = useQuery(competitionGroupTeamsQuery(season?.id));
  const { data: stages = [] } = useQuery(competitionKnockoutStagesQuery(season?.id));
  const { data: qualified = [] } = useQuery(competitionQualifiedTeamsQuery(season?.id));
  const { data: matches = [] } = useQuery(matchesQuery(season?.id));
  const { data: teams = [] } = useQuery(teamsQuery);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["competition_groups"] });
    qc.invalidateQueries({ queryKey: ["competition_group_teams"] });
    qc.invalidateQueries({ queryKey: ["competition_knockout_stages"] });
    qc.invalidateQueries({ queryKey: ["competition_qualified_teams"] });
    qc.invalidateQueries({ queryKey: ["matches"] });
    qc.invalidateQueries({ queryKey: ["seasons"] });
  };

  const groupTeamCount = groupTeams.length;
  const groupMatches = matches.filter((match) => match.stage !== "mata_mata");
  const knockoutMatches = matches.filter((match) => match.stage === "mata_mata");
  const playedMatches = matches.filter((match) => match.homologated);
  const goals = playedMatches.reduce(
    (total, match) => total + (match.home_score ?? 0) + (match.away_score ?? 0),
    0,
  );

  const teamName = (id: string | null | undefined) => teams.find((team) => team.id === id)?.name ?? "Equipe a definir";
  const shortTeamName = (id: string | null | undefined) => teams.find((team) => team.id === id)?.short_name ?? "A definir";

  const createGroup = useMutation({
    mutationFn: async () => {
      if (!season?.id || !groupName.trim()) throw new Error("Informe o nome do grupo.");
      const { error } = await db.from("competition_groups").insert({ season_id: season.id, name: groupName.trim() });
      if (error) throw error;
      await logAction("Grupo da Taça Regional criado", "competition_groups", null, { name: groupName.trim(), season_id: season.id });
    },
    onSuccess: () => {
      setGroupName("");
      refresh();
      toast.success("Grupo criado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const renameGroup = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await db.from("competition_groups").update({ name: input.name.trim() }).eq("id", input.id).eq("season_id", season!.id);
      if (error) throw error;
      await logAction("Grupo da Taça Regional renomeado", "competition_groups", input.id, { name: input.name.trim() });
    },
    onSuccess: () => {
      setEditingGroup(null);
      setEditingName("");
      refresh();
      toast.success("Grupo atualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeGroupTeam = useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await db.from("competition_group_teams").delete().eq("id", input.id).eq("season_id", season!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Equipe removida do grupo");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!season?.id || !selectedGroup || !selectedTeam) throw new Error("Selecione o grupo e a equipe.");
      const { error } = await db.from("competition_group_teams").insert({
        season_id: season.id,
        group_id: selectedGroup,
        team_id: selectedTeam,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedTeam("");
      refresh();
      toast.success("Equipe adicionada ao grupo");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const qualify = useMutation({
    mutationFn: async () => {
      if (!season?.id || !selectedGroup || !selectedTeam) throw new Error("Selecione o grupo e a equipe.");
      const { error } = await db.from("competition_qualified_teams").insert({
        season_id: season.id,
        group_id: selectedGroup,
        team_id: selectedTeam,
        qualification_position: Number(position || 1),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Classificado registrado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createStage = useMutation({
    mutationFn: async () => {
      if (!season?.id || !stage.name.trim()) throw new Error("Informe o nome da fase.");
      const { error } = await db.from("competition_knockout_stages").insert({
        season_id: season.id,
        name: stage.name.trim(),
        stage_type: stage.stage_type,
        stage_order: Number(stage.stage_order),
        teams_count: Number(stage.teams_count),
        matches_count: Number(stage.matches_count),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setStage({ name: "", stage_type: "quartas", stage_order: "1", teams_count: "8", matches_count: "4" });
      refresh();
      toast.success("Fase criada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const process = useMutation({
    mutationFn: async (id: string) => callRpc("process_competition_knockout_match", { p_match_id: id }),
    onSuccess: () => {
      refresh();
      toast.success("Mata-mata processado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateConfig = useMutation({
    mutationFn: async () => {
      if (!season?.id) throw new Error("Nenhuma temporada selecionada.");
      const { error } = await db.from("seasons").update({
        team_count: config.team_count ? Number(config.team_count) : null,
        group_count: config.group_count ? Number(config.group_count) : null,
        qualified_per_group: config.qualified_per_group ? Number(config.qualified_per_group) : null,
      }).eq("id", season.id);
      if (error) throw error;
      await logAction("Configuração da Taça Regional atualizada", "seasons", season.id, config);
    },
    onSuccess: () => {
      refresh();
      toast.success("Configuração atualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const standings = useMemo(() => {
    return groups.map((group) => {
      const members = groupTeams.filter((item) => item.group_id === group.id);
      const rows = members.map((member) => {
        const stats = { teamId: member.team_id, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        groupMatches.filter((match) => match.group_id === group.id && match.homologated && (match.home_team_id === member.team_id || match.away_team_id === member.team_id)).forEach((match) => {
          const home = match.home_team_id === member.team_id;
          const goalsFor = home ? match.home_score ?? 0 : match.away_score ?? 0;
          const goalsAgainst = home ? match.away_score ?? 0 : match.home_score ?? 0;
          stats.played += 1;
          stats.goalsFor += goalsFor;
          stats.goalsAgainst += goalsAgainst;
          if (goalsFor > goalsAgainst) { stats.wins += 1; stats.points += 3; }
          else if (goalsFor === goalsAgainst) { stats.draws += 1; stats.points += 1; }
          else stats.losses += 1;
        });
        return stats;
      }).sort((a, b) => b.points - a.points || b.wins - a.wins || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || teamName(a.teamId).localeCompare(teamName(b.teamId)));
      return { group, rows };
    });
  }, [groups, groupTeams, groupMatches, teams]);

  if (season?.competition_type !== "grupos_mata_mata") {
    return <Panel title="Taça Regional"><EmptyState>A temporada selecionada não está configurada como grupos_mata_mata.</EmptyState></Panel>;
  }

  return (
    <div className="space-y-4">
      <Panel title={`Taça Regional · ${season.name}`}>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <Button key={item.value} size="sm" variant={tab === item.value ? "default" : "secondary"} onClick={() => setTab(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
      </Panel>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatCard label="Equipes inscritas" value={groupTeamCount} />
            <StatCard label="Grupos" value={groups.length} />
            <StatCard label="Jogos realizados" value={playedMatches.length} />
            <StatCard label="Jogos restantes" value={matches.length - playedMatches.length} />
            <StatCard label="Gols" value={goals} />
            <StatCard label="Classificados" value={qualified.length} />
          </div>
          <Panel title="Andamento da competição">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Formato</p><p className="mt-1 font-semibold">Grupos + Mata-Mata</p></div>
              <div className="rounded-md border border-border p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p><p className="mt-1 font-semibold">{season.status}</p></div>
              <div className="rounded-md border border-border p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Fases eliminatórias</p><p className="mt-1 font-semibold">{stages.length}</p></div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "groups" && (
        <div className="space-y-4">
          <Panel title="Gerenciar grupos">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <TextField label="Nome do novo grupo" value={groupName} onChange={setGroupName} placeholder="Grupo A" />
              <Button className="mt-auto" disabled={!groupName.trim()} onClick={() => createGroup.mutate()}>Criar grupo</Button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <SelectField label="Grupo" value={selectedGroup} onChange={setSelectedGroup} options={groups.map((group) => ({ value: group.id, label: group.name }))} placeholder="Selecione" />
              <SelectField label="Equipe" value={selectedTeam} onChange={setSelectedTeam} options={teams.filter((team) => !groupTeams.some((item) => item.group_id === selectedGroup && item.team_id === team.id)).map((team) => ({ value: team.id, label: team.name }))} placeholder="Selecione" />
              <Button className="mt-auto" disabled={!selectedGroup || !selectedTeam} onClick={() => assign.mutate()}>Adicionar equipe</Button>
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => {
              const members = groupTeams.filter((item) => item.group_id === group.id);
              return <Panel key={group.id} title={group.name} action={<Button size="sm" variant="secondary" onClick={() => { setEditingGroup(group.id); setEditingName(group.name); }}>Editar</Button>}>
                {editingGroup === group.id && <div className="mb-3 flex gap-2"><Input value={editingName} onChange={(event) => setEditingName(event.target.value)} /><Button size="sm" disabled={!editingName.trim()} onClick={() => renameGroup.mutate({ id: group.id, name: editingName })}>Salvar</Button></div>}
                {members.length === 0 && <EmptyState>Nenhuma equipe adicionada.</EmptyState>}
                <div className="divide-y divide-border">{members.map((member) => <div key={member.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{teamName(member.team_id)}</span><Button size="sm" variant="ghost" onClick={() => removeGroupTeam.mutate({ id: member.id })}>Remover</Button></div>)}</div>
              </Panel>;
            })}
          </div>
        </div>
      )}

      {tab === "standings" && <div className="space-y-4">{standings.map(({ group, rows }) => <Panel key={group.id} title={`Classificação · ${group.name}`}><div className="-mx-4 overflow-x-auto px-4"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">{["POS", "EQUIPE", "P", "J", "V", "E", "D", "GP", "GC", "SG"].map((header) => <th key={header} className="p-2">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.teamId} className="border-t border-border"><td className="p-2">{index + 1}</td><td className="p-2 font-semibold">{teamName(row.teamId)}</td><td className="p-2 font-bold">{row.points}</td><td className="p-2">{row.played}</td><td className="p-2">{row.wins}</td><td className="p-2">{row.draws}</td><td className="p-2">{row.losses}</td><td className="p-2">{row.goalsFor}</td><td className="p-2">{row.goalsAgainst}</td><td className="p-2">{row.goalsFor - row.goalsAgainst}</td></tr>)}</tbody></table></div>{rows.length === 0 && <EmptyState>Nenhuma equipe no grupo.</EmptyState>}</Panel>)}{standings.length === 0 && <Panel title="Classificação"><EmptyState>Nenhum grupo criado.</EmptyState></Panel>}</div>}

      {tab === "qualified" && <Panel title="Classificados para o mata-mata"><div className="mb-4 grid gap-3 md:grid-cols-3"><SelectField label="Grupo" value={selectedGroup} onChange={setSelectedGroup} options={groups.map((group) => ({ value: group.id, label: group.name }))} placeholder="Selecione" /><SelectField label="Equipe" value={selectedTeam} onChange={setSelectedTeam} options={teams.map((team) => ({ value: team.id, label: team.name }))} placeholder="Selecione" /><div className="flex items-end gap-2"><TextField label="Posição" type="number" value={position} onChange={setPosition} /><Button disabled={!selectedGroup || !selectedTeam} onClick={() => qualify.mutate()}>Registrar classificado</Button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{qualified.map((item) => <div key={item.id} className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{groups.find((group) => group.id === item.group_id)?.name ?? "Grupo"}</p><p className="mt-1 font-semibold">{item.qualification_position}º — {teamName(item.team_id)}</p></div>)}</div>{qualified.length === 0 && <EmptyState>Nenhum classificado registrado.</EmptyState>}</Panel>}

      {tab === "knockout" && <div className="space-y-4"><Panel title="Fases do mata-mata"><div className="grid gap-3 md:grid-cols-5"><TextField label="Nome" value={stage.name} onChange={(value) => setStage({ ...stage, name: value })} /><TextField label="Tipo" value={stage.stage_type} onChange={(value) => setStage({ ...stage, stage_type: value })} /><TextField label="Ordem" type="number" value={stage.stage_order} onChange={(value) => setStage({ ...stage, stage_order: value })} /><TextField label="Equipes" type="number" value={stage.teams_count} onChange={(value) => setStage({ ...stage, teams_count: value })} /><Button className="mt-auto" disabled={!stage.name.trim()} onClick={() => createStage.mutate()}>Criar fase</Button></div><div className="mt-4 divide-y divide-border">{stages.map((item) => <div key={item.id} className="flex justify-between py-2 text-sm"><span>{item.stage_order}. {item.name}</span><span className="text-muted-foreground">{item.stage_type} · {item.matches_count ?? 0} jogos</span></div>)}</div></Panel><Panel title="Processamento das partidas eliminatórias">{knockoutMatches.length === 0 && <EmptyState>Nenhuma partida de mata-mata encontrada.</EmptyState>}<div className="divide-y divide-border">{knockoutMatches.map((match) => <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{shortTeamName(match.home_team_id)} {match.home_score ?? "-"} × {match.away_score ?? "-"} {shortTeamName(match.away_team_id)}</span><Button size="sm" variant="secondary" onClick={() => process.mutate(match.id)}>Processar vencedor</Button></div>)}</div></Panel></div>}

      {tab === "matches" && (
        <div className="space-y-3">
          <Panel title="Jogos da Taça Regional">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>A listagem abaixo utiliza exclusivamente a temporada selecionada: {season.name}.</p>
              <p>Partidas homologadas atualizam os dados da competição; partidas eliminatórias acionam automaticamente o processamento oficial do mata-mata.</p>
            </div>
          </Panel>
          <MatchesSection />
        </div>
      )}

      {tab === "settings" && <Panel title="Configuração da Taça Regional"><div className="grid gap-3 sm:grid-cols-3"><TextField label="Número de equipes" type="number" value={config.team_count} onChange={(value) => setConfig({ ...config, team_count: value })} /><TextField label="Número de grupos" type="number" value={config.group_count} onChange={(value) => setConfig({ ...config, group_count: value })} /><TextField label="Classificados por grupo" type="number" value={config.qualified_per_group} onChange={(value) => setConfig({ ...config, qualified_per_group: value })} /></div><Button className="mt-4" onClick={() => updateConfig.mutate()}>Salvar configuração</Button><p className="mt-3 text-xs text-muted-foreground">As configurações são salvas na temporada selecionada e não alteram outras competições.</p></Panel>}
    </div>
  );
}
