import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { chronologicalOrder } from "./chronological";
import { generateFinal } from "./generate";
import { asItemId } from "./ids";
import { imported } from "./origin";
import { parsePeriod } from "./period";
import type { Job, Resume } from "./schema";

/**
 * A ordem de recurso: o que sai quando a IA não pôde decidir. Sem IA aqui — é
 * aritmética de calendário sobre a convenção de currículo.
 */

function job(id: string, raw: string, bullets: string[] = []): Job {
  return {
    id: asItemId(id),
    company: `Empresa ${id}`,
    role: "Cargo",
    period: parsePeriod(raw, imported),
    bullets: bullets.map((text, i) => ({
      id: asItemId(`${id}-b${i}`),
      value: { text, origin: imported },
    })),
  };
}

function resumeCom(jobs: Job[]): Resume {
  return {
    header: { name: "Teste", role: "", contact: [] },
    summary: null,
    jobs,
    education: [],
    skills: null,
  };
}

describe("Ordem cronológica de recurso", () => {
  test("Experiências saem da mais recente para a mais antiga", () => {
    const resume = resumeCom([
      job("antiga", "01/2020 – 12/2021"),
      job("meio", "03/2022 – 12/2024"),
      job("recente", "01/2025 – 06/2025"),
    ]);

    expect(chronologicalOrder(resume).jobs).toEqual(["recente", "meio", "antiga"]);
  });

  test("Experiência em curso vem primeiro", () => {
    const resume = resumeCom([
      // Começou depois, mas já terminou.
      job("estagio", "02/2026 – 06/2026"),
      job("atual", "01/2025 – atual"),
    ]);

    expect(chronologicalOrder(resume).jobs).toEqual(["atual", "estagio"]);
  });

  test("Período incompleto é ordenado pelo ano", () => {
    const resume = resumeCom([
      job("com-mes", "03/2019 – 12/2019"),
      job("so-ano", "2021 – 2022"),
    ]);

    const soAno = resume.jobs[1].period;
    expect(soAno.complete).toBe(false);
    expect(chronologicalOrder(resume).jobs).toEqual(["so-ano", "com-mes"]);
    // Nenhum mês foi assumido para ordenar.
    expect(soAno.start).toEqual({ month: null, year: 2021 });
  });

  test("Bullets conservam a ordem no recurso", () => {
    const resume = resumeCom([job("unica", "01/2025 – atual", ["primeiro", "segundo"])]);

    const order = chronologicalOrder(resume);
    expect(order.bullets).toBeUndefined();

    const final = generateFinal(resume, [], order);
    expect(final.jobs[0].bullets.map((b) => b.value.text)).toEqual([
      "primeiro",
      "segundo",
    ]);
  });

  test("A ordem de recurso é permutação aceita pela geração", () => {
    // O currículo completo da fixture, para garantir que formação também entra.
    const order = chronologicalOrder(importedResume);

    expect(() => generateFinal(importedResume, [], order)).not.toThrow();
    expect(order.education).toHaveLength(importedResume.education.length);
  });
});
