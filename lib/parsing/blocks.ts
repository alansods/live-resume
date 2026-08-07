/**
 * Formato intermediário do parsing.
 *
 * DOCX e PDF descrevem aparência, não significado: nenhum dos dois marca "isto é uma
 * experiência". O que existe são pistas — elementos de lista e estilos no DOCX,
 * posição e espaçamento no PDF. Os dois formatos são reduzidos a esta mesma lista de
 * blocos antes de qualquer interpretação, para que segmentação e estruturação — a
 * parte difícil, e a que mais vai mudar — sejam escritas uma vez só.
 */

/** O que o bloco parece ser no documento de origem. */
export type BlockKind = "paragraph" | "listItem" | "heading";

export type Block = {
  text: string;
  kind: BlockKind;
  /** Página de origem, quando o formato tem páginas. Base 1. */
  page?: number;
  /**
   * Coluna de origem, quando o documento tem mais de uma. Base 0, da esquerda para a
   * direita. Ausente em documento de coluna única.
   */
  column?: number;
};

/**
 * Layout detectado no arquivo.
 *
 * Currículo em duas ou mais colunas não é entregue intercalado nem descartado: os
 * blocos saem agrupados por coluna, com a posição preservada, e a reordenação para
 * coluna única é feita pela IA, na estruturação.
 */
export type Layout =
  { kind: "single-column" } | { kind: "multi-column"; columns: number };

export type ExtractedDocument = {
  blocks: Block[];
  layout: Layout;
  /** Número de páginas, quando o formato tem páginas. */
  pages?: number;
};

// ── Erros de importação ─────────────────────────────────────────────────────────

/**
 * Motivos pelos quais um arquivo não pode ser processado. São distinguíveis por tipo
 * porque a etapa 01 diz coisas diferentes para cada um: "não suportamos .odt" é outra
 * conversa que "seu PDF é uma imagem digitalizada".
 */
export type ImportFailureReason =
  | "unsupported-format"
  | "corrupted-file"
  | "pdf-without-text-layer"
  | "file-too-large"
  | "pdf-reader-unavailable"
  | "not-a-resume";

export class ImportError extends Error {
  constructor(
    readonly reason: ImportFailureReason,
    message: string,
    /** Detalhe seguro para log: nunca contém texto do currículo. */
    readonly detail?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export function unsupportedFormat(received: string): ImportError {
  return new ImportError(
    "unsupported-format",
    `Formato não suportado: ${received}. Envie o currículo em DOCX ou PDF.`,
    { received },
  );
}

export function corruptedFile(format: string, cause?: string): ImportError {
  return new ImportError(
    "corrupted-file",
    `O arquivo ${format} não pôde ser lido — o conteúdo parece corrompido.`,
    cause ? { format, cause } : { format },
  );
}

/**
 * O leitor de PDF não subiu — falha nossa, não do arquivo.
 *
 * Acusar o arquivo do usuário de estar corrompido quando o defeito é de configuração
 * manda a pessoa procurar problema onde não há. O motivo é próprio para que a rota
 * possa responder com erro de servidor, que é o que isto é.
 */
export function pdfReaderUnavailable(cause: string): ImportError {
  return new ImportError(
    "pdf-reader-unavailable",
    "Não foi possível iniciar o leitor de PDF. O problema é nosso, não do seu arquivo — tente novamente em instantes.",
    { cause },
  );
}

export function pdfWithoutTextLayer(): ImportError {
  return new ImportError(
    "pdf-without-text-layer",
    "Este PDF não tem texto selecionável: ele parece ser uma digitalização. Envie o PDF gerado pelo editor de texto, ou o DOCX.",
  );
}

/**
 * O arquivo abriu e tinha texto, mas não é um currículo.
 *
 * É o único motivo desta lista que não vem do arquivo em si — vem do veredito da IA, que
 * leu o documento. Sem ele o caminho terminava em um de dois lugares errados: ou a IA
 * devolvia nome vazio e o `ResumeSchema` estourava num 500 genérico, que culpa o servidor
 * por um problema do arquivo; ou ela preenchia o cabeçalho com o primeiro nome que
 * encontrasse e a pessoa seguia para a etapa 02 com um currículo em branco, descobrindo
 * o problema duas etapas adiante.
 *
 * A mensagem sugere o caminho de saída em vez de só recusar: quem sobe o arquivo errado
 * costuma ter o certo à mão.
 */
export function notAResume(): ImportError {
  return new ImportError(
    "not-a-resume",
    "Este arquivo não parece ser um currículo. Envie o documento com a sua experiência profissional, em DOCX ou PDF.",
  );
}

export function fileTooLarge(bytes: number, limit: number): ImportError {
  return new ImportError(
    "file-too-large",
    `Arquivo de ${formatBytes(bytes)} excede o limite de ${formatBytes(limit)}.`,
    { bytes, limit },
  );
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/** Limite de tamanho do arquivo enviado. Currículo é documento de texto: 10 MB sobra. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// ── Utilitários de bloco ────────────────────────────────────────────────────────

/** Blocos vazios não carregam informação e sujam a segmentação. */
export function isMeaningful(block: Block): boolean {
  return block.text.trim().length > 0;
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
