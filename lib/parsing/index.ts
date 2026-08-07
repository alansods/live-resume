import {
  structureResume,
  type StructureOptions,
  type StructuredResume,
} from "@/lib/ai/structure";
import type { Resume } from "@/lib/resume/schema";
import { MAX_FILE_BYTES, notAResume, type Block } from "./blocks";
import { buildResume } from "./build";
import { extract } from "./detect";
import { buildReport, type ImportReport } from "./report";
import { assertOnlyExtractedText, RewriteDetectedError } from "./verify";

/**
 * Importação de currículo, ponta a ponta.
 *
 * `extrair → estruturar → verificar → montar → relatar`. A extração é determinística
 * e local; a estruturação é da IA; a verificação garante que ela distribuiu o texto
 * sem reescrevê-lo; o relatório conta o que ficou em aberto.
 *
 * A estruturação devolve, junto, o veredito sobre o documento: um arquivo que abre e tem
 * texto ainda pode não ser um currículo, e isso só se sabe lendo.
 *
 * Esta função não conhece `Request` nem `Response` — o pipeline inteiro é testável
 * sem subir servidor.
 */

export type ImportResult = {
  resume: Resume;
  report: ImportReport;
};

export type ImportOptions = StructureOptions & {
  fileName?: string;
  /** Limite de tamanho do arquivo, em bytes. */
  limit?: number;
};

export async function importResume(
  bytes: Uint8Array,
  options: ImportOptions = {},
): Promise<ImportResult> {
  // Falha de arquivo acontece antes de qualquer chamada de IA: não se paga uma
  // requisição ao modelo para descobrir que o PDF era uma digitalização.
  const { blocks } = await extract(
    bytes,
    options.fileName,
    options.limit ?? MAX_FILE_BYTES,
  );

  const structured = await estruturarComRepeticao(blocks, options);

  const resume = buildResume(structured);
  return { resume, report: buildReport(resume, blocks) };
}

/**
 * Tentativas de estruturação.
 *
 * Duas, e não mais. A recusa observada num currículo real ficou perto de 25%: com duas
 * tentativas a falha cai para ~6%, com três para ~1,5% — ao preço de uma espera que
 * passaria de dois minutos só na importação. O ganho da terceira não paga o que ela
 * cobra de quem está olhando para a tela.
 */
const TENTATIVAS = 2;

/**
 * Estrutura e verifica, repetindo uma vez quando a trava recusa.
 *
 * A repetição mora aqui, e não dentro de `structureResume`, porque quem sabe que a
 * resposta foi recusada é a verificação — e ela é um passo separado do pipeline, de
 * propósito. Pôr as duas juntas faria a estruturação se auto-verificar, e a trava
 * deixaria de ser auditável de fora.
 *
 * A repetição não afrouxa nada: ela dá ao modelo uma segunda chance de obedecer à mesma
 * regra, informando o campo que ele quebrou. A segunda recusa falha a importação.
 */
async function estruturarComRepeticao(
  blocks: Block[],
  options: ImportOptions,
): Promise<StructuredResume> {
  let rejected: StructureOptions["rejected"];

  for (let tentativa = 1; ; tentativa += 1) {
    const structured = await structureResume(blocks, { ...options, rejected });

    /**
     * O veredito é conferido ANTES da trava anti-reescrita, e não depois.
     *
     * Num documento que não é currículo a IA não tem o que distribuir, e o que ela
     * devolve nos campos tende a ser inventado — exatamente o que a trava recusa. Depois
     * da verificação, este caminho terminaria em "a IA reescreveu conteúdo" (502) e uma
     * segunda tentativa gasta à toa, quando o que houve foi um arquivo errado (422).
     */
    if (structured.documentKind === "not-a-resume") throw notAResume();

    try {
      assertOnlyExtractedText(structured, blocks);
      return structured;
    } catch (error) {
      if (!(error instanceof RewriteDetectedError) || tentativa >= TENTATIVAS)
        throw error;
      rejected = { field: error.field, divergence: error.divergence };
    }
  }
}

export { MAX_FILE_BYTES, ImportError, type Block } from "./blocks";
export { detectFormat, extract } from "./detect";
export { RewriteDetectedError } from "./verify";
export type { ImportReport } from "./report";
