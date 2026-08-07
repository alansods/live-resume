import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { respostaDoCurriculoCompleto } from "@/fixtures/ai-responses";
import { recordedClient } from "@/lib/ai/testing";
import { resolvePath } from "@/lib/resume/paths";
import { importResume } from "./index";

const fixture = (nome: string) =>
  new Uint8Array(readFileSync(join(process.cwd(), "fixtures", "files", nome)));

const importar = () =>
  importResume(fixture("curriculo-completo.docx"), {
    fileName: "curriculo-completo.docx",
    client: recordedClient(respostaDoCurriculoCompleto),
  });

describe("Relatório de importação", () => {
  test("Contagens do que foi reconhecido", async () => {
    const { report } = await importar();

    expect(report.counts).toEqual({ jobs: 4, education: 2, bullets: 7 });
  });

  test("Bullets sem número", async () => {
    const { resume, report } = await importar();

    // Seis dos sete bullets do currículo de exemplo não têm nenhum dígito — inclusive
    // "três parceiros", que está por extenso.
    expect(report.bulletsWithoutNumber).toHaveLength(6);
    for (const path of report.bulletsWithoutNumber) {
      const trecho = resolvePath(resume, path);
      expect(trecho.kind).toBe("text");
      expect((trecho.value as { text: string }).text, path).not.toMatch(/\d/);
    }

    // E os que têm número ficaram de fora.
    const comNumero = resume.jobs
      .flatMap((job) => job.bullets)
      .filter((bullet) => /\d/.test(bullet.value.text));
    expect(comNumero).toHaveLength(1);
  });

  test("Períodos incompletos e sobrepostos", async () => {
    const { resume, report } = await importar();

    // "2018 - 2019" é o único sem mês.
    expect(report.incompletePeriods).toHaveLength(1);
    const incompleto = resolvePath(resume, report.incompletePeriods[0]);
    expect(incompleto.value).toMatchObject({ complete: false, raw: "2018 - 2019" });

    // Banco Órion (01/2020–12/2022) sobrepõe Fintech Kobo Sênior (03/2022–12/2024).
    expect(report.overlappingPeriods).toHaveLength(1);
    const { a, b } = report.overlappingPeriods[0];
    const empresas = [a, b].map((path) => {
      const id = String(path).split(".")[1];
      return resume.jobs.find((job) => job.id === id)?.company;
    });
    expect(empresas).toContain("Banco Órion");
    expect(empresas).toContain("Fintech Kobo");
  });

  test("Texto extraído não aproveitado", async () => {
    const { report } = await importar();

    // Os títulos de seção não existem no modelo canônico: são estrutura, não
    // conteúdo, e aparecem aqui em vez de sumirem sem aviso.
    expect(report.unusedText).toContain("Experiência profissional");
    expect(report.unusedText).toContain("Formação");

    // Nada de conteúdo real foi perdido.
    for (const perdido of report.unusedText) {
      expect(perdido, perdido).not.toContain("Fintech Kobo");
      expect(perdido, perdido).not.toContain("Liderei");
    }
  });

  test("Relatório não altera o currículo", async () => {
    const { resume } = await importar();

    // Bullets sem número continuam sem número; período incompleto continua
    // incompleto. O relatório descreve, não corrige.
    expect(resume.jobs[0].bullets[0].value.text).toBe(
      "Liderei a migração da plataforma de pagamentos.",
    );
    expect(resume.jobs[3].period.complete).toBe(false);

    // E todo trecho continua com origem "importado".
    const origens = [
      resume.summary?.origin,
      resume.skills?.origin,
      ...resume.jobs.map((job) => job.period.origin),
      ...resume.jobs.flatMap((job) => job.bullets.map((bullet) => bullet.value.origin)),
      ...resume.education.map((item) => item.period.origin),
    ];
    for (const origem of origens) {
      expect(origem).toEqual({ kind: "imported" });
    }
  });

  test("Período completo é normalizado", async () => {
    const { resume } = await importar();

    expect(resume.jobs[1].period).toMatchObject({
      complete: true,
      start: { month: 3, year: 2022 },
      end: { month: 12, year: 2024 },
    });
    expect(resume.jobs[0].period.end).toEqual({ open: true });
  });

  test("Período sem mês fica incompleto", async () => {
    const { resume } = await importar();

    expect(resume.jobs[3].period).toMatchObject({
      complete: false,
      raw: "2018 - 2019",
      start: { month: null, year: 2018 },
    });
  });
});
