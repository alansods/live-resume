import mammoth from "mammoth";
import {
  corruptedFile,
  type Block,
  type BlockKind,
  type ExtractedDocument,
} from "./blocks";

/**
 * Extração de DOCX.
 *
 * Usa `convertToHtml`, não `extractRawText`: o segundo entrega parágrafos separados
 * por linhas em branco e **perde a marcação de lista** — exatamente a pista que
 * distingue um bullet de entrega de uma linha de endereço. O HTML do mammoth é
 * semântico e previsível (`p`, `ul/li`, `h1..h6`, `table`), então um scanner de
 * elementos de bloco basta e evita uma dependência de parser de HTML.
 */

/** Elementos de bloco que o mammoth emite, na ordem em que aparecem no documento. */
const BLOCO = /<(p|li|h[1-6])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

const ENTIDADES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodificar(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(
      /&[a-z#0-9]+;/gi,
      (entidade) => ENTIDADES[entidade.toLowerCase()] ?? entidade,
    );
}

/**
 * Remove a formatação inline (`strong`, `em`, `a`, `br`) e deixa o texto.
 *
 * Soft break (`<br>`) separa linhas: cada segmento vira um bloco próprio em vez de ser
 * colapsado num espaço — é o que mantém email, LinkedIn e telefone em linhas
 * separadas quando o DOCX usa Shift+Enter no bloco de contato.
 */
function textoDe(html: string): string[] {
  return html
    .split(/<br\s*\/?>/gi)
    .map((parte) =>
      decodificar(parte.replace(/<[^>]+>/g, "").replace(/\s+/g, " ")).trim(),
    )
    .filter((texto) => texto.length > 0);
}

function kindDe(tag: string): BlockKind {
  const nome = tag.toLowerCase();
  if (nome === "li") return "listItem";
  if (nome.startsWith("h")) return "heading";
  return "paragraph";
}

/**
 * DOCX não tem páginas até ser renderizado, e não tem colunas que o mammoth exponha —
 * o layout de coluna múltipla no Word vira parágrafos em sequência. Por isso o
 * resultado é sempre coluna única aqui; a detecção de colunas é problema do PDF.
 */
export async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  let html: string;
  try {
    const resultado = await mammoth.convertToHtml({ buffer });
    html = resultado.value;
  } catch (error) {
    throw corruptedFile("DOCX", (error as Error).message);
  }

  const blocks: Block[] = [];
  for (const match of html.matchAll(BLOCO)) {
    const kind = kindDe(match[1]);
    for (const text of textoDe(match[2])) {
      blocks.push({ text, kind });
    }
  }

  if (blocks.length === 0) {
    throw corruptedFile("DOCX", "documento sem conteúdo de texto");
  }

  return { blocks, layout: { kind: "single-column" } };
}
