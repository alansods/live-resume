import { describe, expect, test } from "vitest";
import { importedResume, minimalResume } from "@/fixtures/resumes";
import { ResumeSchema } from "./schema";

/** Cenários de "Estrutura canônica do currículo" e "Identidade estável de item". */

describe("Estrutura canônica do currículo", () => {
  test("Currículo completo é aceito", () => {
    const result = ResumeSchema.safeParse(importedResume);
    expect(result.success).toBe(true);
  });

  test("Seções opcionais ausentes", () => {
    const result = ResumeSchema.safeParse(minimalResume);
    expect(result.success).toBe(true);
    expect(result.data?.summary).toBeNull();
    expect(result.data?.skills).toBeNull();
    expect(result.data?.education).toEqual([]);
  });

  test("Campo obrigatório ausente é rejeitado", () => {
    const semEmpresa = structuredClone(importedResume) as Record<string, unknown>;
    const jobs = semEmpresa.jobs as Array<Record<string, unknown>>;
    delete jobs[0].company;

    const result = ResumeSchema.safeParse(semEmpresa);

    expect(result.success).toBe(false);
    // O erro nomeia o caminho do campo faltante.
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      "jobs.0.company",
    );
  });

  test("Modelo não admite conteúdo multilíngue", () => {
    const bilingue = structuredClone(importedResume) as Record<string, unknown>;
    bilingue.summary = {
      pt: "Engenheira back-end.",
      en: "Backend engineer.",
      origin: { kind: "imported" },
    };

    const result = ResumeSchema.safeParse(bilingue);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("summary"))).toBe(
      true,
    );
  });

  test("Ordem das listas é preservada na validação", () => {
    const result = ResumeSchema.parse(importedResume);
    expect(result.jobs.map((job) => job.id)).toEqual([
      "job-kobo-lead",
      "job-kobo-senior",
      "job-orion",
      "job-vetor",
    ]);
    expect(result.jobs[0].bullets.map((bullet) => bullet.id)).toEqual([
      "bullet-kobo-lead-1",
      "bullet-kobo-lead-2",
    ]);
  });
});

describe("Identidade estável de item", () => {
  test("Ids duplicados são rejeitados", () => {
    const duplicado = structuredClone(importedResume);
    duplicado.jobs[1].id = duplicado.jobs[0].id;

    const result = ResumeSchema.safeParse(duplicado);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some((issue) => issue.message.includes("job-kobo-lead")),
    ).toBe(true);
  });

  test("Id repetido entre experiência e bullet também é rejeitado", () => {
    const duplicado = structuredClone(importedResume);
    duplicado.jobs[0].bullets[0].id = duplicado.jobs[0].id;

    const result = ResumeSchema.safeParse(duplicado);

    expect(result.success).toBe(false);
  });
});

describe("Período no schema", () => {
  test("Período incompleto é válido no currículo", () => {
    const result = ResumeSchema.safeParse(importedResume);
    expect(result.success).toBe(true);
    const vetor = result.data?.jobs.find((job) => job.id === "job-vetor");
    expect(vetor?.period.complete).toBe(false);
    expect(vetor?.period.raw).toBe("2018 - 2019");
  });

  test("complete precisa refletir início e fim conhecidos", () => {
    const inconsistente = structuredClone(importedResume);
    inconsistente.jobs[3].period.complete = true;

    const result = ResumeSchema.safeParse(inconsistente);

    expect(result.success).toBe(false);
  });
});
