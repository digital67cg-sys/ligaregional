import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Instagram } from "lucide-react";
import { leagueSettingsQuery } from "@/lib/league";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Liga Regional" },
      { name: "description", content: "Fale com a organização da Liga Regional: e-mail, telefone e redes sociais." },
      { property: "og:title", content: "Contato — Liga Regional" },
      { property: "og:description", content: "Canais oficiais de atendimento aos clubes e atletas." },
    ],
  }),
  component: Contato,
});

function Contato() {
  const { data: settings } = useQuery(leagueSettingsQuery);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader title="Contato" subtitle="Canais oficiais da organização da Liga Regional" />
      <div className="space-y-3">
        {settings?.contact_email && (
          <a href={`mailto:${settings.contact_email}`} className="surface-card flex items-center gap-3 p-4 hover:bg-secondary/60">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{settings.contact_email}</span>
          </a>
        )}
        {settings?.contact_phone && (
          <a href={`tel:${settings.contact_phone}`} className="surface-card flex items-center gap-3 p-4 hover:bg-secondary/60">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{settings.contact_phone}</span>
          </a>
        )}
        {settings?.instagram && (
          <a
            href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
            target="_blank"
            rel="noreferrer"
            className="surface-card flex items-center gap-3 p-4 hover:bg-secondary/60"
          >
            <Instagram className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{settings.instagram}</span>
          </a>
        )}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Clubes interessados em participar da próxima temporada devem entrar em contato durante o período de
        inscrições para receber o formulário de filiação.
      </p>
    </div>
  );
}
