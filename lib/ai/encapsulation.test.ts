import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A trava do desacoplamento.
 *
 * A regra "nenhum arquivo fora de `lib/ai/` importa um SDK de IA" é fácil de escrever
 * num documento e fácil de furar num `git commit` apressado — um `import OpenAI` numa
 * rota resolve o problema do dia e desmonta a camada em silêncio. Aqui ela é
 * verificada, e quebrar custa um teste vermelho na hora.
 */

const RAIZ = join(import.meta.dirname, "..", "..");
const PASTAS = ["app", "lib", "components", "scripts"];

const SDKS = ["openai", "@google/genai", "groq-sdk", "@cerebras/cerebras_cloud_sdk"];

function arquivosDeCodigo(pasta: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules") continue;
      encontrados.push(...arquivosDeCodigo(caminho));
    } else if (/\.(ts|tsx|mjs)$/.test(entrada.name)) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

const TODOS = PASTAS.flatMap((pasta) => arquivosDeCodigo(join(RAIZ, pasta)));

function importa(conteudo: string, modulo: string): boolean {
  const escapado = modulo.replace(/[/@]/g, "\\$&");
  return new RegExp(`(from|import\\()\\s*["']${escapado}["']`).test(conteudo);
}

describe("Nada fora da camada de IA conhece um provedor", () => {
  test("Nada fora da camada de IA importa um SDK de provedor", () => {
    const infratores: string[] = [];

    for (const arquivo of TODOS) {
      const caminho = relative(RAIZ, arquivo);
      if (caminho.startsWith(join("lib", "ai", "providers"))) continue;

      const conteudo = readFileSync(arquivo, "utf8");
      for (const sdk of SDKS) {
        if (importa(conteudo, sdk)) infratores.push(`${caminho} → ${sdk}`);
      }
    }

    expect(infratores).toEqual([]);
  });

  test("Nenhum nome de provedor aparece em regra de negócio ou rota", () => {
    const infratores: string[] = [];

    for (const arquivo of TODOS) {
      const caminho = relative(RAIZ, arquivo);
      if (caminho.startsWith(join("lib", "ai"))) continue;

      const conteudo = readFileSync(arquivo, "utf8");
      // Groq/Cerebras/Gemini como identificador — em comentário é só prosa, e o que
      // importa é que nenhum código dependa de quem respondeu.
      const achados = conteudo
        .split("\n")
        .filter((linha) => !linha.trimStart().startsWith("*"))
        .filter((linha) => !linha.trimStart().startsWith("//"))
        .filter((linha) => /\b(Groq|Cerebras|GoogleGenAI|GEMINI_API_KEY)\b/.test(linha));

      if (achados.length > 0) infratores.push(caminho);
    }

    expect(infratores).toEqual([]);
  });
});
