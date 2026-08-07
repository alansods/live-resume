import { createOpenAiCompatibleProvider } from "./openai-compatible";
import type { AiProvider } from "./types";

/**
 * Groq — inferência rápida de modelos abertos, API compatível com a OpenAI.
 *
 * O arquivo inteiro é configuração: toda a implementação está em
 * `openai-compatible.ts`. É esse o formato de um provedor novo aqui.
 */
export function createGroqProvider(): AiProvider {
  return createOpenAiCompatibleProvider({
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    env: { apiKey: "GROQ_API_KEY", model: "GROQ_MODEL" },
    // Padrão só para o caso de GROQ_MODEL faltar. Escolhido por suportar saída
    // estruturada estrita, que é requisito de toda chamada do projeto — nem todo
    // modelo do catálogo suporta.
    defaultModel: "openai/gpt-oss-120b",
  });
}
