import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { importedResume, minimalResume } from "@/fixtures/resumes";
import { ordemDaIa } from "@/fixtures/ai-responses";
import { chronologicalOrder } from "@/lib/resume/chronological";
import { generateFinal } from "@/lib/resume/generate";
import { serializeResume } from "@/lib/resume/serialize";
import { organizeContent } from "./organize-content";
import { failingClient, neverCalledClient, recordedClient } from "./testing";

/**
 * A organização é o único ponto em que uma decisão da IA entra no currículo final sem
 * passar pelo checklist — e cabe porque ela só move o que o usuário escreveu.
 */

const jobIds = importedResume.jobs.map((job) => job.id as string);
const eduIds = importedResume.education.map((item) => item.id as string);

/** Inverte a ordem do arquivo, para que "veio da IA" seja distinguível de "veio como estava". */
const invertida = {
  jobs: [...jobIds].reverse(),
  bullets: [],
  education: [...eduIds].reverse(),
};

const organizarCom = (resposta: unknown, resume = importedResume) =>
  organizeContent(resume, { client: recordedClient(resposta) });

describe("Ordem do conteúdo produzida pela IA", () => {
  test("Ordem das experiências vem da IA", async () => {
    const order = await organizarCom(invertida);

    expect(order.jobs).toEqual([...jobIds].reverse());
    expect(order.jobs).not.toEqual(jobIds);
  });

  test("Bullets são ordenados dentro da própria experiência", async () => {
    const kobo = importedResume.jobs[0];
    const bulletIds = kobo.bullets.map((bullet) => bullet.id as string);

    const order = await organizarCom({
      ...invertida,
      bullets: [{ jobId: kobo.id as string, bulletIds: [...bulletIds].reverse() }],
    });

    expect(order.bullets?.[kobo.id as string]).toEqual([...bulletIds].reverse());
    // Nenhuma outra experiência recebeu ordem de bullets.
    expect(Object.keys(order.bullets ?? {})).toEqual([kobo.id as string]);
  });

  test("Formações também são ordenadas", async () => {
    const order = await organizarCom(invertida);

    expect(order.education).toEqual([...eduIds].reverse());
  });

  test("Currículo sem experiência e sem formação não chama a IA", async () => {
    const vazio = { ...minimalResume, jobs: [], education: [] };

    const order = await organizeContent(vazio, { client: neverCalledClient() });

    expect(order.jobs).toEqual([]);
    expect(order.education).toEqual([]);
  });
});

describe("Permutação validada contra o currículo", () => {
  const cronologica = chronologicalOrder(importedResume);

  test("Ordem com id desconhecido é recusada", async () => {
    const order = await organizarCom({
      ...invertida,
      jobs: [...jobIds.slice(1), "job-que-nao-existe"],
    });

    expect(order.jobs).toEqual(cronologica.jobs);
  });

  test("Ordem que repete id é recusada", async () => {
    const order = await organizarCom({
      ...invertida,
      jobs: [jobIds[0], jobIds[0], jobIds[2], jobIds[3]],
    });

    expect(order.jobs).toEqual(cronologica.jobs);
  });

  test("Ordem incompleta é recusada", async () => {
    const order = await organizarCom({ ...invertida, jobs: jobIds.slice(1) });

    expect(order.jobs).toEqual(cronologica.jobs);
  });

  test("Ordem válida é aceita inteira", async () => {
    const order = await organizarCom(ordemDaIa(importedResume));

    expect(() => generateFinal(importedResume, [], order)).not.toThrow();
    expect(order.jobs).toHaveLength(importedResume.jobs.length);
    expect(order.education).toHaveLength(importedResume.education.length);
  });
});

