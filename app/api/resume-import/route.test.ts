import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  respostaDeDocumentoQueNaoECurriculo,
  respostaDoCurriculoCompleto,
} from "@/fixtures/ai-responses";
import { failingClient, recordedClient } from "@/lib/ai/testing";
import * as parsing from "@/lib/parsing";
import { resetConsumedNonces, signToken } from "@/lib/payments";
import { POST } from "./route";

const fixture = (nome: string) =>
  readFileSync(join(process.cwd(), "fixtures", "files", nome));

let proximoNonce = 0;

/** Um token válido e ainda não usado, próprio de cada chamada de teste. */
function tokenValido() {
  proximoNonce += 1;
  return signToken(`nonce-teste-${proximoNonce}`);
}

function requisicaoCom(
  nome: string,
  {
    tipo = "application/octet-stream",
    token = tokenValido(),
  }: { tipo?: string; token?: string | null } = {},
) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(fixture(nome))], nome, { type: tipo }));
  const headers = new Headers();
  if (token !== null) headers.set("x-paid-session", token);
  return new Request("http://localhost/api/resume-import", {
    method: "POST",
    headers,
    body: form,
  });
}

/** O handler chama a IA de verdade; nos testes, a fronteira é substituída. */
function comIaGravada() {
  const original = parsing.importResume;
  return vi.spyOn(parsing, "importResume").mockImplementation((bytes, options) =>
    original(bytes, {
      ...options,
      client: recordedClient(respostaDoCurriculoCompleto),
    }),
  );
}

