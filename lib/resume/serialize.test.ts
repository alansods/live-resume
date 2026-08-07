import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { generateFinal } from "./generate";
import { asItemId } from "./ids";
import { allPaths, jobBulletPath, resolvePath, summaryPath } from "./paths";
import { deserializeResume, SerializationError, serializeResume } from "./serialize";

const kobo = asItemId("job-kobo-lead");
const koboBullet1 = asItemId("bullet-kobo-lead-1");
const senior = asItemId("job-kobo-senior");
const orion = asItemId("job-orion");
const vetor = asItemId("job-vetor");

describe("Serialização validada", () => {
  test("Ida e volta preserva o currículo", () => {
    // Um currículo gerado: com patches aplicados, ordem da IA e período incompleto.
    const gerado = generateFinal(
      importedResume,
      [
        {
          path: jobBulletPath(kobo, koboBullet1),
          text: "Liderei a migração da plataforma, cortando a latência p95 em 77%.",
        },
      ],
      { jobs: [vetor, orion, senior, kobo] },
    );

    const voltou = deserializeResume(serializeResume(gerado));

    expect(voltou).toEqual(gerado);

    // Ordem preservada.
    expect(voltou.jobs.map((job) => job.id)).toEqual([vetor, orion, senior, kobo]);
    // Origem preservada.
    expect(resolvePath(voltou, jobBulletPath(kobo, koboBullet1)).value.origin).toEqual({
      kind: "proposed",
      confirmed: true,
    });
    // Período incompleto continua incompleto, com o texto original.
    const periodoVetor = voltou.jobs.find((job) => job.id === vetor)?.period;
    expect(periodoVetor).toMatchObject({ complete: false, raw: "2018 - 2019" });

    // Todos os paths resolvem os mesmos trechos.
    for (const path of allPaths(gerado)) {
      expect(resolvePath(voltou, path).value, path).toEqual(
        resolvePath(gerado, path).value,
      );
    }
  });

  test("Ida e volta aceita objeto já parseado", () => {
    const objeto = JSON.parse(serializeResume(importedResume));
    expect(deserializeResume(objeto)).toEqual(importedResume);
  });

  test("Payload inválido é rejeitado na fronteira", () => {
    const invalido = structuredClone(importedResume) as Record<string, unknown>;
    const jobs = invalido.jobs as Array<Record<string, unknown>>;
    delete jobs[0].company;
    (invalido.header as Record<string, unknown>).name = 42;

    expect(() => deserializeResume(invalido)).toThrow(SerializationError);

    try {
      deserializeResume(invalido);
      expect.unreachable("deveria ter falhado");
    } catch (error) {
      const falha = error as SerializationError;
      // O erro nomeia os campos inválidos.
      expect(falha.fields).toContain("jobs.0.company");
      expect(falha.fields).toContain("header.name");
      expect(falha.message).toContain("jobs.0.company");
    }
  });

  test("Nenhum currículo parcial é produzido", () => {
    const invalido = structuredClone(importedResume) as Record<string, unknown>;
    delete invalido.jobs;

    let resultado: unknown = "não atribuído";
    try {
      resultado = deserializeResume(invalido);
    } catch {
      // esperado
    }

    expect(resultado).toBe("não atribuído");
  });

  test("JSON malformado é rejeitado", () => {
    expect(() => deserializeResume("{ isto não é json")).toThrow(SerializationError);
    expect(() => deserializeResume("{ isto não é json")).toThrow(/JSON válido/);
  });

  test("Id inválido não atravessa a fronteira", () => {
    const comPonto = structuredClone(importedResume) as Record<string, unknown>;
    const jobs = comPonto.jobs as Array<Record<string, unknown>>;
    jobs[0].id = "job.com.ponto";

    expect(() => deserializeResume(comPonto)).toThrow(SerializationError);
  });

  test("Currículo desserializado continua endereçável", () => {
    const voltou = deserializeResume(serializeResume(importedResume));
    expect(() => resolvePath(voltou, summaryPath())).not.toThrow();
    expect(allPaths(voltou)).toEqual(allPaths(importedResume));
  });
});
