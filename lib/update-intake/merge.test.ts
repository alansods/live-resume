import { describe, expect, test } from "vitest";
import { importedResume, minimalResume } from "@/fixtures/resumes";
import { asItemId } from "@/lib/resume/ids";
import { isOpenEnd, isYearMonth } from "@/lib/resume/period";
import { ResumeSchema } from "@/lib/resume/schema";
import { emptyIntake, type IntakeContent } from "./content";
import { mergeIntake } from "./merge";

/**
 * A fusão é a ponte entre a etapa 02 e o resto do fluxo. O que estes testes protegem
 * não é o formato do resultado — é que nada do usuário se perde e nada do arquivo é
 * tocado.
 */

const formacao = {
  id: asItemId("intake-edu-1"),
  course: "MBA em Gestão de Produto",
  school: "Fundação Dom Cabral",
  start: "03/2025",
  finish: "12/2026",
};

const experiencia = {
  id: asItemId("intake-job-1"),
  company: "Cooperativa Aurora",
  role: "Gerente de Operações",
  start: "01/2025",
  end: "06/2026",
  ongoing: false,
  delivered: "Reduzi o tempo de atendimento em 30%.\nImplantei o turno noturno.",
};

function intake(parcial: Partial<IntakeContent>): IntakeContent {
  return { ...emptyIntake, ...parcial };
}

