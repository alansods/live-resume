import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { importedResume, minimalResume } from "@/fixtures/resumes";
import { asItemId } from "./ids";
import {
  allPaths,
  educationPeriodPath,
  jobBulletPath,
  jobPeriodPath,
  parsePath,
  PathError,
  resolvePath,
  skillsPath,
  summaryPath,
} from "./paths";

const kobo = asItemId("job-kobo-lead");
const koboBullet = asItemId("bullet-kobo-lead-1");
const insper = asItemId("edu-insper");

describe("Paths de trecho por id", () => {
  test("Path resolve o trecho correspondente", () => {
    const bullet = resolvePath(importedResume, jobBulletPath(kobo, koboBullet));
    expect(bullet.kind).toBe("text");
    expect(bullet.value).toMatchObject({
      text: "Liderei a migração da plataforma de pagamentos.",
    });

    const resumo = resolvePath(importedResume, summaryPath());
    expect(resumo.kind).toBe("text");

    const habilidades = resolvePath(importedResume, skillsPath());
    expect(habilidades.kind).toBe("text");

    const periodo = resolvePath(importedResume, jobPeriodPath(kobo));
    expect(periodo.kind).toBe("period");
    expect(periodo.value).toMatchObject({ raw: "01/2025 – atual" });

    const formacao = resolvePath(importedResume, educationPeriodPath(insper));
    expect(formacao.kind).toBe("period");
  });

  test("Path resolve pelo id, não pela posição", () => {
    // O mesmo trecho, com a lista de experiências embaralhada.
    const embaralhado = {
      ...importedResume,
      jobs: [...importedResume.jobs].reverse(),
    };

    const original = resolvePath(importedResume, jobBulletPath(kobo, koboBullet));
    const depois = resolvePath(embaralhado, jobBulletPath(kobo, koboBullet));

    expect(depois.value).toEqual(original.value);
  });

  test("Path de item inexistente é erro", () => {
    const fantasma = jobPeriodPath(asItemId("job-que-nao-existe"));

    expect(() => resolvePath(importedResume, fantasma)).toThrow(PathError);
    expect(() => resolvePath(importedResume, fantasma)).toThrow(/job-que-nao-existe/);

    // Bullet inexistente dentro de experiência que existe.
    expect(() =>
      resolvePath(importedResume, jobBulletPath(kobo, asItemId("bullet-fantasma"))),
    ).toThrow(/bullet-fantasma/);

    // Seção ausente é ausência, não valor vazio.
    expect(() => resolvePath(minimalResume, summaryPath())).toThrow(PathError);
    expect(() => resolvePath(minimalResume, skillsPath())).toThrow(/habilidades/);
  });

  test("Path malformado é erro", () => {
    const invalidos = [
      "",
      "resumo",
      "jobs",
      "jobs.job-kobo-lead",
      "jobs.job-kobo-lead.periodo",
      "jobs.job-kobo-lead.bullets",
      "jobs..period",
      "education.edu-insper",
      "skills.extra",
      "header.name",
    ];

    for (const invalido of invalidos) {
      expect(() => parsePath(invalido), invalido).toThrow(PathError);
      expect(() => parsePath(invalido), invalido).toThrow(new RegExp(invalido || "Path"));
    }
  });

  test("Path por índice de posição não resolve", () => {
    // A forma é válida — "0" e "1" são ids possíveis —, então o parse aceita. O que
    // não existe é item com esse id: a falha aparece na resolução, alto e claro, em
    // vez de devolver o trecho da posição 0.
    expect(parsePath("jobs.0.bullets.1")).toEqual({
      kind: "jobBullet",
      jobId: "0",
      bulletId: "1",
    });
    expect(() => resolvePath(importedResume, "jobs.0.bullets.1")).toThrow(PathError);
    expect(() => resolvePath(importedResume, "jobs.0.bullets.1")).toThrow(
      /Não existe experiência com id "0"/,
    );
  });

  test("Parse devolve a forma tipada", () => {
    expect(parsePath("summary")).toEqual({ kind: "summary" });
    expect(parsePath("skills")).toEqual({ kind: "skills" });
    expect(parsePath("jobs.job-orion.period")).toEqual({
      kind: "jobPeriod",
      jobId: "job-orion",
    });
    expect(parsePath("jobs.job-orion.bullets.bullet-orion-2")).toEqual({
      kind: "jobBullet",
      jobId: "job-orion",
      bulletId: "bullet-orion-2",
    });
    expect(parsePath("education.edu-ufabc.period")).toEqual({
      kind: "educationPeriod",
      educationId: "edu-ufabc",
    });
  });

  test("Todo path do currículo resolve", () => {
    const paths = allPaths(importedResume);

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(() => resolvePath(importedResume, path), path).not.toThrow();
    }
  });

  test("Nenhum path é concatenado fora de paths.ts", () => {
    const suspeito = /["'`](?:jobs|education)\.\$?\{?/;
    const raiz = process.cwd();
    const arquivos: string[] = [];

    const varrer = (dir: string) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const caminho = join(dir, entrada.name);
        if (entrada.isDirectory()) varrer(caminho);
        else if (entrada.name.endsWith(".ts") && entrada.name !== "paths.ts") {
          arquivos.push(caminho);
        }
      }
    };
    varrer(join(raiz, "lib"));
    varrer(join(raiz, "fixtures"));

    // Comentários citam as formas de path para documentá-las; o que não pode é
    // código montando path à mão.
    const semComentarios = (fonte: string) =>
      fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    const infratores = arquivos.filter((arquivo) => {
      if (arquivo.endsWith(".test.ts")) return false;
      return suspeito.test(semComentarios(readFileSync(arquivo, "utf8")));
    });

    expect(infratores).toEqual([]);
  });
});
