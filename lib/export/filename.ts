import type { Locale } from "@/lib/i18n/dictionary";

/**
 * Nome do arquivo exportado.
 *
 * Derivado, nunca configurável: `curriculo-marina-alencar-pt.docx`. Minúsculas, sem
 * acento e sem espaço, porque ASCII é o denominador comum dos sistemas de candidatura —
 * e porque `Currículo Final (2).docx` é exatamente o que se quer evitar no anexo de
 * alguém.
 *
 * O prefixo segue o idioma do documento: quem abre o arquivo em inglês vê "resume".
 */

export type ExportFormat = "docx" | "pdf";

const PREFIXO: Record<Locale, string> = {
  pt: "curriculo",
  en: "resume",
};

/** `José da Silva Ávila` -> `jose-da-silva-avila`. */
export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resumeFileName(
  name: string,
  locale: Locale,
  format: ExportFormat,
): string {
  const pessoa = slug(name);
  // Nome vazio não vira hífen solto: some da composição.
  const partes =
    pessoa.length > 0 ? [PREFIXO[locale], pessoa, locale] : [PREFIXO[locale], locale];
  return `${partes.join("-")}.${format}`;
}

/** Um nome por combinação de idioma × formato, na ordem em que foram selecionados. */
export function resumeFileNames(
  name: string,
  locales: readonly Locale[],
  formats: readonly ExportFormat[],
): string[] {
  const nomes: string[] = [];
  for (const locale of locales) {
    for (const format of formats) {
      nomes.push(resumeFileName(name, locale, format));
    }
  }
  return nomes;
}

/** O `.zip` também é nomeado, e pelo idioma do primeiro arquivo não faria sentido. */
export function zipFileName(name: string): string {
  const pessoa = slug(name);
  return pessoa.length > 0 ? `curriculo-${pessoa}.zip` : "curriculo.zip";
}