describe("fusão do que foi digitado com o currículo importado", () => {
  test("Formação digitada entra no currículo", () => {
    const { resume } = mergeIntake(importedResume, intake({ education: [formacao] }));

    const nova = resume.education.find((item) => item.id === formacao.id);
    expect(nova?.course).toBe("MBA em Gestão de Produto");
    expect(nova?.school).toBe("Fundação Dom Cabral");
    expect(nova?.period.complete).toBe(true);
  });

  test("Experiência digitada entra com as suas entregas", () => {
    const { resume } = mergeIntake(importedResume, intake({ experience: [experiencia] }));

    const nova = resume.jobs.find((job) => job.id === experiencia.id);
    expect(nova?.bullets.map((bullet) => bullet.value.text)).toEqual([
      "Reduzi o tempo de atendimento em 30%.",
      "Implantei o turno noturno.",
    ]);
  });

  test("Habilidade digitada entra na linha de habilidades", () => {
    const { resume } = mergeIntake(
      importedResume,
      intake({
        skills: [
          { id: asItemId("intake-skill-1"), name: "Gestão de equipes" },
          { id: asItemId("intake-skill-2"), name: "Lean" },
        ],
      }),
    );

    expect(resume.skills?.text).toBe(
      `${importedResume.skills?.text}, Gestão de equipes, Lean`,
    );
  });

  test("Currículo sem habilidades ganha a linha", () => {
    expect(minimalResume.skills).toBeNull();

    const { resume } = mergeIntake(
      minimalResume,
      intake({ skills: [{ id: asItemId("intake-skill-1"), name: "Espanhol fluente" }] }),
    );

    expect(resume.skills?.text).toBe("Espanhol fluente");
  });

  test("Origem do que foi digitado é o usuário", () => {
    const { resume } = mergeIntake(
      importedResume,
      intake({
        education: [formacao],
        experience: [experiencia],
        skills: [{ id: asItemId("intake-skill-1"), name: "Lean" }],
      }),
    );

    const novaFormacao = resume.education.find((item) => item.id === formacao.id);
    const novaExperiencia = resume.jobs.find((job) => job.id === experiencia.id);

    expect(novaFormacao?.period.origin).toEqual({ kind: "typed" });
    expect(novaExperiencia?.period.origin).toEqual({ kind: "typed" });
    expect(novaExperiencia?.bullets.map((bullet) => bullet.value.origin)).toEqual([
      { kind: "typed" },
      { kind: "typed" },
    ]);
    expect(resume.skills?.origin).toEqual({ kind: "typed" });

    // Nada entrou como proposta da IA.
    const origens = [
      ...resume.jobs.flatMap((job) => [
        job.period.origin.kind,
        ...job.bullets.map((bullet) => bullet.value.origin.kind),
      ]),
      ...resume.education.map((item) => item.period.origin.kind),
    ];
    expect(origens).not.toContain("proposed");
  });

  test("Nenhum trecho importado é alterado", () => {
    const { resume } = mergeIntake(
      importedResume,
      intake({ education: [formacao], experience: [experiencia] }),
    );

    for (const original of importedResume.jobs) {
      expect(resume.jobs.find((job) => job.id === original.id)).toEqual(original);
    }
    for (const original of importedResume.education) {
      expect(resume.education.find((item) => item.id === original.id)).toEqual(original);
    }
    expect(resume.header).toEqual(importedResume.header);
    expect(resume.summary).toEqual(importedResume.summary);
  });

  test("Refazer a fusão não duplica", () => {
    const primeira = mergeIntake(importedResume, intake({ experience: [experiencia] }));

    // O usuário volta à etapa 02 e corrige o cargo. A fusão parte de novo do importado.
    const segunda = mergeIntake(
      importedResume,
      intake({ experience: [{ ...experiencia, role: "Diretora de Operações" }] }),
    );

    expect(primeira.resume.jobs).toHaveLength(importedResume.jobs.length + 1);
    expect(segunda.resume.jobs).toHaveLength(importedResume.jobs.length + 1);
    expect(segunda.resume.jobs.filter((job) => job.id === experiencia.id)).toHaveLength(
      1,
    );
    expect(segunda.resume.jobs.find((job) => job.id === experiencia.id)?.role).toBe(
      "Diretora de Operações",
    );
  });

  test("Data digitada vira período completo", () => {
    const { resume } = mergeIntake(importedResume, intake({ experience: [experiencia] }));

    const periodo = resume.jobs.find((job) => job.id === experiencia.id)?.period;
    expect(periodo?.complete).toBe(true);
    expect(periodo?.start).toEqual({ month: 1, year: 2025 });
    expect(periodo?.end).toEqual({ month: 6, year: 2026 });
  });

  test("Experiência em andamento vira fim em aberto", () => {
    const { resume } = mergeIntake(
      importedResume,
      intake({ experience: [{ ...experiencia, end: "", ongoing: true }] }),
    );

    const periodo = resume.jobs.find((job) => job.id === experiencia.id)?.period;
    expect(periodo?.complete).toBe(true);
    expect(periodo?.end && isOpenEnd(periodo.end)).toBe(true);
    expect(periodo?.start && isYearMonth(periodo.start)).toBe(true);
  });

  test("Item sem o essencial não entra no currículo", () => {
    const { resume } = mergeIntake(
      importedResume,
      intake({ experience: [{ ...experiencia, company: "" }] }),
    );

    expect(resume.jobs.map((job) => job.id)).toEqual(
      importedResume.jobs.map((job) => job.id),
    );
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
  });

  test("O que não virou item volta como sobra", () => {
    const { leftovers } = mergeIntake(
      importedResume,
      intake({
        experience: [{ ...experiencia, company: "" }],
        education: [{ ...formacao, course: "" }],
      }),
    );

    expect(leftovers).toContain("Gerente de Operações");
    expect(leftovers).toContain("Reduzi o tempo de atendimento em 30%.");
    expect(leftovers).toContain("Fundação Dom Cabral");
  });

  test("nada digitado devolve o currículo importado", () => {
    const { resume, leftovers } = mergeIntake(importedResume, emptyIntake);

    expect(resume).toEqual(importedResume);
    expect(leftovers).toEqual([]);
  });

  test("o currículo em trabalho continua válido", () => {
    const { resume } = mergeIntake(
      importedResume,
      intake({
        education: [formacao],
        experience: [experiencia],
        skills: [{ id: asItemId("intake-skill-1"), name: "Lean" }],
      }),
    );

    expect(ResumeSchema.safeParse(resume).success).toBe(true);
  });
});
