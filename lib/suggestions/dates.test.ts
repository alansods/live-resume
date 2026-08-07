import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { asItemId } from "@/lib/resume/ids";
import { imported } from "@/lib/resume/origin";
import { parsePeriod } from "@/lib/resume/period";
import { educationPeriodPath, jobPeriodPath } from "@/lib/resume/paths";
import { SuggestionSchema } from "./model";
import { suggestDates } from "./dates";

const kobo = importedResume.jobs[0];
const senior = importedResume.jobs[1];
const orion = importedResume.jobs[2];
const vetor = importedResume.jobs[3];

let contador = 0;
const gerar = (resume = importedResume) => {
  contador = 0;
  return suggestDates(resume, { makeId: () => `d${(contador += 1)}` });
};

/** Substitui o período de uma experiência, mantendo o resto. */
function comPeriodo(indice: number, raw: string) {
  const jobs = importedResume.jobs.map((job, i) =>
    i === indice ? { ...job, period: parsePeriod(raw, imported) } : job,
  );
  return { ...importedResume, jobs };
}

describe("Detecção de períodos sobrepostos", () => {
  test("Par sobreposto vira sugestão", () => {
    const { suggestions } = gerar();

    // Órion (01/2020–12/2022) sobrepõe Kobo Sênior (03/2022–12/2024) em 10 meses.
    const sobreposicao = suggestions.find((s) => s.title.includes("sobrepostos"));
    expect(sobreposicao).toBeDefined();
    expect(sobreposicao?.title).toContain("10 meses");
    expect(sobreposicao?.path).toBe(jobPeriodPath(orion.id));
  });

  test("Períodos sem sobreposição não geram sugestão", () => {
    // Kobo Tech Lead (01/2025 – atual) e Vetor não se sobrepõem.
    const { suggestions } = gerar();
    const paths = suggestions.map((s) => s.path);

    expect(paths).not.toContain(jobPeriodPath(kobo.id));
  });

  test("Período incompleto não é comparado", () => {
    // Vetor tem "2018 - 2019", incompleto: não entra em nenhuma sobreposição.
    const { suggestions } = gerar();
    const sobreposicoes = suggestions.filter((s) => s.title.includes("sobrepostos"));

    for (const sugestao of sobreposicoes) {
      expect(sugestao.path).not.toBe(jobPeriodPath(vetor.id));
      expect(sugestao.where).not.toContain("Agência Vetor");
    }
  });

  test("Experiência em curso sobrepõe as posteriores", () => {
    // Kobo Tech Lead passa a começar em 01/2021, ainda em curso: passa a sobrepor
    // Órion e Kobo Sênior.
    const resume = comPeriodo(0, "01/2021 – atual");
    const { suggestions } = suggestDates(resume, { makeId: () => "x" });

    expect(suggestions.some((s) => s.where.includes("Fintech Kobo ⇄"))).toBe(true);
  });

  test("Local nomeia as duas experiências", () => {
    const { suggestions } = gerar();
    const sobreposicao = suggestions.find((s) => s.title.includes("sobrepostos"));

    expect(sobreposicao?.where).toBe("Banco Órion ⇄ Fintech Kobo");
  });
});

describe("Correção de sobreposição derivada das datas do usuário", () => {
  test("Fim proposto é o mês anterior ao início seguinte", () => {
    const { suggestions } = gerar();
    const sobreposicao = suggestions.find((s) => s.title.includes("sobrepostos"));

    // Kobo Sênior começa em 03/2022 → Órion passa a terminar em 02/2022.
    expect(sobreposicao?.after).toBe("01/2020 – 02/2022");
  });

  test("A justificativa cita a data de origem", () => {
    const { suggestions } = gerar();
    const sobreposicao = suggestions.find((s) => s.title.includes("sobrepostos"));

    expect(sobreposicao?.why).toContain("03/2022");
    expect(sobreposicao?.why).toContain("Fintech Kobo");
  });

  test("Correção incide sobre a experiência anterior", () => {
    const { suggestions } = gerar();
    const sobreposicao = suggestions.find((s) => s.title.includes("sobrepostos"));

    // Órion (01/2020) começou antes de Kobo Sênior (03/2022).
    expect(sobreposicao?.path).toBe(jobPeriodPath(orion.id));
    expect(sobreposicao?.path).not.toBe(jobPeriodPath(senior.id));
  });

  test("Sem base para derivar, não há proposta de data", () => {
    // As duas começam no mesmo mês: não há fim válido anterior ao início da outra.
    const resume = comPeriodo(2, "03/2022 – 12/2024");
    const { suggestions } = suggestDates(resume, { makeId: () => "x" });

    expect(suggestions.filter((s) => s.title.includes("sobrepostos"))).toEqual([]);
  });

  test("Correção derivada não é marcada como inferida", () => {
    const { inferred } = gerar();

    expect(inferred.map((item) => String(item.path))).not.toContain(
      String(jobPeriodPath(orion.id)),
    );
  });
});

