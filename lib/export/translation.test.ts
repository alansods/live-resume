import { describe, expect, test, vi } from "vitest";
import { importedResume, minimalResume } from "@/fixtures/resumes";
import { traducaoParaIngles } from "@/fixtures/ai-responses";
import { AiError } from "@/lib/ai/client";
import { failingClient, recordedClient } from "@/lib/ai/testing";
import { translateResume } from "@/lib/ai/translate-resume";
import { serializeResume } from "@/lib/resume/serialize";
import { TranslationError } from "./translation";

/**
 * A tradução é o segundo e último ponto em que conteúdo de máquina entra no currículo
 * final sem passar pelo checklist — e o único em que o texto muda de fato. Por isso a
 * maior parte destes testes é sobre a verificação, não sobre a chamada.
 */

/** A resposta gravada, já no idioma de origem certo para disparar a tradução. */
const emIngles = (resume = importedResume) => ({
  ...traducaoParaIngles(resume),
  language: "pt" as const,
});

const traduzir = (resposta: unknown, resume = importedResume, alvo = "en" as const) =>
  translateResume(resume, alvo, { client: recordedClient(resposta) });

describe("Tradução do conteúdo para o idioma de saída", () => {
  test("Bullets saem no idioma marcado", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.jobs[0].bullets[0].value.text).toBe(
      "Led the payments platform migration.",
    );
    expect(traduzido.jobs[0].bullets[0].value.text).not.toBe(
      importedResume.jobs[0].bullets[0].value.text,
    );
  });

  test("Resumo, cargos, curso e habilidades também são traduzidos", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.header.role).toBe("Software Engineer");
    expect(traduzido.summary?.text).toContain("Backend engineer");
    expect(traduzido.jobs[1].role).toContain("(EN)");
    expect(traduzido.education[0].course).toContain("(EN)");
    expect(traduzido.skills?.text).toBeDefined();
  });

  test("Seção ausente não é criada na tradução", async () => {
    // `minimalResume` não tem resumo, formação nem habilidades.
    const traduzido = await traduzir(emIngles(minimalResume), minimalResume);

    expect(traduzido.summary).toBeNull();
    expect(traduzido.skills).toBeNull();
    expect(traduzido.education).toEqual([]);
  });
});

describe("Nomes próprios e datas não são traduzidos", () => {
  test("Nome da empresa atravessa intacto", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.jobs.map((job) => job.company)).toEqual(
      importedResume.jobs.map((job) => job.company),
    );
    expect(traduzido.jobs[0].company).toBe("Fintech Kobo");
  });

  test("Nome da pessoa e contato atravessam intactos", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.header.name).toBe(importedResume.header.name);
    expect(traduzido.header.contact).toBe(importedResume.header.contact);
  });

  test("Instituição de ensino atravessa intacta", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.education.map((item) => item.school)).toEqual(
      importedResume.education.map((item) => item.school),
    );
    // O curso mudou; a instituição não.
    expect(traduzido.education[0].course).not.toBe(importedResume.education[0].course);
  });

  test("Período não é alterado pela tradução", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.jobs.map((job) => job.period)).toEqual(
      importedResume.jobs.map((job) => job.period),
    );
    expect(traduzido.education.map((item) => item.period)).toEqual(
      importedResume.education.map((item) => item.period),
    );
  });
});

describe("Estrutura preservada na tradução", () => {
  test("Ids e contagens são os mesmos", async () => {
    const traduzido = await traduzir(emIngles());

    expect(traduzido.jobs.map((job) => job.id)).toEqual(
      importedResume.jobs.map((job) => job.id),
    );
    for (const [i, job] of traduzido.jobs.entries()) {
      expect(job.bullets.map((b) => b.id)).toEqual(
        importedResume.jobs[i].bullets.map((b) => b.id),
      );
    }
    expect(traduzido.education.map((item) => item.id)).toEqual(
      importedResume.education.map((item) => item.id),
    );
  });

  test("Resposta que perde um bullet é recusada", async () => {
    const resposta = emIngles();
    resposta.jobs[0].bullets = resposta.jobs[0].bullets.slice(1);

    await expect(traduzir(resposta)).rejects.toBeInstanceOf(TranslationError);
  });

  test("Resposta que inventa item é recusada", async () => {
    const resposta = emIngles();
    resposta.jobs.push({
      id: "job-que-nao-existe",
      role: "Ghost Role",
      bullets: [],
    });

    await expect(traduzir(resposta)).rejects.toBeInstanceOf(TranslationError);
  });
});