describe("Fronteira HTTP da importação", () => {
  const avisos: unknown[][] = [];
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  const segredoOriginal = process.env.PAYMENT_TOKEN_SECRET;

  beforeEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = "segredo-de-teste";
    avisos.length = 0;
    warn = vi.spyOn(console, "warn").mockImplementation((...args) => {
      avisos.push(args);
    });
    error = vi.spyOn(console, "error").mockImplementation((...args) => {
      avisos.push(args);
    });
  });

  afterEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = segredoOriginal;
    warn.mockRestore();
    error.mockRestore();
    vi.restoreAllMocks();
    resetConsumedNonces();
  });

  test("Nada é gravado em disco", async () => {
    const spy = comIaGravada();
    const antes = inventario();

    const resposta = await POST(requisicaoCom("curriculo-completo.docx"));

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.resume.jobs).toHaveLength(4);
    expect(corpo.report.counts.bullets).toBe(7);

    expect(inventario()).toEqual(antes);
    spy.mockRestore();
  });

  test("Conteúdo não vai para log", async () => {
    const resposta = await POST(requisicaoCom("curriculo-digitalizado.pdf"));

    expect(resposta.status).toBe(422);
    expect(avisos.length).toBeGreaterThan(0);

    const registrado = JSON.stringify(avisos);
    for (const conteudo of [
      "Marina Alencar",
      "marina.alencar@email.com",
      "Fintech Kobo",
      "Liderei",
    ]) {
      expect(registrado, conteudo).not.toContain(conteudo);
    }
  });

  test("Erros viram status distinguíveis", async () => {
    const casos = [
      { arquivo: "curriculo.odt", status: 415, code: "unsupported-format" },
      { arquivo: "corrompido.pdf", status: 422, code: "corrupted-file" },
      {
        arquivo: "curriculo-digitalizado.pdf",
        status: 422,
        code: "pdf-without-text-layer",
      },
    ];

    for (const caso of casos) {
      const resposta = await POST(requisicaoCom(caso.arquivo));
      expect(resposta.status, caso.arquivo).toBe(caso.status);
      const corpo = await resposta.json();
      expect(corpo.error.code, caso.arquivo).toBe(caso.code);
      expect(corpo.error.message.length, caso.arquivo).toBeGreaterThan(0);
    }
  });

  test("A rota recusa documento que não é currículo", async () => {
    const original = parsing.importResume;
    vi.spyOn(parsing, "importResume").mockImplementation((bytes, options) =>
      original(bytes, {
        ...options,
        client: recordedClient(respostaDeDocumentoQueNaoECurriculo),
      }),
    );

    const resposta = await POST(requisicaoCom("curriculo-completo.docx"));

    // 422 como os outros "o arquivo não serve" — e não o 500 genérico que este caminho
    // produzia antes, que culpava o servidor por um problema do arquivo.
    expect(resposta.status).toBe(422);
    const corpo = await resposta.json();
    expect(corpo.error.code).toBe("not-a-resume");
    expect(corpo.error.message).toMatch(/não parece ser um currículo/i);
  });

  test("A rota responde limite excedido", async () => {
    // A cota estoura dentro da estruturação, no caminho real da importação.
    const original = parsing.importResume;
    vi.spyOn(parsing, "importResume").mockImplementation((bytes, options) =>
      original(bytes, { ...options, client: failingClient("quota-exceeded") }),
    );

    const resposta = await POST(requisicaoCom("curriculo-completo.docx"));

    // 429 e não 502: o modelo está de pé, o limite é que acabou.
    expect(resposta.status).toBe(429);
    const corpo = await resposta.json();
    expect(corpo.error.code).toBe("quota-exceeded");
    expect(corpo.error.message).toMatch(/limite de uso gratuito/i);
    expect(corpo.error.message).not.toContain("{");
  });

  test("Requisição sem arquivo é recusada", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/resume-import", {
        method: "POST",
        headers: { "x-paid-session": tokenValido() },
        body: new FormData(),
      }),
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error.code).toBe("missing-file");
  });

  test("Requisição sem token é recusada antes de tocar no arquivo", async () => {
    const spy = comIaGravada();

    const resposta = await POST(
      requisicaoCom("curriculo-completo.docx", { token: null }),
    );

    expect(resposta.status).toBe(402);
    expect((await resposta.json()).error.code).toBe("payment-required");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("Token inválido ou expirado é recusado", async () => {
    const invalido = await POST(
      requisicaoCom("curriculo-completo.docx", { token: "token-que-nao-verifica" }),
    );
    expect(invalido.status).toBe(402);

    const expirado = signToken("nonce-expirado", Date.now() - 31 * 60 * 1000);
    const resposta = await POST(
      requisicaoCom("curriculo-completo.docx", { token: expirado }),
    );
    expect(resposta.status).toBe(402);
  });

  test("Token válido libera a importação normal", async () => {
    const spy = comIaGravada();

    const resposta = await POST(requisicaoCom("curriculo-completo.docx"));

    expect(resposta.status).toBe(200);
    spy.mockRestore();
  });

  test("Token consumido não autoriza nova importação", async () => {
    const spy = comIaGravada();
    const token = tokenValido();

    const primeira = await POST(requisicaoCom("curriculo-completo.docx", { token }));
    expect(primeira.status).toBe(200);

    const segunda = await POST(requisicaoCom("curriculo-completo.docx", { token }));
    expect(segunda.status).toBe(402);

    spy.mockRestore();
  });

  test("Falha do arquivo depois do token validado não consome o token", async () => {
    const token = tokenValido();

    const primeira = await POST(requisicaoCom("curriculo.odt", { token }));
    expect(primeira.status).toBe(415);

    const spy = comIaGravada();
    const segunda = await POST(requisicaoCom("curriculo-completo.docx", { token }));
    expect(segunda.status).toBe(200);
    spy.mockRestore();
  });

  test("Importação que falha não consome o token", async () => {
    const token = tokenValido();

    const original = parsing.importResume;
    const spyFalha = vi
      .spyOn(parsing, "importResume")
      .mockImplementation((bytes, options) =>
        original(bytes, { ...options, client: failingClient("quota-exceeded") }),
      );
    const falhou = await POST(requisicaoCom("curriculo-completo.docx", { token }));
    expect(falhou.status).toBe(429);
    spyFalha.mockRestore();

    const spy = comIaGravada();
    const depois = await POST(requisicaoCom("curriculo-completo.docx", { token }));
    expect(depois.status).toBe(200);
    spy.mockRestore();
  });
});

/** Fotografia do que existe em disco nos diretórios que uma falha poderia sujar. */
function inventario(): string[] {
  const alvos = [process.cwd(), join(process.cwd(), "fixtures", "files"), "/tmp"];
  const encontrado: string[] = [];

  for (const alvo of alvos) {
    try {
      for (const nome of readdirSync(alvo)) {
        const caminho = join(alvo, nome);
        try {
          const info = statSync(caminho);
          encontrado.push(`${caminho}:${info.isDirectory() ? "dir" : info.size}`);
        } catch {
          // Some entre a listagem e o stat: irrelevante para o que medimos.
        }
      }
    } catch {
      // Diretório inacessível: não é onde o handler escreveria.
    }
  }

  return encontrado.sort();
}
