import { describe, expect, test } from "vitest";
import { asItemId, newItemId } from "./ids";

describe("Identidade estável de item", () => {
  test("Id de item removido não retorna", () => {
    const removido = newItemId();
    const novos = Array.from({ length: 1000 }, () => newItemId());

    expect(novos).not.toContain(removido);
    expect(new Set(novos).size).toBe(novos.length);
  });

  test("Nenhum significado é derivável do valor do id", () => {
    const sequencia = Array.from({ length: 50 }, () => newItemId());

    // Nada de ordem: os ids gerados em sequência não são ordenáveis entre si.
    const ordenados = [...sequencia].sort();
    expect(ordenados).not.toEqual(sequencia);

    // Nada de tipo: o id não carrega prefixo, sufixo ou marca de que item é.
    for (const id of sequencia) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  test("Id vazio é rejeitado", () => {
    expect(() => asItemId("")).toThrow();
  });
});

describe("Id e path", () => {
  test("Id com ponto é rejeitado", () => {
    // O ponto separa segmentos do path: um id com ponto tornaria o endereço ambíguo.
    expect(() => asItemId("job.kobo")).toThrow(/ponto/);
  });
});
