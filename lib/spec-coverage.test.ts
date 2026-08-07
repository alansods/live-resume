import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Cada cenário de spec tem um teste com o mesmo nome.
 *
 * É o que impede a spec de virar documento morto: cenário novo sem teste, ou cenário
 * renomeado sem o teste acompanhar, quebra aqui.
 */

const raiz = process.cwd();

function arquivosEm(dir: string, aceita: (nome: string) => boolean): string[] {
  if (!existsSync(dir)) return [];

  const encontrados: string[] = [];
  const varrer = (atual: string) => {
    for (const entrada of readdirSync(atual, { withFileTypes: true })) {
      const caminho = join(atual, entrada.name);
      if (entrada.isDirectory()) varrer(caminho);
      else if (aceita(entrada.name)) encontrados.push(caminho);
    }
  };
  varrer(dir);
  return encontrados;
}

/**
 * Specs das changes abertas e das capabilities já arquivadas. O `archive/` fica de
 * fora: os cenários de lá já foram promovidos para `openspec/specs/`, e contá-los duas
 * vezes não acrescenta nada.
 */
function arquivosDeSpec(): string[] {
  const changes = join(raiz, "openspec", "changes");
  const abertas = existsSync(changes)
    ? readdirSync(changes, { withFileTypes: true })
        .filter((entrada) => entrada.isDirectory() && entrada.name !== "archive")
        .flatMap((entrada) =>
          arquivosEm(join(changes, entrada.name, "specs"), (nome) => nome === "spec.md"),
        )
    : [];

  return [
    ...abertas,
    ...arquivosEm(join(raiz, "openspec", "specs"), (nome) => nome === "spec.md"),
  ];
}

function nomesDeTeste(): string[] {
  const eTeste = (nome: string) => /\.test\.tsx?$/.test(nome);
  const arquivos = ["lib", "app", "components"].flatMap((pasta) =>
    arquivosEm(join(raiz, pasta), eTeste),
  );

  return arquivos.flatMap((arquivo) =>
    [...readFileSync(arquivo, "utf8").matchAll(/\btest\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );
}

describe("Cobertura da spec", () => {
  test("Todo cenário da spec tem um teste que o nomeia", () => {
    const specs = arquivosDeSpec();
    expect(specs.length).toBeGreaterThan(0);

    const cenarios = specs.flatMap((arquivo) =>
      [...readFileSync(arquivo, "utf8").matchAll(/^#### Scenario:\s*(.+)$/gm)].map(
        (match) => match[1].trim(),
      ),
    );
    expect(cenarios.length).toBeGreaterThan(0);

    const testes = new Set(nomesDeTeste());
    const semTeste = [...new Set(cenarios.filter((cenario) => !testes.has(cenario)))];

    expect(semTeste).toEqual([]);
  });
});
