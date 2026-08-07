import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import * as publicApi from "./index";
import { GenerationError, generateFinal, unconfirmedProposals } from "./generate";
import { asItemId } from "./ids";
import { proposed } from "./origin";
import {
  allPaths,
  educationPeriodPath,
  jobBulletPath,
  jobPeriodPath,
  resolvePath,
  skillsPath,
  summaryPath,
} from "./paths";
import { ResumeSchema, type Resume } from "./schema";

/** Lê o texto de um trecho, exigindo que ele seja mesmo um trecho de texto. */
function textAt(resume: Resume, path: string): string {
  const slice = resolvePath(resume, path);
  if (slice.kind !== "text") {
    throw new Error(`O path "${path}" resolve um período, não um texto.`);
  }
  return slice.value.text;
}

const kobo = asItemId("job-kobo-lead");
const koboBullet1 = asItemId("bullet-kobo-lead-1");
const senior = asItemId("job-kobo-senior");
const orion = asItemId("job-orion");
const vetor = asItemId("job-vetor");
const insper = asItemId("edu-insper");
const ufabc = asItemId("edu-ufabc");

/** Uma proposta da IA: reescreve o bullet sem métrica com um número que não estava lá. */
const bulletComMetrica = {
  path: jobBulletPath(kobo, koboBullet1),
  text: "Liderei a migração da plataforma de pagamentos, reduzindo a latência p95 em 77%.",
};

const resumoReescrito = {
  path: summaryPath(),
  text: "Engenheira back-end com 8 anos em plataformas de pagamento de alto volume.",
};

describe("Geração do currículo final a partir de patches selecionados", () => {
  test("Conjunto selecionado gera o currículo final", () => {
    const antes = structuredClone(importedResume);

    const final = generateFinal(importedResume, [bulletComMetrica, resumoReescrito]);

    const bullet = resolvePath(final, jobBulletPath(kobo, koboBullet1));
    expect(bullet.value).toMatchObject({ text: bulletComMetrica.text });
    expect(resolvePath(final, summaryPath()).value).toMatchObject({
      text: resumoReescrito.text,
    });

    // Trechos não endereçados ficam intactos.
    expect(resolvePath(final, skillsPath()).value).toEqual(
      resolvePath(importedResume, skillsPath()).value,
    );
    // O currículo de origem permanece exatamente como estava.
    expect(importedResume).toEqual(antes);
    expect(ResumeSchema.safeParse(final).success).toBe(true);
  });

  test("Conjunto vazio", () => {
    expect(generateFinal(importedResume, [])).toEqual(importedResume);
  });

  test("Resultado independe da ordem do conjunto", () => {
    const umaOrdem = generateFinal(importedResume, [bulletComMetrica, resumoReescrito]);
    const outraOrdem = generateFinal(importedResume, [resumoReescrito, bulletComMetrica]);

    expect(umaOrdem).toEqual(outraOrdem);
  });

  test("Dois patches no mesmo trecho são rejeitados", () => {
    const conflito = [
      bulletComMetrica,
      {
        path: jobBulletPath(kobo, koboBullet1),
        text: "Outra proposta para o mesmo bullet.",
      },
    ];

    expect(() => generateFinal(importedResume, conflito)).toThrow(GenerationError);
    expect(() => generateFinal(importedResume, conflito)).toThrow(
      /mesmo trecho|uma proposta por trecho/,
    );
  });

  test("Patch em path inexistente é rejeitado", () => {
    const fantasma = [
      resumoReescrito,
      { path: jobPeriodPath(asItemId("job-inexistente")), text: "01/2020 – 12/2021" },
    ];

    expect(() => generateFinal(importedResume, fantasma)).toThrow(GenerationError);
    // Nem parcialmente aplicado: o patch válido do conjunto também não passa.
    expect(() => generateFinal(importedResume, fantasma)).toThrow(/job-inexistente/);
    expect(textAt(importedResume, summaryPath())).not.toBe(resumoReescrito.text);
  });

  test("Patch em período é normalizado como período", () => {
    const final = generateFinal(importedResume, [
      { path: jobPeriodPath(vetor), text: "03/2018 – 11/2019" },
    ]);

    const periodo = resolvePath(final, jobPeriodPath(vetor));
    expect(periodo.kind).toBe("period");
    expect(periodo.value).toMatchObject({
      complete: true,
      start: { month: 3, year: 2018 },
      end: { month: 11, year: 2019 },
    });
  });

  test("Currículo final não carrega antes e depois", () => {
    const final = generateFinal(importedResume, [bulletComMetrica]);
    const bullet = resolvePath(final, jobBulletPath(kobo, koboBullet1));

    // O trecho tem um texto só — o final — e a sua origem. Nada mais.
    expect(Object.keys(bullet.value).sort()).toEqual(["origin", "text"]);

    // O texto anterior não sobrevive em lugar nenhum do currículo final.
    const textoAnterior = textAt(importedResume, jobBulletPath(kobo, koboBullet1));
    const todosOsTextos = allPaths(final)
      .map((path) => resolvePath(final, path))
      .filter((slice) => slice.kind === "text")
      .map((slice) => slice.value.text);
    expect(todosOsTextos).not.toContain(textoAnterior);

    // E nenhum campo de "antes e depois" foi introduzido na estrutura.
    const campos = new Set<string>();
    JSON.parse(JSON.stringify(final), function collect(chave: string) {
      if (chave) campos.add(chave);
      // eslint-disable-next-line prefer-rest-params
      return arguments[1];
    });
    for (const proibido of ["previousText", "previous", "updated", "before", "changed"]) {
      expect([...campos]).not.toContain(proibido);
    }
  });

  test("Não existe aplicação incremental nem reversão", () => {
    const exportado = Object.keys(publicApi);

    expect(exportado).toContain("generateFinal");
    for (const proibido of [
      "applyPatch",
      "applyOrder",
      "undo",
      "revert",
      "restore",
      "diff",
      "compare",
      "compareResumes",
    ]) {
      expect(exportado).not.toContain(proibido);
    }
    expect(
      exportado.filter((nome) => /undo|revert|restore|diff|desfaz/i.test(nome)),
    ).toEqual([]);
  });
});