describe("Organizar não altera conteúdo", () => {
  test("Nenhum item some ou aparece na organização", async () => {
    const order = await organizarCom(invertida);
    const final = generateFinal(importedResume, [], order);

    expect(new Set(final.jobs.map((job) => job.id))).toEqual(new Set(jobIds));
    expect(final.jobs).toHaveLength(importedResume.jobs.length);
    expect(final.education).toHaveLength(importedResume.education.length);
  });

  test("Texto e origem sobrevivem à ordenação", async () => {
    const order = await organizarCom(invertida);
    const final = generateFinal(importedResume, [], order);

    for (const original of importedResume.jobs) {
      const depois = final.jobs.find((job) => job.id === original.id);
      expect(depois?.bullets.map((b) => b.value.text)).toEqual(
        original.bullets.map((b) => b.value.text),
      );
      expect(depois?.bullets.map((b) => b.value.origin)).toEqual(
        original.bullets.map((b) => b.value.origin),
      );
    }
  });

  test("A IA não reescreve ao organizar", async () => {
    // Resposta que tenta contrabandear texto junto dos ids: o schema a recusa, e a
    // organização cai no recurso em vez de deixar o texto entrar.
    const order = await organizarCom({
      ...invertida,
      summary: "Resumo reescrito pela IA sem o usuário marcar nada.",
    });

    const final = generateFinal(importedResume, [], order);
    expect(final.summary?.text).toBe(importedResume.summary?.text);
    expect(serializeResume(final)).not.toContain("reescrito pela IA");
  });

  test("Organizar não muda o currículo de origem", async () => {
    const antes = serializeResume(importedResume);

    await organizarCom(invertida);

    expect(serializeResume(importedResume)).toBe(antes);
  });
});

describe("Ordem cronológica de recurso na organização", () => {
  const avisos: unknown[][] = [];

  beforeEach(() => {
    avisos.length = 0;
    vi.spyOn(console, "warn").mockImplementation((...args) => {
      avisos.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("Falha de comunicação não interrompe a geração", async () => {
    const order = await organizeContent(importedResume, {
      client: failingClient("call-failed"),
    });

    expect(order.jobs).toEqual(chronologicalOrder(importedResume).jobs);
    expect(() => generateFinal(importedResume, [], order)).not.toThrow();
    // A falha é registrada, e nada do currículo vai para o log.
    const registrado = JSON.stringify(avisos);
    expect(registrado).toContain("call-failed");
    for (const conteudo of ["Marina Alencar", "Fintech Kobo", "Liderei"]) {
      expect(registrado, conteudo).not.toContain(conteudo);
    }
  });

  test("Credencial ausente também cai no recurso", async () => {
    const order = await organizeContent(importedResume, {
      client: failingClient("missing-credentials"),
    });

    expect(order.jobs).toEqual(chronologicalOrder(importedResume).jobs);
  });
});

describe("Currículo em revisão não é reordenado", () => {
  test("A revisão continua na ordem do arquivo", async () => {
    // Prova por dependência: a organização vive só na geração, e nenhum módulo do
    // caminho da revisão a alcança. Um import novo aqui quebra este teste.
    const caminhoDaRevisao = [
      "lib/ai/suggest-metrics.ts",
      "lib/ai/suggest-ats.ts",
      "lib/suggestions/dates.ts",
      "lib/suggestions/validate.ts",
      "lib/suggestions/ats.ts",
    ];

    for (const arquivo of caminhoDaRevisao) {
      const fonte = readFileSync(join(process.cwd(), arquivo), "utf8");
      expect(fonte, arquivo).not.toContain("organize-content");
      expect(fonte, arquivo).not.toContain("chronological");
    }

    // E o currículo em revisão é o importado, sem reordenação aplicada.
    const emRevisao = generateFinal(importedResume, []);
    expect(emRevisao.jobs.map((job) => job.id as string)).toEqual(jobIds);
  });
});

describe("Testes de organização sem a IA real", () => {
  test("Nenhuma chamada real de organização na suíte", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    // Sem credencial e sem cliente injetado, o recurso responde — nenhuma ida à API.
    const order = await organizeContent(importedResume);

    expect(order.jobs).toEqual(chronologicalOrder(importedResume).jobs);
    vi.unstubAllEnvs();
  });
});
