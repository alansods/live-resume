import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AiError, createAiClient } from "./client";
import type { AiProvider } from "./providers/types";
import { createAiService } from "./service";
import { fakeProvider } from "./testing";

/**
 * A camada estruturada, sobre a cadeia de provedores.
 *
 * Nenhuma API é chamada. O que se verifica aqui é o que sai da camada de IA para o
 * resto do projeto: JSON validado, ou um `AiError` de vocabulário fechado — nunca a
 * resposta crua de um provedor, nunca o nome de quem atendeu.
 */

const Formato = z.object({ ok: z.boolean() });

const pedido = {
  system: "s",
  prompt: "p",
  responseSchema: { type: "object" },
  validate: Formato,
};

function clienteCom(...providers: AiProvider[]) {
  return createAiClient(createAiService(providers));
}

/** O erro de uma chamada que precisava falhar. */
function falhaDe(chamada: Promise<unknown>): Promise<AiError> {
  return chamada.then(
    () => {
      throw new Error("a chamada deveria ter falhado");
    },
    (erro: AiError) => erro,
  );
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe("Resposta válida", () => {
  test("o JSON validado é o que volta", async () => {
    const cliente = clienteCom(fakeProvider("Gemini", { text: '{"ok":true}' }));
    await expect(cliente.generateStructured(pedido)).resolves.toEqual({ ok: true });
  });

  test("o pedido vira instrução de sistema mais conteúdo", async () => {
    const provider = fakeProvider("Gemini", { text: '{"ok":true}' });
    await clienteCom(provider).generateStructured(pedido);

    expect(provider.calls[0]).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "p" },
    ]);
  });

  test("O provedor que atendeu não aparece no retorno", async () => {
    const cliente = clienteCom(
      fakeProvider("Gemini", { falha: "quota" }),
      fakeProvider("Groq", { text: '{"ok":true}' }),
    );

    // Quem chama recebe o dado, e só. Trocar Groq por outro provedor não muda nada
    // aqui — é isso que mantém o resto do projeto desacoplado da escolha de IA.
    await expect(cliente.generateStructured(pedido)).resolves.toEqual({ ok: true });
  });
});

describe("Resposta que não serve", () => {
  test("texto que não é JSON vira resposta inválida", async () => {
    const cliente = clienteCom(fakeProvider("Gemini", { text: "desculpe, não posso" }));

    await expect(cliente.generateStructured(pedido)).rejects.toMatchObject({
      name: "AiError",
      reason: "invalid-response",
    });
  });

  test("JSON fora do formato esperado é recusado com o campo que divergiu", async () => {
    const cliente = clienteCom(fakeProvider("Gemini", { text: '{"ok":"talvez"}' }));

    const erro = await falhaDe(cliente.generateStructured(pedido));

    expect(erro.reason).toBe("invalid-response");
    expect(erro.message).toContain("ok");
  });

  test("Resposta que não é JSON não vira fallback", async () => {
    const primeiro = fakeProvider("Gemini", { text: "não é JSON" });
    const segundo = fakeProvider("Groq", { text: '{"ok":true}' });

    await expect(
      clienteCom(primeiro, segundo).generateStructured(pedido),
    ).rejects.toThrow(AiError);
    expect(segundo.calls).toHaveLength(0);
  });
});

/** A resposta que o Google devolve quando a cota diária acaba, como ela chega ao SDK. */
const CORPO_DO_429 = JSON.stringify({
  error: {
    code: 429,
    message:
      "You exceeded your current quota, please check your plan and billing details.",
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
      },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "59s" },
    ],
  },
});

describe("A resposta de erro do provedor não chega à tela", () => {
  test("A resposta da API não chega à tela", async () => {
    const cliente = clienteCom(
      fakeProvider("Gemini", { falha: "quota", message: CORPO_DO_429 }),
      fakeProvider("Groq", { falha: "quota", message: "Rate limit reached" }),
    );

    const falha = await falhaDe(cliente.generateStructured(pedido));

    expect(falha).toBeInstanceOf(AiError);
    expect(falha.reason).toBe("quota-exceeded");

    for (const vazamento of [
      "quotaId",
      "QuotaFailure",
      "RESOURCE_EXHAUSTED",
      "retryDelay",
      "429",
      "{",
      "Gemini",
      "Groq",
    ]) {
      expect(falha.message, vazamento).not.toContain(vazamento);
    }

    // E diz o que a pessoa precisa saber: foi limite de uso, não o modelo caindo.
    expect(falha.message).toMatch(/limite de uso gratuito/i);
    // Sem prazo: o 429 não diz qual janela estourou, e "59s" é o que a API sugere
    // mesmo quando o limite é diário.
    expect(falha.message).not.toContain("59");
    expect(falha.message).not.toMatch(/24 horas|hoje/i);
  });

  test("O detalhe bruto vai para o registro do servidor", async () => {
    const cliente = clienteCom(
      fakeProvider("Gemini", { falha: "quota", message: CORPO_DO_429 }),
    );

    await cliente.generateStructured(pedido).catch(() => {});

    const registrado = JSON.stringify(warn.mock.calls);
    expect(registrado).toContain("quota");
    expect(registrado).toContain("QuotaFailure");
    // Um registro por provedor que falhou, no ponto em que a falha aconteceu.
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
