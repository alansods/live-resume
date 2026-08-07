import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import {
  isUnconfirmedProposal,
  OriginSchema,
  proposed,
  TextValueSchema,
  type Origin,
} from "./origin";

describe("Registro de origem do conteúdo", () => {
  test("Origem preservada na importação", () => {
    const origens: Origin[] = [];
    if (importedResume.summary) origens.push(importedResume.summary.origin);
    if (importedResume.skills) origens.push(importedResume.skills.origin);
    for (const job of importedResume.jobs) {
      origens.push(job.period.origin);
      for (const bullet of job.bullets) origens.push(bullet.value.origin);
    }
    for (const education of importedResume.education) {
      origens.push(education.period.origin);
    }

    expect(origens.length).toBeGreaterThan(0);
    expect(origens.every((origin) => origin.kind === "imported")).toBe(true);
  });

  test("Proposta sem confirmação não é um valor válido", () => {
    // Em tempo de compilação o campo é obrigatório.
    // @ts-expect-error `confirmed` é obrigatório em toda proposta.
    const semConfirmacao: Origin = { kind: "proposed" };
    // Em tempo de execução a validação recusa o mesmo objeto.
    expect(OriginSchema.safeParse(semConfirmacao).success).toBe(false);
  });

  test("Trecho não guarda valor anterior nem marca de alteração", () => {
    const trecho = TextValueSchema.parse({
      text: "Reduzi a latência p95 em 77%.",
      origin: proposed(true),
    });

    expect(Object.keys(trecho).sort()).toEqual(["origin", "text"]);
    // O objeto é estrito: campos de "antes e depois" não passam.
    expect(
      TextValueSchema.safeParse({
        text: "novo",
        previousText: "antigo",
        origin: proposed(true),
      }).success,
    ).toBe(false);
    expect(
      TextValueSchema.safeParse({ text: "novo", updated: true, origin: proposed(true) })
        .success,
    ).toBe(false);
  });

  test("Proposta confirmada e não confirmada são distinguíveis", () => {
    expect(isUnconfirmedProposal(proposed(false))).toBe(true);
    expect(isUnconfirmedProposal(proposed(true))).toBe(false);
    expect(isUnconfirmedProposal({ kind: "imported" })).toBe(false);
  });
});
