import { afterEach, describe, expect, test, vi } from "vitest";
import { CATALOGO, ORDEM_PADRAO, createProviderChain } from "./registry";

/**
 * A ordem de prioridade é dado, não código espalhado.
 *
 * O teste que mais importa aqui é o último: acrescentar um provedor não deve exigir
 * mudar nada além do catálogo.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Montagem da cadeia", () => {
  test("A ordem padrão é Gemini, Groq e Cerebras", () => {
    expect(createProviderChain().map((p) => p.name)).toEqual([
      "Gemini",
      "Groq",
      "Cerebras",
    ]);
    expect([...ORDEM_PADRAO]).toEqual(["gemini", "groq", "cerebras"]);
  });

  test("A variável de ambiente reordena a cadeia", () => {
    vi.stubEnv("AI_PROVIDERS", "groq,cerebras,gemini");
    expect(createProviderChain().map((p) => p.name)).toEqual([
      "Groq",
      "Cerebras",
      "Gemini",
    ]);
  });

  test("AI_PROVIDERS também encurta a cadeia", () => {
    vi.stubEnv("AI_PROVIDERS", "groq");
    expect(createProviderChain().map((p) => p.name)).toEqual(["Groq"]);
  });

  test("A variável de ambiente desliga a IA por inteiro", () => {
    vi.stubEnv("AI_PROVIDERS", "none");
    expect(createProviderChain()).toEqual([]);
  });

  test("espaços e maiúsculas não atrapalham", () => {
    vi.stubEnv("AI_PROVIDERS", " Groq , GEMINI ");
    expect(createProviderChain().map((p) => p.name)).toEqual(["Groq", "Gemini"]);
  });

  test("Nome de provedor desconhecido é ignorado", () => {
    vi.stubEnv("AI_PROVIDERS", "groq,inexistente,gemini");
    expect(createProviderChain().map((p) => p.name)).toEqual(["Groq", "Gemini"]);
  });

  test("variável vazia cai na ordem padrão", () => {
    vi.stubEnv("AI_PROVIDERS", "   ");
    expect(createProviderChain().map((p) => p.name)).toEqual([
      "Gemini",
      "Groq",
      "Cerebras",
    ]);
  });
});

describe("Extensibilidade", () => {
  test("Todo provedor do catálogo cumpre a mesma interface", () => {
    for (const [chave, fabrica] of Object.entries(CATALOGO)) {
      const provider = fabrica();
      expect(typeof provider.name, chave).toBe("string");
      expect(typeof provider.isConfigured, chave).toBe("function");
      expect(typeof provider.generate, chave).toBe("function");
    }
  });
});