describe("Números preservados na tradução", () => {
  /** "Reduzi o custo de infraestrutura em R$ 1,2M/ano…" — o bullet com número. */
  const kobo = importedResume.jobs[1];
  const comNumero = kobo.bullets[1];

  const comNumeros = () => {
    const resposta = emIngles();
    const alvo = resposta.jobs
      .find((job) => job.id === (kobo.id as string))!
      .bullets.find((b) => b.id === (comNumero.id as string))!;
    return { resposta, alvo };
  };

  const traduzidoDoBullet = (resume: typeof importedResume) =>
    resume.jobs[1].bullets[1].value.text;

  test("Percentual sobrevive à tradução", async () => {
    const { resposta, alvo } = comNumeros();
    expect(comNumero.value.text).toContain("1,2M");

    // Tradução fiel: mesmo número, outras palavras.
    alvo.text = "Cut infrastructure cost by BRL 1,2M/year with rightsizing and caching.";

    const traduzido = await traduzir(resposta);
    expect(traduzidoDoBullet(traduzido)).toContain("1,2M");
    expect(traduzidoDoBullet(traduzido)).not.toBe(comNumero.value.text);
  });

  test("Número alterado é recusado", async () => {
    const { resposta, alvo } = comNumeros();

    // 1,2M vira 1,5M: é isso que a verificação existe para pegar.
    alvo.text = "Cut infrastructure cost by BRL 1,5M/year.";

    await expect(traduzir(resposta)).rejects.toThrow(TranslationError);
  });

  test("Número inventado é recusado", async () => {
    const { resposta, alvo } = comNumeros();
    alvo.text = `${alvo.text} Across 14 cycles.`;

    await expect(traduzir(resposta)).rejects.toThrow(TranslationError);
  });

  test("Trecho sem número não é afetado pela verificação", async () => {
    // O primeiro bullet da Kobo não tem número, e a fixture o traduz por inteiro.
    const traduzido = await traduzir(emIngles());

    expect(importedResume.jobs[0].bullets[0].value.text).not.toMatch(/\d/);
    expect(traduzido.jobs[0].bullets[0].value.text).toBe(
      "Led the payments platform migration.",
    );
  });
});

describe("Currículo já no idioma de saída não é traduzido", () => {
  test("Idioma coincidente devolve o original", async () => {
    const resposta = { ...emIngles(), language: "pt" as const };

    const resultado = await translateResume(importedResume, "pt", {
      client: recordedClient(resposta),
    });

    expect(serializeResume(resultado)).toBe(serializeResume(importedResume));
  });

  test("Resposta é descartada quando o idioma coincide", async () => {
    const resposta = {
      ...emIngles(),
      language: "pt" as const,
      headerRole: "Cargo reescrito pela IA",
      summary: "Resumo reescrito que ninguém pediu.",
    };

    const resultado = await translateResume(importedResume, "pt", {
      client: recordedClient(resposta),
    });

    expect(resultado.header.role).toBe(importedResume.header.role);
    expect(serializeResume(resultado)).not.toContain("reescrito");
  });
});

describe("Falha de tradução é erro", () => {
  test("Falha de comunicação na tradução é distinguível", async () => {
    const falha = translateResume(importedResume, "en", {
      client: failingClient("call-failed"),
    });

    await expect(falha).rejects.toBeInstanceOf(AiError);
    await expect(falha).rejects.toMatchObject({ reason: "call-failed" });
  });

  test("Tradução não degrada para o original", async () => {
    const resposta = emIngles();
    resposta.jobs = resposta.jobs.slice(1);

    // Nem currículo de origem, nem currículo pela metade: erro.
    await expect(traduzir(resposta)).rejects.toThrow(TranslationError);
  });
});

describe("Origem do texto traduzido", () => {
  test("Trecho traduzido registra origem de máquina", async () => {
    const traduzido = await traduzir(emIngles());

    expect(importedResume.jobs[0].bullets[0].value.origin.kind).toBe("imported");
    expect(traduzido.jobs[0].bullets[0].value.origin).toEqual({
      kind: "proposed",
      confirmed: true,
    });
    expect(traduzido.summary?.origin).toEqual({ kind: "proposed", confirmed: true });
  });

  test("Trecho não traduzido conserva a origem", async () => {
    const traduzido = await traduzir(emIngles());

    // Período não é traduzido: origem intacta.
    expect(traduzido.jobs[0].period.origin).toEqual(importedResume.jobs[0].period.origin);
    expect(traduzido.jobs[0].company).toBe(importedResume.jobs[0].company);
  });
});

describe("Testes de tradução sem a IA real", () => {
  test("Nenhuma chamada real de tradução na suíte", async () => {
    vi.stubEnv("AI_PROVIDERS", "none");

    await expect(translateResume(importedResume, "en")).rejects.toMatchObject({
      reason: "missing-credentials",
    });

    vi.unstubAllEnvs();
  });
});
