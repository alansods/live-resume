import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { metricaAusente } from "@/fixtures/suggestion-responses";
import * as suggest from "@/lib/ai/suggest-metrics";
import { AiError } from "@/lib/ai/client";
import { recordedClient } from "@/lib/ai/testing";
import { jobBulletPath } from "@/lib/resume/paths";
import { serializeResume } from "@/lib/resume/serialize";
import { POST } from "./route";

const kobo = importedResume.jobs[0];
const bullet = jobBulletPath(kobo.id, kobo.bullets[0].id);

function requisicao(corpo: unknown) {
  return new Request("http://localhost/api/suggestions/metrics", {
    method: "POST",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });
}

describe("Fronteira HTTP das sugestões", () => {
  const avisos: unknown[][] = [];

  beforeEach(() => {
    avisos.length = 0;
    vi.spyOn(console, "warn").mockImplementation((...args) => {
      avisos.push(args);
    });
    vi.spyOn(console, "error").mockImplementation((...args) => {
      avisos.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("Sugestões são devolvidas para um currículo válido", async () => {
    const original = suggest.suggestMetrics;
    vi.spyOn(suggest, "suggestMetrics").mockImplementation((resume, options) =>
      original(resume, {
        ...options,
        client: recordedClient({
          suggestions: [{ ...metricaAusente, path: bullet }],
        }),
      }),
    );

    const resposta = await POST(
      requisicao({ resume: JSON.parse(serializeResume(importedResume)) }),
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.suggestions).toHaveLength(1);
    expect(corpo.suggestions[0].path).toBe(bullet);
    expect(corpo.suggestions[0].unsupportedNumbers).toContain("77");
  });

  test("Currículo inválido é recusado", async () => {
    const resposta = await POST(requisicao({ resume: { header: {} } }));

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error.code).toBe("invalid-resume");
  });

  test("Corpo que não é JSON é recusado", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/suggestions/metrics", {
        method: "POST",
        body: "isto não é json",
      }),
    );

    expect(resposta.status).toBe(400);
  });

  test("Falha de IA vira status distinguível", async () => {
    vi.spyOn(suggest, "suggestMetrics").mockRejectedValue(
      new AiError("call-failed", "A chamada ao modelo falhou: tempo esgotado."),
    );

    const resposta = await POST(
      requisicao({ resume: JSON.parse(serializeResume(importedResume)) }),
    );

    expect(resposta.status).toBe(502);
    expect((await resposta.json()).error.code).toBe("call-failed");
  });

  test("Nenhum conteúdo de currículo em log", async () => {
    await POST(requisicao({ resume: { header: {} } }));

    const registrado = JSON.stringify(avisos);
    for (const conteudo of ["Marina Alencar", "Fintech Kobo", "Liderei"]) {
      expect(registrado, conteudo).not.toContain(conteudo);
    }
  });
});