describe("A marcação do usuário é a única porta de entrada", () => {
  test("Sugestão não marcada não deixa rastro no currículo final", () => {
    // Só o resumo foi marcado; a proposta para o bullet ficou de fora.
    const final = generateFinal(importedResume, [resumoReescrito]);

    const bullet = resolvePath(final, jobBulletPath(kobo, koboBullet1));
    const original = resolvePath(importedResume, jobBulletPath(kobo, koboBullet1));
    expect(bullet.value).toEqual(original.value);
    expect(bullet.value.origin).toEqual({ kind: "imported" });
  });

  test("Conteúdo original não é substituído sem marcação", () => {
    const final = generateFinal(importedResume, [resumoReescrito]);
    const marcados = new Set([String(resumoReescrito.path)]);

    for (const path of allPaths(importedResume)) {
      if (marcados.has(String(path))) continue;
      expect(resolvePath(final, path).value, path).toEqual(
        resolvePath(importedResume, path).value,
      );
    }
  });

  test("Proposta marcada pode conter conteúdo novo", () => {
    // O texto proposto introduz "77%", que não consta do currículo importado.
    expect(JSON.stringify(importedResume)).not.toContain("77%");

    const final = generateFinal(importedResume, [bulletComMetrica]);
    const bullet = resolvePath(final, jobBulletPath(kobo, koboBullet1));

    expect(textAt(final, jobBulletPath(kobo, koboBullet1))).toContain("77%");
    expect(bullet.value.origin).toEqual({ kind: "proposed", confirmed: true });
  });

  test("Patch selecionado registra proposta confirmada", () => {
    const final = generateFinal(importedResume, [bulletComMetrica, resumoReescrito]);

    expect(resolvePath(final, summaryPath()).value.origin).toEqual({
      kind: "proposed",
      confirmed: true,
    });
    expect(unconfirmedProposals(final)).toEqual([]);
  });

  test("Conteúdo não confirmado é distinguível", () => {
    const pendente = structuredClone(importedResume);
    pendente.jobs[0].bullets[0].value.origin = proposed(false);
    pendente.skills!.origin = proposed(false);

    const pendentes = unconfirmedProposals(pendente);

    expect(pendentes.map((item) => String(item.path)).sort()).toEqual(
      [String(jobBulletPath(kobo, koboBullet1)), String(skillsPath())].sort(),
    );
  });
});

