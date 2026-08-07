import { describe, expect, test } from "vitest";
import { structuredResumeJsonSchema } from "../structure";
import { toStrictJsonSchema } from "./json-schema";

/**
 * A tradução para o dialeto estrito é testada contra o schema real do projeto, e não
 * contra um exemplo de brinquedo: é ele que precisa atravessar Groq e Cerebras sem
 * levar 400.
 */

describe("Tradução para o modo estrito da OpenAI", () => {
  test("todo objeto ganha additionalProperties: false e required completo", () => {
    const estrito = toStrictJsonSchema({
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "object", properties: { c: { type: "number" } } },
      },
      required: ["a"],
    });

    expect(estrito.additionalProperties).toBe(false);
    expect(estrito.required).toEqual(["a", "b"]);

    const b = (estrito.properties as Record<string, Record<string, unknown>>).b;
    expect(b.additionalProperties).toBe(false);
    expect(b.required).toEqual(["c"]);
  });

  test("nullable: true vira type com null, que é o que o modo estrito entende", () => {
    const estrito = toStrictJsonSchema({ type: "string", nullable: true });
    expect(estrito.type).toEqual(["string", "null"]);
    expect(estrito.nullable).toBeUndefined();
  });

  test("desce em items de array", () => {
    const estrito = toStrictJsonSchema({
      type: "array",
      items: { type: "object", properties: { a: { type: "string" } } },
    });

    const items = estrito.items as Record<string, unknown>;
    expect(items.additionalProperties).toBe(false);
    expect(items.required).toEqual(["a"]);
  });

  test("não modifica o schema recebido", () => {
    const original = { type: "string", nullable: true };
    toStrictJsonSchema(original);
    expect(original).toEqual({ type: "string", nullable: true });
  });

  test("o schema do currículo atravessa inteiro, sem nullable sobrando", () => {
    const estrito = toStrictJsonSchema(structuredResumeJsonSchema);
    const propriedades = estrito.properties as Record<string, Record<string, unknown>>;

    expect(estrito.additionalProperties).toBe(false);
    expect(propriedades.summary.type).toEqual(["string", "null"]);
    expect(propriedades.skills.type).toEqual(["string", "null"]);
    expect(JSON.stringify(estrito)).not.toContain("nullable");

    const experiencia = propriedades.jobs.items as Record<string, unknown>;
    expect(experiencia.additionalProperties).toBe(false);
    expect(experiencia.required).toEqual(["company", "role", "period", "bullets"]);
  });
});
