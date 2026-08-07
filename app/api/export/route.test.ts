import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { AiError } from "@/lib/ai/client";
import * as exportar from "@/lib/export/export";
import { serializeResume } from "@/lib/resume/serialize";
import { POST } from "./route";

function requisicao(corpo: unknown) {
  return new Request("http://localhost/api/export", {
    method: "POST",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });
}

const corpoValido = (extra: Record<string, unknown> = {}) => ({
  resume: JSON.parse(serializeResume(importedResume)),
  locales: ["pt"],
  formats: ["docx"],
  ...extra,
});

describe("Fronteira HTTP da exportação", () => {
  const avisos: unknown[][] = [];

  beforeEach(() => {
    avisos.length = 0;
    vi.spyOn(console, "warn").mockImplementation((...args) => avisos.push(args));
    vi.spyOn(console, "error").mockImplementation((...args) => avisos.push(args));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("Arquivo é devolvido com nome e tipo corretos", async () => {
    vi.spyOn(exportar, "exportResume").mockResolvedValue({
      files: [],
      download: {
        name: "curriculo-marina-alencar-pt.docx",
        bytes: new Uint8Array([1, 2, 3]),
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      failures: [],
    });

    const resposta = await POST(requisicao(corpoValido()));

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-disposition")).toContain(
      "curriculo-marina-alencar-pt.docx",
    );
    expect(resposta.headers.get("content-type")).toContain("wordprocessingml");
  });

  test("Falha parcial vai no cabeçalho, com o arquivo no corpo", async () => {
    vi.spyOn(exportar, "exportResume").mockResolvedValue({
      files: [],
      download: {
        name: "curriculo-marina-alencar-pt.docx",
        bytes: new Uint8Array([1]),
        contentType: "application/octet-stream",
      },
      failures: [{ locale: "en", reason: "AiError" }],
    });

    const resposta = await POST(requisicao(corpoValido({ locales: ["pt", "en"] })));

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("x-export-failures")).toContain("en");
  });

  test("Nenhum arquivo gerado vira status próprio", async () => {
    vi.spyOn(exportar, "exportResume").mockResolvedValue({
      files: [],
      download: null,
      failures: [{ locale: "en", reason: "AiError" }],
    });

    const resposta = await POST(requisicao(corpoValido()));

    expect(resposta.status).toBe(422);
    expect((await resposta.json()).error.code).toBe("no-output");
  });

  test("Currículo inválido é recusado na exportação", async () => {
    const resposta = await POST(requisicao({ resume: { header: {} } }));

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error.code).toBe("invalid-resume");
  });

  test("Corpo que não é JSON é recusado na exportação", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/export", { method: "POST", body: "nada disso" }),
    );

    expect(resposta.status).toBe(400);
  });

  test("Falha de IA na exportação vira status distinguível", async () => {
    vi.spyOn(exportar, "exportResume").mockRejectedValue(
      new AiError("missing-credentials", "Nenhum provedor de IA está configurado."),
    );

    const resposta = await POST(requisicao(corpoValido()));

    expect(resposta.status).toBe(500);
    expect((await resposta.json()).error.code).toBe("missing-credentials");
  });

  test("Idioma ou formato desconhecido é ignorado", async () => {
    const espiao = vi.spyOn(exportar, "exportResume").mockResolvedValue({
      files: [],
      download: null,
      failures: [],
    });

    await POST(
      requisicao(corpoValido({ locales: ["pt", "klingon"], formats: ["docx", "odt"] })),
    );

    expect(espiao.mock.calls[0][0].locales).toEqual(["pt"]);
    expect(espiao.mock.calls[0][0].formats).toEqual(["docx"]);
  });

  test("Nenhum conteúdo de currículo em log na rota de exportação", async () => {
    await POST(requisicao({ resume: { header: {} } }));

    const registrado = JSON.stringify(avisos);
    for (const conteudo of ["Marina Alencar", "Fintech Kobo", "Liderei"]) {
      expect(registrado, conteudo).not.toContain(conteudo);
    }
  });
});