describe("Ordem do conteúdo definida pela IA na geração", () => {
  const ordemDaIa = {
    jobs: [kobo, senior, orion, vetor].reverse(),
    education: [ufabc, insper],
  };

  test("Ordem recebida é aplicada na geração", () => {
    const final = generateFinal(importedResume, [], ordemDaIa);

    expect(final.jobs.map((job) => job.id)).toEqual([vetor, orion, senior, kobo]);
    expect(final.education.map((education) => education.id)).toEqual([ufabc, insper]);
    // Campos e ids intactos.
    expect(final.jobs.find((job) => job.id === kobo)).toEqual(
      importedResume.jobs.find((job) => job.id === kobo),
    );
  });

  test("Ordem de bullets dentro da experiência", () => {
    const bullets = importedResume.jobs[0].bullets.map((bullet) => bullet.id);
    const final = generateFinal(importedResume, [], {
      bullets: { [kobo]: [...bullets].reverse() },
    });

    expect(final.jobs[0].bullets.map((bullet) => bullet.id)).toEqual(
      [...bullets].reverse(),
    );
  });

  test("Geração sem ordem informada", () => {
    const final = generateFinal(importedResume, [resumoReescrito]);

    expect(final.jobs.map((job) => job.id)).toEqual(
      importedResume.jobs.map((job) => job.id),
    );
    expect(final.education.map((item) => item.id)).toEqual(
      importedResume.education.map((item) => item.id),
    );
  });

  test("Ordem incompleta é rejeitada", () => {
    // Uma resposta truncada da IA: falta a última experiência.
    expect(() =>
      generateFinal(importedResume, [], { jobs: [kobo, senior, orion] }),
    ).toThrow(GenerationError);
    expect(() =>
      generateFinal(importedResume, [], { jobs: [kobo, senior, orion] }),
    ).toThrow(/incompleta[\s\S]*job-vetor/);

    // Id repetido também é permutação inválida.
    expect(() =>
      generateFinal(importedResume, [], { jobs: [kobo, kobo, orion, vetor] }),
    ).toThrow(/repete/);
  });

  test("Ordem com id desconhecido é rejeitada", () => {
    expect(() =>
      generateFinal(importedResume, [], {
        jobs: [kobo, senior, orion, asItemId("job-fantasma")],
      }),
    ).toThrow(/job-fantasma/);

    expect(() =>
      generateFinal(importedResume, [], { bullets: { "job-fantasma": [] } }),
    ).toThrow(/job-fantasma/);
  });

  test("Ordem inválida não altera o currículo", () => {
    const antes = structuredClone(importedResume);

    expect(() => generateFinal(importedResume, [], { jobs: [kobo] })).toThrow();

    expect(importedResume).toEqual(antes);
  });
});

describe("Invariantes do desenho por id", () => {
  test("Path sobrevive à reordenação", () => {
    const final = generateFinal(importedResume, [], {
      jobs: [vetor, orion, senior, kobo],
      education: [ufabc, insper],
      bullets: { [kobo]: [asItemId("bullet-kobo-lead-2"), koboBullet1] },
    });

    for (const path of allPaths(importedResume)) {
      expect(resolvePath(final, path).value, path).toEqual(
        resolvePath(importedResume, path).value,
      );
    }
  });

  test("Id sobrevive à transformação", () => {
    const final = generateFinal(importedResume, [bulletComMetrica], {
      jobs: [vetor, orion, senior, kobo],
    });

    const idsDe = (resume: typeof importedResume) =>
      [
        ...resume.jobs.map((job) => job.id),
        ...resume.jobs.flatMap((job) => job.bullets.map((bullet) => bullet.id)),
        ...resume.education.map((education) => education.id),
      ].sort();

    expect(idsDe(final)).toEqual(idsDe(importedResume));
  });

  test("Currículo em revisão conserva a ordem do arquivo", () => {
    // Nada é reordenado antes da geração: a revisão vê o arquivo como veio.
    expect(importedResume.jobs.map((job) => job.id)).toEqual([
      kobo,
      senior,
      orion,
      vetor,
    ]);
    expect(importedResume.education.map((item) => item.id)).toEqual([insper, ufabc]);
  });

  test("Currículo final continua válido e endereçável", () => {
    const final = generateFinal(importedResume, [bulletComMetrica], {
      jobs: [vetor, orion, senior, kobo],
    });

    expect(ResumeSchema.safeParse(final).success).toBe(true);
    expect(() => resolvePath(final, educationPeriodPath(insper))).not.toThrow();
  });
});
