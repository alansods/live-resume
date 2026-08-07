import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * O que se pode afirmar sobre a fumaça sem rodá-la.
 *
 * Este arquivo **lê** o script; nunca o executa. Executá-lo aqui gastaria cota, dependeria
 * de rede e quebraria a regra que torna a fumaça necessária: a suíte não chama a API do
 * modelo. O que dá para garantir por teste é que ela existe, que percorre o fluxo inteiro e
 * que diz o que custa.
 */

const raiz = process.cwd();

/** Todo arquivo de teste do projeto. */
function arquivosDeTeste(): string[] {
  const encontrados: string[] = [];
  const varrer = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) varrer(caminho);
      else if (/\.test\.tsx?$/.test(entrada.name)) encontrados.push(caminho);
    }
  };
  for (const pasta of ["lib", "app", "components"]) varrer(join(raiz, pasta));
  return encontrados;
}
const script = readFileSync(join(raiz, "scripts", "smoke.mjs"), "utf8");
const pacote = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("Verificação de fumaça contra a API real", () => {
  test("A verificação de fumaça existe e é acionável", () => {
    expect(pacote.scripts.smoke).toContain("scripts/smoke.mjs");

    // Percorre o fluxo inteiro: as três rotas de IA e a exportação.
    for (const rota of [
      "/api/resume-import",
      "/api/suggestions/metrics",
      "/api/suggestions/ats",
      "/api/export",
    ]) {
      expect(script, rota).toContain(rota);
    }

    // E falha de verdade: código de saída diferente de zero, com mensagem.
    expect(script).toContain("process.exit(1)");
  });

  test("A fumaça declara o que custa", () => {
    expect(script).toMatch(/4 chamadas ao modelo/);
    expect(script).toMatch(/20 por dia/);
  });
});

describe("A fumaça vive fora da suíte", () => {
  test("A suíte não dispara a fumaça", () => {
    // O comando de teste não a chama...
    expect(pacote.scripts.test).not.toContain("smoke");
    expect(pacote.scripts.smoke).not.toContain("vitest");
    // ...e o script não é coletado pela suíte: não é arquivo de teste.
    expect("scripts/smoke.mjs").not.toMatch(/\.test\.[cm]?[jt]sx?$/);

    // Nenhum teste do projeto importa o módulo de processos — é assim que a suíte não a
    // dispara. (A busca é pelo `import`, e não pelo nome do módulo: este arquivo o cita.)
    // Este arquivo fica de fora da varredura: ele cita o módulo para poder proibi-lo.
    for (const arquivo of arquivosDeTeste().filter((a) => a !== import.meta.filename)) {
      const fonte = readFileSync(arquivo, "utf8");
      expect(fonte, arquivo).not.toMatch(/from "node:child_process"/);
    }
  });
});
