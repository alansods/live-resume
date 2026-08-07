import { ProviderError, classifyFailure } from "./errors";
import { toStrictJsonSchema } from "./json-schema";
import type { AiProvider, AiResponse, ChatMessage, GenerationOptions } from "./types";

/**
 * A implementação que todo provedor compatível com a OpenAI reaproveita.
 *
 * Groq e Cerebras — e amanhã OpenRouter, xAI, a própria OpenAI — falam o mesmo
 * protocolo. Entre eles muda só `baseURL`, chave e modelo, então é só isso que os
 * arquivos de provedor declaram: o resto (SDK, saída estruturada, tradução de erro)
 * vive aqui, uma vez.
 */

export type OpenAiCompatibleConfig = {
  /** Nome legível, usado nos registros. */
  name: string;
  baseUrl: string;
  /**
   * Nomes das variáveis de ambiente, não os valores.
   *
   * A leitura acontece a cada chamada, e nunca no carregamento do módulo: em Next
   * o módulo pode ser avaliado numa fase em que o ambiente ainda não está montado, e
   * um valor lido cedo demais congela `undefined` para sempre.
   */
  env: { apiKey: string; model: string };
  /** Usado quando a variável de modelo não está definida. */
  defaultModel: string;
};

/** Teto por tentativa. Uma cadeia de provedores lentos não pode segurar a requisição. */
const TIMEOUT_PADRAO_MS = 60_000;

function lerTimeout(): number {
  const bruto = Number(process.env.AI_TIMEOUT_MS);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : TIMEOUT_PADRAO_MS;
}

function lerVariavel(nome: string): string | undefined {
  const valor = process.env[nome];
  return valor && valor.trim().length > 0 ? valor.trim() : undefined;
}

export function createOpenAiCompatibleProvider(
  config: OpenAiCompatibleConfig,
): AiProvider {
  return {
    name: config.name,

    isConfigured(): boolean {
      return lerVariavel(config.env.apiKey) !== undefined;
    },

    async generate(
      messages: ChatMessage[],
      options: GenerationOptions = {},
    ): Promise<AiResponse> {
      const apiKey = lerVariavel(config.env.apiKey);
      if (!apiKey) {
        throw new ProviderError(
          config.name,
          "unauthorized",
          `${config.env.apiKey} não está configurada.`,
        );
      }

      const model = options.model ?? lerVariavel(config.env.model) ?? config.defaultModel;

      // Import dinâmico: o SDK só é carregado quando há de fato uma chamada, e nunca
      // entra no bundle do cliente.
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey,
        baseURL: config.baseUrl,
        timeout: lerTimeout(),
        // A repetição automática do SDK está desligada de propósito: quem decide o que
        // fazer com um 429 é a cadeia de provedores, e ela prefere trocar de provedor a
        // esperar. Deixar as duas coisas ligadas multiplicaria a espera sem avisar
        // ninguém.
        maxRetries: 0,
      });

      let resposta;
      try {
        resposta = await client.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0,
          ...(options.responseSchema
            ? {
                response_format: {
                  type: "json_schema" as const,
                  json_schema: {
                    name: options.schemaName ?? "resposta",
                    // Sem `strict: true`: o provedor pode gerar uma resposta sem citar toda
                    // chave do schema (ex.: `education`/`skills` vazios), e a validação de
                    // quem chama decide o que fazer — em vez do provedor recusar a resposta
                    // inteira antes de nos devolver qualquer JSON.
                    strict: false,
                    schema: toStrictJsonSchema(options.responseSchema),
                  },
                },
              }
            : {}),
        });
      } catch (error) {
        const { kind, status } = classifyFailure(error);
        throw new ProviderError(
          config.name,
          kind,
          (error as Error | null)?.message ?? "Chamada ao provedor falhou.",
          { status, cause: error },
        );
      }

      const texto = resposta.choices[0]?.message?.content;
      if (!texto || texto.trim().length === 0) {
        // Resposta vazia conta como indisponibilidade, não como resposta ruim: o
        // provedor não disse nada de errado — não disse nada. O próximo da fila tem
        // chance real de responder.
        throw new ProviderError(
          config.name,
          "unavailable",
          "O provedor devolveu uma resposta vazia.",
        );
      }

      return { text: texto, provider: config.name, model };
    },
  };
}
