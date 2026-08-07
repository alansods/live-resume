import { createOpenAiCompatibleProvider } from "./openai-compatible";
import type { AiProvider } from "./types";

/** Cerebras — mesma API compatível com a OpenAI; muda a URL, a chave e o modelo. */
export function createCerebrasProvider(): AiProvider {
  return createOpenAiCompatibleProvider({
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    env: { apiKey: "CEREBRAS_API_KEY", model: "CEREBRAS_MODEL" },
    defaultModel: "gpt-oss-120b",
  });
}
