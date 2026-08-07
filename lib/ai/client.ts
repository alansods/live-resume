import type { z } from "zod";
import { AiError } from "./errors";
import { aiService, type AiService } from "./service";

/**
 * Saída estruturada — a única forma de falar com o modelo neste projeto.
 *
 * A resposta vem como JSON validado por um schema Zod, nunca como texto para
 * interpretar. Esta camada monta o pedido, entrega ao `AiService` e confere o que
 * voltou; **qual** IA respondeu é decisão da cadeia de provedores e não aparece aqui
 * nem em nenhum arquivo fora de `lib/ai/`.
 *
 * As chaves são lidas só no servidor, dentro de cada provedor, e nunca chegam ao
 * cliente.
 */

export { AiError };
export type { AiFailureReason } from "./errors";

export type StructuredRequest<T> = {
  /** Instrução de sistema: o papel e as regras invioláveis da tarefa. */
  system: string;
  /** O conteúdo sobre o qual o modelo trabalha. */
  prompt: string;
  /** Forma esperada da resposta, em JSON Schema, para o modelo obedecer. */
  responseSchema: Record<string, unknown>;
  /** Validação da resposta do nosso lado — o modelo pode errar mesmo com schema. */
  validate: z.ZodType<T>;
  /** Sobrescreve o modelo do provedor que atender. Ver `GenerationOptions.model`. */
  model?: string;
};

/**
 * A fronteira que os testes substituem. Nenhum teste chama a API real: a suíte injeta
 * uma implementação com respostas gravadas.
 */
export type AiClient = {
  generateStructured<T>(request: StructuredRequest<T>): Promise<T>;
};

function descreverDivergencia(erro: z.ZodError): string {
  return erro.issues
    .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
    .join("; ");
}

/**
 * O cliente que o projeto usa em produção.
 *
 * Recebe o serviço por parâmetro para que dê para testá-lo sem rede — e para que
 * trocar a cadeia de provedores seja um argumento, não uma edição.
 */
export function createAiClient(service: AiService = aiService): AiClient {
  return {
    async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
      const resposta = await service.generate(
        [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
        {
          responseSchema: request.responseSchema,
          schemaName: "resposta",
          model: request.model,
        },
      );

      let bruto: unknown;
      try {
        bruto = JSON.parse(resposta.text);
      } catch (error) {
        // Sem fallback aqui, e é intencional: o provedor respondeu, e a resposta veio
        // torta. Isso é defeito do pedido ou do modelo escolhido, não indisponibilidade —
        // repetir a mesma pergunta no provedor seguinte tende a produzir o mesmo lixo,
        // mais devagar.
        throw new AiError(
          "invalid-response",
          "O modelo devolveu uma resposta que não é JSON válido.",
          error,
        );
      }

      const resultado = request.validate.safeParse(bruto);
      if (!resultado.success) {
        throw new AiError(
          "invalid-response",
          `A resposta do modelo não corresponde ao formato esperado. ${descreverDivergencia(resultado.error)}`,
        );
      }

      return resultado.data;
    },
  };
}
