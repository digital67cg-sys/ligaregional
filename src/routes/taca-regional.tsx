import { createFileRoute } from "@tanstack/react-router";
import { RegionalCup } from "@/components/site/RegionalCup";

export const Route = createFileRoute("/taca-regional")({
  head: () => ({ meta: [{ title: "Taça Regional" }, { name: "description", content: "Grupos, classificações e mata-mata da Taça Regional." }] }),
  component: RegionalCup,
});