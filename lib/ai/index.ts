/**
 * A superfície pública da camada de IA.
 *
 * Fora de `lib/ai/`, é só isto que existe. Nenhum arquivo do projeto importa o SDK da
 * OpenAI, do Google ou de qualquer provedor; nenhum arquivo sabe se quem respondeu foi
 * Gemini, Groq ou Cerebras. Trocar de provedor, acrescentar um ou mudar a ordem de
 * prioridade não toca em nada daqui para fora.
 *
 * Duas portas, uma para cada altura:
 *
 * - `createAiClient()` — saída estruturada com validação Zod. É o que as features usam.
 * - `aiService` / `createAiService()` — texto cru, um degrau abaixo, para quando um dia
 *   houver uma chamada que não peça JSON.
 */

export { createAiClient, type AiClient, type StructuredRequest } from "./client";
export { AiError, type AiFailureReason } from "./errors";
export { aiService, createAiService, type AiService } from "./service";
export type {
  AiProvider,
  AiResponse,
  ChatMessage,
  ChatRole,
  GenerationOptions,
} from "./providers/types";
export { createProviderChain, CATALOGO, ORDEM_PADRAO } from "./providers/registry";
