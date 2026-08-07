import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { nonIndexableResume } from "@/fixtures/resumes";
import { resumoSemPalavraChave } from "@/fixtures/suggestion-responses";
import { AiError } from "@/lib/ai/client";
import * as suggest from "@/lib/ai/suggest-ats";
import { recordedClient } from "@/lib/ai/testing";
import { serializeResume } from "@/lib/resume/serialize";
import { POST } from "./route";

function requisicao(corpo: unknown) {
  return new Request("http://localhost/api/suggestions/ats", {
    method: "POST",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });
}

const corpoValido = () => ({ resume: JSON.parse(serializeResume(nonIndexableResume)) });

describe("Fronteira HTTP das sugestões de ATS", () => {
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

  test("Sugestões de ATS são devolvidas para um currículo válido", async () => {
    const original = suggest.suggestAts;
    vi.spyOn(suggest, "suggestAts").mockImplementation((resume, options) =>
      original(resume, {
        ...options,
        client: recordedClient({ suggestions: [resumoSemPalavraChave] }),
      }),
    );

    const resposta = await POST(requisicao(corpoValido()));

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.suggestions).toHaveLength(1);
    expect(corpo.suggestions[0].path).toBe("summary");
    expect(corpo.suggestions[0].action).toBe("rewrite");
    expect(corpo.suggestions[0].unsupportedNumbers).toContain("8");
  });

  test("Currículo inválido é recusado na rota de ATS", async () => {
    const resposta = await POST(requisicao({ resume: { header: {} } }));

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error.code).toBe("invalid-resume");
  });

  test("Corpo que não é JSON é recusado na rota de ATS", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/suggestions/ats", {
        method: "POST",
        body: "isto não é json",
      }),
    );

    expect(resposta.status).toBe(400);
  });

  test("Credencial ausente e falha de chamada têm status distintos", async () => {
    vi.spyOn(suggest, "suggestAts").mockRejectedValue(
      new AiError("missing-credentials", "Nenhum provedor de IA está configurado."),
    );
    const semCredencial = await POST(requisicao(corpoValido()));
    expect(semCredencial.status).toBe(500);

    vi.spyOn(suggest, "suggestAts").mockRejectedValue(
      new AiError("call-failed", "A chamada ao modelo falhou: tempo esgotado."),
    );
    const falhaDeRede = await POST(requisicao(corpoValido()));
    expect(falhaDeRede.status).toBe(502);
    expect((await falhaDeRede.json()).error.code).toBe("call-failed");
  });

  test("Nenhum conteúdo de currículo em log na rota de ATS", async () => {
    await POST(requisicao({ resume: { header: {} } }));

    const registrado = JSON.stringify(avisos);
    for (const conteudo of ["Rui Barbosa", "Hospital Santa Clara", "proativo"]) {
      expect(registrado, conteudo).not.toContain(conteudo);
    }
  });
});
