import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ProviderError } from "./errors";
import { GEMINI_DEFAULT_MODEL, createGeminiProvider } from "./gemini";

/**
 * O provedor que não é compatível com a OpenAI, com o SDK substituído.
 *
 * Ele existe para provar que a interface `AiProvider` não é "OpenAI com outra URL":
 * o Gemini tem SDK próprio, campo próprio de instrução de sistema e dialeto próprio de
 * schema — e mesmo assim entra na cadeia sem exceção nenhuma.
 */

type Chamada = Record<string, unknown> & { config?: Record<string, unknown> };

const chamadas: Chamada[] = [];
let erroDoModelo: unknown = null;
let textoDaResposta: string | undefined = '{"ok":true}';

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(readonly opcoes: { apiKey: string }) {}
    models = {
      generateContent: async (pedido: Chamada) => {
        chamadas.push(pedido);
        if (erroDoModelo !== null) throw erroDoModelo;
        return { text: textoDaResposta };
      },
    };
  },
}));

beforeEach(() => {
  chamadas.length = 0;
  erroDoModelo = null;
  textoDaResposta = '{"ok":true}';
  vi.stubEnv("GEMINI_API_KEY", "chave-de-teste");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const PERGUNTA = [
  { role: "system" as const, content: "as regras" },
  { role: "user" as const, content: "o currículo" },
];

describe("Tradução da interface para o SDK do Gemini", () => {
  test("O provedor de SDK próprio traduz a interface para o seu formato", async () => {
    await createGeminiProvider().generate(PERGUNTA);

    expect(chamadas[0].config?.systemInstruction).toBe("as regras");
    expect(chamadas[0].contents).toBe("o currículo");
  });

  test("O schema vai no dialeto próprio do Gemini", async () => {
    const schema = {
      type: "object",
      properties: { a: { type: "string", nullable: true } },
    };
    await createGeminiProvider().generate(PERGUNTA, { responseSchema: schema });

    expect(chamadas[0].config?.responseMimeType).toBe("application/json");
    expect(chamadas[0].config?.responseSchema).toEqual(schema);
  });

  test("a resposta traz quem atendeu e com qual modelo", async () => {
    const resposta = await createGeminiProvider().generate(PERGUNTA);
    expect(resposta).toEqual({
      text: '{"ok":true}',
      provider: "Gemini",
      model: GEMINI_DEFAULT_MODEL,
    });
  });

  test("GEMINI_MODEL sobrescreve o padrão", async () => {
    vi.stubEnv("GEMINI_MODEL", "outro-modelo");
    const resposta = await createGeminiProvider().generate(PERGUNTA);
    expect(resposta.model).toBe("outro-modelo");
  });

  test("sem chave, o provedor se declara não configurado", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(createGeminiProvider().isConfigured()).toBe(false);
  });
});

describe("Erros do modelo", () => {
  async function falhar(): Promise<ProviderError> {
    return createGeminiProvider()
      .generate(PERGUNTA)
      .then(
        () => {
          throw new Error("a chamada deveria ter falhado");
        },
        (erro: ProviderError) => erro,
      );
  }

  test("429 vira falha de cota", async () => {
    erroDoModelo = Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 });
    const erro = await falhar();
    expect(erro).toBeInstanceOf(ProviderError);
    expect(erro.kind).toBe("quota");
    expect(erro.provider).toBe("Gemini");
  });

  test("modelo sobrecarregado vira indisponibilidade", async () => {
    erroDoModelo = Object.assign(new Error("The model is overloaded."), { status: 503 });
    expect((await falhar()).kind).toBe("unavailable");
  });

  test("resposta vazia conta como indisponibilidade", async () => {
    textoDaResposta = undefined;
    expect((await falhar()).kind).toBe("unavailable");
  });
});
