import { AppShell } from "@/components/shell/AppShell";
import { LocaleProvider } from "@/lib/i18n/context";

/**
 * O fluxo completo: importar, atualizar, revisar e exportar.
 *
 * Substitui as rotas provisórias `/atualizar` e `/revisar`, que existiam para conferir
 * as etapas contra o handoff antes de haver shell.
 */
export default function AppPage() {
  return (
    <LocaleProvider>
      <AppShell />
    </LocaleProvider>
  );
}
