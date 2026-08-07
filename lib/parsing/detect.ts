import {
  fileTooLarge,
  unsupportedFormat,
  MAX_FILE_BYTES,
  type ExtractedDocument,
} from "./blocks";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";

/**
 * Detecção de formato e porta de entrada da extração.
 *
 * O formato é decidido pelo **conteúdo**, não pela extensão: extensão é o que o
 * usuário digitou, e um `.docx` com PDF dentro (ou o contrário) é comum o bastante
 * para não confiar nela.
 */

export type ResumeFormat = "docx" | "pdf";

/** `%PDF` no começo, tolerando BOM ou espaço à frente. */
const PDF_MAGIC = "%PDF";
/** Todo arquivo do OOXML é um zip. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * DOCX e ODT são os dois zips. O que os separa é o que existe lá dentro — e o nome
 * das entradas fica em texto puro nos cabeçalhos locais do zip, então dá para
 * distinguir sem descompactar.
 */
const DOCX_ENTRY = "word/document.xml";

function comecaComZip(bytes: Uint8Array): boolean {
  return ZIP_MAGIC.every((byte, indice) => bytes[indice] === byte);
}

function comecaComPdf(bytes: Uint8Array): boolean {
  const inicio = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  return inicio.trimStart().startsWith(PDF_MAGIC);
}

/** Nome do formato para a mensagem de erro, sem prometer que o conteúdo bate. */
function rotuloDe(fileName: string | undefined, bytes: Uint8Array): string {
  const extensao = fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (extensao) return `.${extensao}`;
  return comecaComZip(bytes) ? "arquivo compactado" : "desconhecido";
}

export function detectFormat(bytes: Uint8Array, fileName?: string): ResumeFormat {
  if (comecaComPdf(bytes)) return "pdf";

  if (comecaComZip(bytes)) {
    const conteudo = Buffer.from(bytes).toString("latin1");
    if (conteudo.includes(DOCX_ENTRY)) return "docx";
  }

  throw unsupportedFormat(rotuloDe(fileName, bytes));
}

export function assertWithinSizeLimit(bytes: Uint8Array, limit = MAX_FILE_BYTES): void {
  if (bytes.byteLength > limit) {
    throw fileTooLarge(bytes.byteLength, limit);
  }
}

/**
 * Extrai o texto do arquivo. Falha antes de qualquer trabalho caro — e, mais
 * importante, antes de qualquer chamada de IA.
 */
export async function extract(
  bytes: Uint8Array,
  fileName?: string,
  limit = MAX_FILE_BYTES,
): Promise<ExtractedDocument> {
  assertWithinSizeLimit(bytes, limit);

  const formato = detectFormat(bytes, fileName);
  return formato === "docx" ? extractDocx(Buffer.from(bytes)) : extractPdf(bytes);
}
