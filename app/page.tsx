import { Home } from "@/components/home/Home";
import { LocaleProvider } from "@/lib/i18n/context";

/** A porta de entrada do produto. O fluxo mora em `/app`. */
export default function HomePage() {
  return (
    <LocaleProvider>
      <Home />
    </LocaleProvider>
  );
}
