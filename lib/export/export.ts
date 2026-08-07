import type { AiClient } from "@/lib/ai/client";
import { organizeContent } from "@/lib/ai/organize-content";
import { translateResume } from "@/lib/ai/translate-resume";
import type { Locale } from "@/lib/i18n/dictionary";
import { generateFinal, type Patch } from "@/lib/resume/generate";
import type { Resume } from "@/lib/resume/schema";
import { buildDocx } from "./docx";
import { resumeFileName, zipFileName, type ExportFormat } from "./filename";
import { buildPdf } from "./pdf";

/**
 * Exportação: onde tudo o que o app fez vira arquivo.
 *
 * A ordem das operações não é negociável:
 *
 * 1. `generateFinal` aplica as sugestões MARCADAS e a ordem — é a única transformação do
 *    modelo, e nada entra nela sem o usuário ter marcado;
 * 2. a tradução acontece DEPOIS, sobre o currículo que de fato vai para o arquivo. Antes,
 *    traduziria texto que talvez não fosse marcado, e a verificação de números da
 *    tradução compararia com um currículo que ninguém baixaria.
 *
 * A ordem é pedida uma vez e vale para todas as saídas; a tradução, uma vez por idioma.
 * Dois arquivos do mesmo currículo com ordens diferentes seriam um defeito visível.
 */

export type ExportRequest = {
  resume: Resume;
  /** As sugestões que o usuário marcou. Conjunto, não sequência. */
  patches: readonly Patch[];
  locales: readonly Locale[];
  formats: readonly ExportFormat[];
};

export type ExportedFile = {
  name: string;
  bytes: Uint8Array;
  /** `application/zip` quando o resultado é o pacote. */
  contentType: string;
};

export type ExportFailure = {
  locale: Locale;
  format?: ExportFormat;
  reason: string;
};

export type ExportResult = {
  /** Os arquivos gerados, já com nome padronizado. */
  files: ExportedFile[];
  /** O que entregar ao usuário: um arquivo, ou o `.zip` de todos. */
  download: ExportedFile | null;
  failures: ExportFailure[];
};

export type ExportOptions = {
  client?: AiClient;
  model?: string;
};

const CONTENT_TYPE: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

async function empacotar(
  files: readonly ExportedFile[],
  nome: string,
): Promise<ExportedFile> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const file of files) zip.file(file.name, file.bytes);

  const bytes = await zip.generateAsync({ type: "uint8array" });
  return { name: nome, bytes, contentType: "application/zip" };
}

export async function exportResume(
  request: ExportRequest,
  options: ExportOptions = {},
): Promise<ExportResult> {
  const { resume, patches, locales, formats } = request;

  // Nada marcado: não é erro, é uma exportação vazia. Quem pergunta é a tela.
  if (locales.length === 0 || formats.length === 0) {
    return { files: [], download: null, failures: [] };
  }

  const order = await organizeContent(resume, options);
  const final = generateFinal(resume, patches, order);

  const files: ExportedFile[] = [];
  const failures: ExportFailure[] = [];

  for (const locale of locales) {
    // A tradução falha o idioma inteiro — é onde o erro nasce, e os dois formatos
    // daquela língua caem juntos.
    let noIdioma: Resume;
    try {
      noIdioma = await translateResume(final, locale, options);
    } catch (error) {
      failures.push({ locale, reason: (error as Error).name });
      continue;
    }

    for (const format of formats) {
      try {
        const bytes =
          format === "docx"
            ? await buildDocx(noIdioma, locale)
            : await buildPdf(noIdioma, locale);

        files.push({
          name: resumeFileName(noIdioma.header.name, locale, format),
          bytes,
          contentType: CONTENT_TYPE[format],
        });
      } catch (error) {
        // Falha de escrita derruba só aquele arquivo.
        failures.push({ locale, format, reason: (error as Error).name });
      }
    }
  }

  // Lote inteiro fracassado devolve nada, com as falhas nomeadas — nunca um `.zip` de
  // zero entradas, que o usuário abriria sem entender.
  if (files.length === 0) return { files, download: null, failures };
  if (files.length === 1) return { files, download: files[0], failures };

  return {
    files,
    download: await empacotar(files, zipFileName(resume.header.name)),
    failures,
  };
}
