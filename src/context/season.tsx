import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { seasonsQuery, type Season } from "@/lib/league";

type SeasonContextValue = {
  seasons: Season[];
  season: Season | undefined;
  seasonId: string | undefined;
  setSeasonId: (id: string) => void;
  isLoading: boolean;
};

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const { data: seasons = [], isLoading } = useQuery(seasonsQuery);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const value = useMemo(() => {
    const season =
      seasons.find((s) => s.id === selected) ?? seasons.find((s) => s.is_current) ?? seasons[0];
    return {
      seasons,
      season,
      seasonId: season?.id,
      setSeasonId: setSelected,
      isLoading,
    };
  }, [seasons, selected, isLoading]);

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error("useSeason precisa estar dentro de SeasonProvider");
  return ctx;
}
