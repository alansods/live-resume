import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createCerebrasProvider } from "./cerebras";
import { ProviderError } from "./errors";
import { createGroqProvider } from "./groq";

/**
 * Os provedores compatíveis com a OpenAI, com o SDK substituído.
 *
 * Nenhuma API é chamada — a regra do projeto vale aqui como em todo o resto. O que se
 * verifica é o pedido que sai daqui (URL, chave, modelo, formato da resposta) e a
 * tradução do erro que volta.
 */

type Chamada = { config: Record<string, unknown>; body: Record<string, unknown> };

const chamadas: Chamada[] = [];
let erroDoSdk: unknown = null;
let conteudoDaResposta: string | null = '{"ok":true}';

vi.mock("openai", () => ({
  default: class {
    config: Record<string, unknown>;
    constructor(config: Record<string, unknown>) {
      this.config = config;
    }
    chat = {
      completions: {
        create: async (body: Record<string, unknown>) => {
          chamadas.push({ config: this.config, body });
          if (erroDoSdk !== null) throw erroDoSdk;
          return { choices: [{ message: { content: conteudoDaResposta } }] };
        },
      },
    };
  },
}));

beforeEach(() => {
  chamadas.length = 0;
  erroDoSdk = null;
  conteudoDaResposta = '{"ok":true}';
  vi.stubEnv("GROQ_API_KEY", "chave-groq");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const PERGUNTA = [{ role: "user" as const, content: "oi" }];

describe("O que muda entre provedores é só configuração", () => {
  test("Provedores compatíveis com a OpenAI compartilham a implementação", async () => {
    vi.stubEnv("CEREBRAS_API_KEY", "chave-cerebras");

    await createGroqProvider().generate(PERGUNTA);
    await createCerebrasProvider().generate(PERGUNTA);

    const [groq, cerebras] = chamadas;
    expect(groq.config.baseURL).toBe("https://api.groq.com/openai/v1");
    expect(groq.config.apiKey).toBe("chave-groq");
    expect(cerebras.config.baseURL).toBe("https://api.cerebras.ai/v1");
    expect(cerebras.config.apiKey).toBe("chave-cerebras");

    // Mesmas mensagens, mesma temperatura: a implementação é uma só.
    expect(groq.body.messages).toEqual(cerebras.body.messages);
    expect(groq.body.temperature).toBe(0);
    expect(cerebras.body.temperature).toBe(0);
  });

  test("Chave e modelo vêm sempre do ambiente", async () => {
    vi.stubEnv("GROQ_MODEL", "modelo-do-ambiente");
    await createGroqProvider().generate(PERGUNTA);
    expect(chamadas[0].body.model).toBe("modelo-do-ambiente");
  });

  test("sem variável de modelo, cai no padrão do provedor", async () => {
    await createGroqProvider().generate(PERGUNTA);
    expect(chamadas[0].body.model).toBe("openai/gpt-oss-120b");
  });

  test("a repetição automática do SDK fica desligada: quem decide é a cadeia", async () => {
    await createGroqProvider().generate(PERGUNTA);
    expect(chamadas[0].config.maxRetries).toBe(0);
  });
});

describe("Credencial", () => {
  test("sem chave, o provedor se declara não configurado", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(createGroqProvider().isConfigured()).toBe(false);
    expect(createCerebrasProvider().isConfigured()).toBe(false);
  });

  test("com chave, está configurado", () => {
    expect(createGroqProvider().isConfigured()).toBe(true);
  });
});

describe("Saída estruturada", () => {
  test("O schema vai no formato estrito nos provedores compatíveis com a OpenAI", async () => {
    await createGroqProvider().generate(PERGUNTA, {
      responseSchema: {
        type: "object",
        properties: { resumo: { type: "string", nullable: true } },
      },
      schemaName: "curriculo",
    });

    expect(chamadas[0].body.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "curriculo",
        strict: false,
        schema: {
          type: "object",
          properties: { resumo: { type: ["string", "null"] } },
          required: ["resumo"],
          additionalProperties: false,
        },
      },
    });
  });

  test("sem schema, não vai response_format", async () => {
    await createGroqProvider().generate(PERGUNTA);
    expect(chamadas[0].body.response_format).toBeUndefined();
  });

  test("Provedor compatível com a OpenAI não recusa por chave ausente que a validação da camada aceita", async () => {
    // `strict: false` é o que impede o provedor de recusar a chamada inteira só porque o
    // modelo deixou de citar uma chave do schema — a decisão passa a ser de quem valida a
    // resposta do nosso lado, não do provedor.
    await createGroqProvider().generate(PERGUNTA, {
      responseSchema: {
        type: "object",
        properties: { education: { type: "array", items: { type: "string" } } },
      },
      schemaName: "ordem",
    });

    const jsonSchema = chamadas[0].body.response_format as {
      json_schema: { strict: boolean };
    };
    expect(jsonSchema.json_schema.strict).toBe(false);
  });
});

describe("Erros do provedor", () => {
  async function falhar(): Promise<ProviderError> {
    return createGroqProvider()
      .generate(PERGUNTA)
      .then(
        () => {
          throw new Error("a chamada deveria ter falhado");
        },
        (erro: ProviderError) => erro,
      );
  }

  test("429 vira falha de cota, que a cadeia trata como temporária", async () => {
    erroDoSdk = Object.assign(new Error("Rate limit reached"), { status: 429 });
    const erro = await falhar();
    expect(erro).toBeInstanceOf(ProviderError);
    expect(erro.kind).toBe("quota");
    expect(erro.provider).toBe("Groq");
  });

  test("5xx vira indisponibilidade", async () => {
    erroDoSdk = Object.assign(new Error("Service Unavailable"), { status: 503 });
    expect((await falhar()).kind).toBe("unavailable");
  });

  test("400 vira pedido inválido, que interrompe a cadeia", async () => {
    erroDoSdk = Object.assign(new Error("invalid schema"), { status: 400 });
    expect((await falhar()).kind).toBe("invalid-request");
  });

  test("resposta vazia conta como indisponibilidade", async () => {
    conteudoDaResposta = "";
    expect((await falhar()).kind).toBe("unavailable");
  });
});
