import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** Encerra a sessão limpando o cache antes de voltar para a tela de acesso. */
export function SignOutButton() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await qc.cancelQueries();
        qc.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }}
    >
      Sair
    </Button>
  );
}