describe("Organização de períodos incompletos", () => {
  test("Período sem mês recebe proposta completa", () => {
    const { suggestions } = gerar();
    const semMes = suggestions.find((s) => s.path === jobPeriodPath(vetor.id));

    expect(semMes).toBeDefined();
    expect(semMes?.before).toBe("2018 - 2019");
    // Anos preservados, meses completados.
    expect(semMes?.after).toBe("01/2018 – 12/2019");
  });

  test("Mês inferido é marcado como tal", () => {
    const { inferred } = gerar();

    const doVetor = inferred.find(
      (item) => String(item.path) === jobPeriodPath(vetor.id),
    );
    expect(doVetor).toBeDefined();
    expect(doVetor?.original).toBe("2018 - 2019");
    expect(doVetor?.proposed).toBe("01/2018 – 12/2019");
  });

  test("Mês derivado de vizinho não é inferido", () => {
    // O período incompleto termina em 2019 e a experiência seguinte começa em
    // 07/2019: o fim vem de lá, não de dezembro.
    const jobs = [
      {
        ...importedResume.jobs[0],
        id: asItemId("job-antigo"),
        period: parsePeriod("2017 - 2019", imported),
      },
      {
        ...importedResume.jobs[1],
        id: asItemId("job-novo"),
        period: parsePeriod("07/2019 – 12/2021", imported),
      },
    ];
    const resume = { ...importedResume, jobs, education: [] };

    const { suggestions, inferred, requiresDisclosure } = suggestDates(resume, {
      makeId: () => "x",
    });

    const organizacao = suggestions.find(
      (s) => s.path === jobPeriodPath(asItemId("job-antigo")),
    );
    expect(organizacao?.after).toBe("01/2017 – 06/2019");
    expect(organizacao?.why).toContain("07/2019");
    // O início continua inferido (janeiro), então o aviso segue exigido.
    expect(requiresDisclosure).toBe(true);
    expect(inferred).toHaveLength(1);
  });

  test("Período completo não é apontado", () => {
    const completos = {
      ...importedResume,
      jobs: [importedResume.jobs[0]],
      education: [],
    };
    const { suggestions } = suggestDates(completos, { makeId: () => "x" });

    expect(suggestions).toEqual([]);
  });

  test("Formação incompleta também é organizada", () => {
    const education = [
      { ...importedResume.education[0], period: parsePeriod("2014 - 2016", imported) },
      importedResume.education[1],
    ];
    const resume = { ...importedResume, education };

    const { suggestions } = suggestDates(resume, { makeId: () => "x" });
    const daFormacao = suggestions.find(
      (s) => s.path === educationPeriodPath(education[0].id),
    );

    expect(daFormacao).toBeDefined();
    expect(daFormacao?.before).toBe("2014 - 2016");
    expect(daFormacao?.after).toBe("01/2014 – 12/2016");
  });

  test("Período com uma data só é deixado como está", () => {
    // "2014" não é período sem mês: é período sem fim. Propor um intervalo aqui
    // seria inventar o começo e o término, não organizar o que existe.
    const education = [
      { ...importedResume.education[0], period: parsePeriod("2014", imported) },
    ];
    const resume = { ...importedResume, jobs: [importedResume.jobs[0]], education };

    const { suggestions } = suggestDates(resume, { makeId: () => "x" });

    expect(suggestions).toEqual([]);
  });
});

describe("Aviso de datas organizadas", () => {
  test("Inferência exige o aviso", () => {
    const { requiresDisclosure, inferred } = gerar();

    expect(requiresDisclosure).toBe(true);
    expect(inferred.length).toBeGreaterThan(0);
    for (const item of inferred) {
      expect(item.proposed).toMatch(/^\d{2}\/\d{4}/);
    }
  });

  test("Sem inferência, sem aviso", () => {
    // Só o par sobreposto, cuja correção é derivada.
    const resume = {
      ...importedResume,
      jobs: [importedResume.jobs[1], importedResume.jobs[2]],
      education: [],
    };
    const { requiresDisclosure, inferred, suggestions } = suggestDates(resume, {
      makeId: () => "x",
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(inferred).toEqual([]);
    expect(requiresDisclosure).toBe(false);
  });

  test("Currículo sem defeito de data não exige aviso", () => {
    const resume = {
      ...importedResume,
      jobs: [importedResume.jobs[0]],
      education: [importedResume.education[0]],
    };
    const { suggestions, requiresDisclosure } = suggestDates(resume, {
      makeId: () => "x",
    });

    expect(suggestions).toEqual([]);
    expect(requiresDisclosure).toBe(false);
  });
});

describe("Detecção determinística", () => {
  test("Mesmo currículo, mesmas sugestões", () => {
    const primeira = gerar();
    const segunda = gerar();

    expect(segunda).toEqual(primeira);
  });

  test("Nenhuma chamada de IA", () => {
    const fonte = readFileSync(
      join(process.cwd(), "lib", "suggestions", "dates.ts"),
      "utf8",
    );

    expect(fonte).not.toMatch(/from\s+"@\/lib\/ai/);
    expect(fonte).not.toContain("generateStructured");
    expect(fonte).not.toContain("fetch(");
  });
});

describe("Sugestões de data respeitam o contrato comum", () => {
  test("Modelo comum é respeitado", () => {
    const { suggestions } = gerar();

    expect(suggestions.length).toBeGreaterThan(0);
    for (const sugestao of suggestions) {
      expect(SuggestionSchema.safeParse(sugestao).success, sugestao.path).toBe(true);
      expect(sugestao.kind).toBe("dates");
      expect(["fixDate", "normalize"]).toContain(sugestao.action);
    }
  });

  test("Um trecho, uma sugestão de data", () => {
    const { suggestions } = gerar();
    const paths = suggestions.map((s) => s.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  test("O que o usuário informou tem precedência", () => {
    // O usuário completou o período do Vetor na etapa 02.
    const resume = comPeriodo(3, "03/2018 – 11/2019");
    const { suggestions, requiresDisclosure } = suggestDates(resume, {
      makeId: () => "x",
    });

    expect(suggestions.map((s) => s.path)).not.toContain(jobPeriodPath(vetor.id));
    expect(requiresDisclosure).toBe(false);
  });

  test("Currículo permanece intacto ao sugerir datas", () => {
    const antes = structuredClone(importedResume);
    gerar();
    expect(importedResume).toEqual(antes);
  });
});
