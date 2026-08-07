import type { Locale } from "@/lib/i18n/dictionary";
import {
  formatPeriod,
  isOpenEnd,
  type Period,
  type YearMonth,
} from "@/lib/resume/period";

/**
 * Período no formato do idioma de saída.
 *
 * Em português, `mm/aaaa` — o que `formatPeriod` já faz. Em inglês, mês abreviado por
 * extenso, que é a convenção de currículo americano.
 *
 * Isto mora aqui, e não em `resume-model`, de propósito: `formatPeriod` não sabe o que
 * é idioma, e não deve saber. O currículo do usuário existe num idioma só; o segundo
 * idioma é uma saída, e saída é assunto da exportação.
 *
 * Os nomes de mês também não são strings de interface e não entram em `lib/i18n`: eles
 * aparecem DENTRO do currículo do usuário, não na tela do app.
 */

const MESES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** O rótulo do fim em aberto, no idioma do documento. */
const EM_ABERTO: Record<Locale, string> = {
  pt: "atual",
  en: "Present",
};

function emIngles(date: YearMonth): string {
  return `${MESES_EN[date.month - 1]} ${date.year}`;
}

export function formatPeriodForLocale(period: Period, locale: Locale): string {
  // Período incompleto devolve o texto do arquivo em qualquer idioma: não há data
  // para formatar, e inventar um mês é o default que a regra proíbe.
  if (!period.complete) return period.raw;
  if (locale === "pt") return formatPeriod(period, EM_ABERTO.pt);

  const start = emIngles(period.start as YearMonth);
  const end = isOpenEnd(period.end!) ? EM_ABERTO.en : emIngles(period.end as YearMonth);

  return `${start} – ${end}`;
}

/** O rótulo sozinho, para quem monta o período fora deste módulo. */
export function openEndLabel(locale: Locale): string {
  return EM_ABERTO[locale];
}
