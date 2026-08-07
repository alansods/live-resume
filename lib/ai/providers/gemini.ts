import { ProviderError, classifyFailure } from "./errors";
import type { AiProvider, AiResponse, ChatMessage, GenerationOptions } from "./types";

/**
 * Gemini — o provedor que **não** é compatível com a OpenAI.
 *
 * Tem SDK próprio, chama a instrução de sistema de `systemInstruction` e aceita o
 * schema num campo dedicado, no seu próprio dialeto (com `nullable`). Por isso não
 * reaproveita `openai-compatible.ts`: reaproveita a *interface*, que é o que importa.
 *
 * Ele existir aqui é a prova de que a abstração não é só "OpenAI com outra URL".
 */

/**
 * Modelo padrão do provedor, usado quando `GEMINI_MODEL` não está definida.
 *
 * Fixado por versão, e não `gemini-flash-latest`: o alias sobreviveria sozinho à
 * aposentadoria de um modelo, mas trocaria o modelo por baixo da estruturação sem
 * ninguém editar código. Num projeto em que a resposta da IA é revalidada por Zod e
 * travada por `verify.ts`, comportamento reprodutível vale mais que atualização
 * automática — ao custo, assumido, de um dia esta linha precisar mudar à mão.
 *
 * Foi o que aconteceu com `gemini-2.5-flash`, aposentado para chaves novas: a suíte
 * continuou verde porque nenhum teste chama a API, e o produto inteiro devolvia 502.
 * Hoje a cadeia de provedores absorve esse tipo de queda — mas absorver não é motivo
 * para deixar de arrumar.
 */
export const GEMINI_DEFAULT_MODEL = "gemini-3.6-flash";

function lerVariavel(nome: string): string | undefined {
  const valor = process.env[nome];
  return valor && valor.trim().length > 0 ? valor.trim() : undefined;
}

/** O Gemini separa instrução de sistema do conteúdo; o resto do projeto fala em mensagens. */
function separar(messages: ChatMessage[]): { system: string; prompt: string } {
  const sistema: string[] = [];
  const conteudo: string[] = [];
  for (const mensagem of messages) {
    (mensagem.role === "system" ? sistema : conteudo).push(mensagem.content);
  }
  return { system: sistema.join("\n\n"), prompt: conteudo.join("\n\n") };
}

export function createGeminiProvider(): AiProvider {
  return {
    name: "Gemini",

    isConfigured(): boolean {
      return lerVariavel("GEMINI_API_KEY") !== undefined;
    },

    async generate(
      messages: ChatMessage[],
      options: GenerationOptions = {},
    ): Promise<AiResponse> {
      const apiKey = lerVariavel("GEMINI_API_KEY");
      if (!apiKey) {
        throw new ProviderError(
          "Gemini",
          "unauthorized",
          "GEMINI_API_KEY não está configurada.",
        );
      }

      const model = options.model ?? lerVariavel("GEMINI_MODEL") ?? GEMINI_DEFAULT_MODEL;
      const { system, prompt } = separar(messages);

      // Import dinâmico: o SDK só é carregado quando há de fato uma chamada, e nunca
      // entra no bundle do cliente.
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      let texto: string | undefined;
      try {
        const resposta = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            temperature: options.temperature ?? 0,
            ...(options.responseSchema
              ? {
                  responseMimeType: "application/json",
                  // O schema vai como está: o dialeto do projeto é o do Gemini, e é o
                  // provedor compatível com a OpenAI que precisa traduzir.
                  responseSchema: options.responseSchema,
                }
              : {}),
          },
        });
        texto = resposta.text;
      } catch (error) {
        const { kind, status } = classifyFailure(error);
        throw new ProviderError(
          "Gemini",
          kind,
          (error as Error | null)?.message ?? "Chamada ao modelo falhou.",
          { status, cause: error },
        );
      }

      if (!texto || texto.trim().length === 0) {
        throw new ProviderError(
          "Gemini",
          "unavailable",
          "O modelo devolveu uma resposta vazia.",
        );
      }

      return { text: texto, provider: "Gemini", model };
    },
  };
}
