import type { Locale } from "@/lib/i18n/dictionary";

/**
 * Títulos de seção do currículo.
 *
 * Não são strings de interface e não entram em `lib/i18n`: eles aparecem DENTRO do
 * documento do usuário, como os nomes de mês de `export-translation`. O dicionário do
 * app cobre a tela; isto é o papel.
 *
 * Títulos convencionais, de propósito — "Trajetória" ou "Minha jornada" podem ser mais
 * bonitos, e são exatamente o que um parser não reconhece.
 */

export type SectionKey = "summary" | "experience" | "education" | "skills";

const TITULOS: Record<Locale, Record<SectionKey, string>> = {
  pt: {
    summary: "RESUMO PROFISSIONAL",
    experience: "EXPERIÊNCIA PROFISSIONAL",
    education: "FORMAÇÃO ACADÊMICA",
    skills: "HABILIDADES",
  },
  en: {
    summary: "PROFESSIONAL SUMMARY",
    experience: "PROFESSIONAL EXPERIENCE",
    education: "EDUCATION",
    skills: "SKILLS",
  },
};

export function sectionTitle(key: SectionKey, locale: Locale): string {
  return TITULOS[locale][key];
}
