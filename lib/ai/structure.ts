import { z } from "zod";
import type { Block } from "@/lib/parsing/blocks";
import { createAiClient, type AiClient } from "./client";

/**
 * Estruturação do currículo pela IA.
 *
 * O código extrai o texto; o modelo o distribui nos campos. Não há heurística de
 * seção nem regra de "a primeira linha é a empresa" — esse tipo de lista finita
 * sempre perde para a variedade dos currículos reais.
 *
 * O modelo devolve **só texto**: ids, origem e normalização de período são aplicados
 * do nosso lado, e cada texto devolvido é verificado contra o texto extraído antes de
 * virar currículo.
 */

/** O que a IA devolve: a forma do currículo, sem nada que ela possa inventar. */
export const StructuredResumeSchema = z.object({
  /**
   * O veredito sobre o documento: é um currículo, ou é outra coisa?
   *
   * Vem junto da estruturação, e não de uma chamada própria, porque o modelo já leu o
   * documento inteiro para distribuir o texto — perguntar o veredito no mesmo pedido é
   * de graça, e o plano gratuito são 20 requisições por dia, das quais um fluxo completo
   * já gasta 4.
   *
   * É o único campo que a IA JULGA em vez de copiar. Por isso ele é booleano-de-duas-
   * palavras e não texto livre: um veredito que a pessoa vai ler precisa vir do nosso
   * dicionário, não da caneta do modelo.
   */
  documentKind: z.enum(["resume", "not-a-resume"]),
  header: z.object({
    name: z.string(),
    role: z.string(),
    contact: z.array(z.string().min(1)),
  }),
  summary: z.string().nullable(),
  jobs: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      period: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  // `.optional()` + `.transform`: o provedor pode gerar uma resposta sem citar a chave (ver
  // `lib/ai/providers/openai-compatible.ts`), e os dois campos podem legitimamente estar
  // vazios num currículo real — ausência não é resposta fora do esquema.
  education: z
    .array(
      z.object({
        course: z.string(),
        school: z.string(),
        period: z.string(),
      }),
    )
    .optional()
    .transform((valor) => valor ?? []),
  skills: z
    .string()
    .nullable()
    .optional()
    .transform((valor) => valor ?? null),
});

export type StructuredResume = z.infer<typeof StructuredResumeSchema>;

/** O mesmo formato em JSON Schema, que é o que o Gemini aceita em `responseSchema`. */
export const structuredResumeJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    documentKind: { type: "string", enum: ["resume", "not-a-resume"] },
    header: {
      type: "object",
      properties: {
        name: { type: "string" },
        role: { type: "string" },
        contact: { type: "array", items: { type: "string" } },
      },
      required: ["name", "role", "contact"],
    },
    summary: { type: "string", nullable: true },
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          period: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["company", "role", "period", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          course: { type: "string" },
          school: { type: "string" },
          period: { type: "string" },
        },
        required: ["course", "school", "period"],
      },
    },
    skills: { type: "string", nullable: true },
  },
  required: ["documentKind", "header", "summary", "jobs", "education", "skills"],
};

const SYSTEM = `Você organiza currículos já extraídos de arquivos DOCX ou PDF.

Sua tarefa é DISTRIBUIR o texto recebido nos campos do formato de saída. Você não é um
revisor: não melhore, não reescreva, não resuma, não traduza, não corrija gramática e
não complete informação que falta.

Regras invioláveis:
1. Todo texto que você devolver deve aparecer LITERALMENTE no texto recebido. Você pode
   dividir um bloco em partes e descartar marcadores de lista, mas não pode mudar
   palavras.
2. Se um campo não existe no currículo, devolva string vazia (ou null onde o formato
   permitir). Nunca invente nome de empresa, cargo, curso, instituição ou data.
3. Períodos vão como estão escritos no currículo. Não converta formato nem complete mês
   que não foi informado.
4. O texto pode vir de um currículo de várias colunas, marcado com o número da coluna.
   Nesse caso remonte a ordem de leitura correta: cada bullet pertence à experiência
   cujo cabeçalho o antecede na mesma coluna.
5. Preserve a ordem em que as experiências e formações aparecem no currículo.
6. Contato é um ARRAY: cada linha (email, LinkedIn, telefone, endereço) é um elemento
   próprio, na ordem em que aparece. Nunca una linhas com espaços ou separadores.

Antes de distribuir, diga em "documentKind" que documento é este:
- "resume": um currículo, CV ou resumo profissional, de QUALQUER área e em qualquer
  formato — inclusive curto, sem experiência, só com formação, em outro idioma, mal
  formatado ou com seções fora do comum.
- "not-a-resume": o documento é claramente outra coisa — contrato, artigo, relatório,
  carta de apresentação sozinha, fatura, apostila, texto literário.

Na dúvida, responda "resume". Recusar o currículo de alguém por ser diferente do
esperado é um erro muito pior que aceitar um documento estranho. Só responda
"not-a-resume" quando não houver dúvida razoável. Quando responder "not-a-resume",
preencha os demais campos com string vazia ou lista vazia.`;

/** O texto extraído, anotado com o que o parser sabe de cada bloco. */
export function renderBlocks(blocks: Block[]): string {
  return blocks
    .map((block) => {
      const marca =
        block.kind === "listItem" ? "- " : block.kind === "heading" ? "# " : "";
      const coluna = block.column === undefined ? "" : ` [coluna ${block.column + 1}]`;
      return `${marca}${block.text}${coluna}`;
    })
    .join("\n");
}

export type StructureOptions = {
  /** Injetável para que os testes nunca cheguem à API real. */
  client?: AiClient;
  model?: string;
  /**
   * O que a tentativa anterior quebrou — o campo e a forma da divergência, nunca o
   * texto. Um segundo sorteio idêntico tem chance real de repetir o mesmo erro; dizer
   * onde ele falhou é o que torna a repetição diferente de esperar por sorte.
   */
  rejected?: { field: string; divergence: string };
};

/**
 * O retorno da tentativa anterior, acrescentado ao pedido.
 *
 * O que NÃO vai aqui é o texto certo: nós não sabemos qual é. As cinco regras
 * invioláveis já dizem o que fazer; o que muda é que agora o modelo sabe onde falhou.
 */
function avisoDaTentativaAnterior(rejected: NonNullable<StructureOptions["rejected"]>) {
  return `\n\nATENÇÃO: na tentativa anterior o campo "${rejected.field}" foi recusado porque o texto devolvido não aparece literalmente no currículo extraído (divergência: ${rejected.divergence}). Copie o texto exatamente como ele está acima, sem corrigir acento, grafia ou pontuação.`;
}

export async function structureResume(
  blocks: Block[],
  options: StructureOptions = {},
): Promise<StructuredResume> {
  const client = options.client ?? createAiClient();
  const retorno = options.rejected ? avisoDaTentativaAnterior(options.rejected) : "";

  return client.generateStructured({
    system: SYSTEM,
    prompt: `Currículo extraído:\n\n${renderBlocks(blocks)}${retorno}`,
    responseSchema: structuredResumeJsonSchema,
    validate: StructuredResumeSchema,
    model: options.model,
  });
}
