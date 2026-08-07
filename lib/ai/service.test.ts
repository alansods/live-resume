import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AiError } from "./errors";
import { createAiService } from "./service";
import { fakeProvider } from "./testing";

/**
 * A cadeia de fallback.
 *
 * Nenhuma API é chamada: os provedores são de mentira, e o que se verifica é a regra
 * de quem tenta quem, quando desiste e o que sobra para o resto do projeto ver.
 */

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

const PERGUNTA = [{ role: "user" as const, content: "oi" }];

describe("Sucesso no primeiro provedor", () => {
  test("Sucesso no primeiro provedor não chega ao segundo", async () => {
    const primeiro = fakeProvider("Gemini", { text: "resposta" });
    const segundo = fakeProvider("Groq", { text: "não deveria" });

    const resposta = await createAiService([primeiro, segundo]).generate(PERGUNTA);

    expect(resposta.text).toBe("resposta");
    expect(resposta.provider).toBe("Gemini");
    expect(segundo.calls).toHaveLength(0);
  });
});

describe("Fallback em falha temporária", () => {
  test("Falha temporária no primeiro provedor leva ao segundo", async () => {
    const primeiro = fakeProvider("Gemini", { falha: "quota" });
    const segundo = fakeProvider("Groq", { text: "resposta do segundo" });

    const resposta = await createAiService([primeiro, segundo]).generate(PERGUNTA);

    expect(resposta.provider).toBe("Groq");
    expect(primeiro.calls).toHaveLength(1);
  });

  test("Indisponibilidade leva ao próximo provedor", async () => {
    const primeiro = fakeProvider("Gemini", { falha: "unavailable" });
    const segundo = fakeProvider("Groq", { text: "resposta do segundo" });

    const resposta = await createAiService([primeiro, segundo]).generate(PERGUNTA);
    expect(resposta.provider).toBe("Groq");
  });

  test("A cadeia percorre quantos provedores forem precisos", async () => {
    const cadeia = [
      fakeProvider("Gemini", { falha: "quota" }),
      fakeProvider("Groq", { falha: "unavailable" }),
      fakeProvider("Cerebras", { text: "por fim" }),
    ];

    const resposta = await createAiService(cadeia).generate(PERGUNTA);

    expect(resposta.provider).toBe("Cerebras");
    expect(cadeia.map((p) => p.calls.length)).toEqual([1, 1, 1]);
  });

  test("O pedido chega igual a cada provedor", async () => {
    const primeiro = fakeProvider("Gemini", { falha: "quota" });
    const segundo = fakeProvider("Groq", { text: "ok" });

    await createAiService([primeiro, segundo]).generate(PERGUNTA);

    expect(segundo.calls[0]).toEqual(primeiro.calls[0]);
  });
});

describe("Falha definitiva interrompe a cadeia", () => {
  test("Pedido inválido não é tentado no próximo provedor", async () => {
    const primeiro = fakeProvider("Gemini", { falha: "invalid-request" });
    const segundo = fakeProvider("Groq", { text: "não deveria" });

    await expect(createAiService([primeiro, segundo]).generate(PERGUNTA)).rejects.toThrow(
      AiError,
    );
    expect(segundo.calls).toHaveLength(0);
  });

  test("Chave recusada não é tentada no próximo provedor", async () => {
    const primeiro = fakeProvider("Gemini", { falha: "unauthorized" });
    const segundo = fakeProvider("Groq", { text: "não deveria" });

    const erro = await createAiService([primeiro, segundo])
      .generate(PERGUNTA)
      .catch((e) => e);

    expect(erro).toBeInstanceOf(AiError);
    expect(erro.reason).toBe("missing-credentials");
    expect(segundo.calls).toHaveLength(0);
  });
});

describe("Provedor sem chave", () => {
  test("Provedor sem chave é pulado sem gastar tentativa", async () => {
    const semChave = fakeProvider("Gemini", { text: "x" }, { configurado: false });
    const comChave = fakeProvider("Groq", { text: "resposta" });

    const resposta = await createAiService([semChave, comChave]).generate(PERGUNTA);

    expect(resposta.provider).toBe("Groq");
    expect(semChave.calls).toHaveLength(0);
  });

  test("Cadeia inteira sem chave falha por configuração ausente", async () => {
    const cadeia = [
      fakeProvider("Gemini", { text: "x" }, { configurado: false }),
      fakeProvider("Groq", { text: "x" }, { configurado: false }),
    ];

    const erro = await createAiService(cadeia)
      .generate(PERGUNTA)
      .catch((e) => e);
    expect(erro.reason).toBe("missing-credentials");
  });

  test("Cadeia vazia falha sem chamar ninguém", async () => {
    const erro = await createAiService([])
      .generate(PERGUNTA)
      .catch((e) => e);
    expect(erro).toBeInstanceOf(AiError);
    expect(erro.reason).toBe("missing-credentials");
  });
});

describe("Quando todos falham", () => {
  test("O erro final não nomeia o provedor que falhou", async () => {
    const cadeia = [
      fakeProvider("Gemini", { falha: "unavailable", message: "503 do Google" }),
      fakeProvider("Groq", { falha: "unavailable", message: "socket hang up" }),
    ];

    const erro = await createAiService(cadeia)
      .generate(PERGUNTA)
      .catch((e) => e);

    expect(erro).toBeInstanceOf(AiError);
    expect(erro.reason).toBe("call-failed");
    expect(erro.message).toBe(
      "Nenhum provedor de IA disponível no momento. Tente novamente.",
    );
    expect(erro.message).not.toMatch(/Gemini|Groq|503|socket/);
  });

  test("Limite de uso vira motivo de cota", async () => {
    const cadeia = [
      fakeProvider("Gemini", { falha: "quota" }),
      fakeProvider("Groq", { falha: "unavailable" }),
    ];

    const erro = await createAiService(cadeia)
      .generate(PERGUNTA)
      .catch((e) => e);

    // 429 e não 502: o conselho na tela muda. "Tente de novo" é errado quando o que
    // acabou foi a cota.
    expect(erro.reason).toBe("quota-exceeded");
  });

  test("Outras falhas da API continuam falha de comunicação", async () => {
    // Qualquer falha que não seja cota — com ou sem status — chega ao usuário como
    // problema de comunicação, e nunca como limite estourado.
    for (const falha of ["unavailable", "invalid-request", "unauthorized"] as const) {
      const erro = await createAiService([fakeProvider("Gemini", { falha })])
        .generate(PERGUNTA)
        .catch((e) => e);
      expect(erro.reason, falha).not.toBe("quota-exceeded");
    }
  });

  test("o detalhe bruto fica no registro do servidor, não no erro", async () => {
    const cadeia = [fakeProvider("Gemini", { falha: "quota", message: "quota diária" })];

    await createAiService(cadeia)
      .generate(PERGUNTA)
      .catch(() => {});

    expect(warn).toHaveBeenCalledWith(
      "ai: provedor falhou",
      expect.objectContaining({ provider: "Gemini", kind: "quota" }),
    );
  });
});

describe("Erro que não é ProviderError", () => {
  test("Erro cru de SDK é classificado como qualquer outro", async () => {
    const explodindo = {
      name: "Groq",
      isConfigured: () => true,
      async generate(): Promise<never> {
        throw Object.assign(new Error("boom"), { status: 503 });
      },
    };
    const segundo = fakeProvider("Cerebras", { text: "resposta" });

    const resposta = await createAiService([explodindo, segundo]).generate(PERGUNTA);
    expect(resposta.provider).toBe("Cerebras");
  });
});
