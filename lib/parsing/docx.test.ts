import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { extractDocx } from "./docx";
import { ImportError } from "./blocks";

const fixture = (nome: string) =>
  readFileSync(join(process.cwd(), "fixtures", "files", nome));

describe("Importação de DOCX", () => {
  test("Itens de lista são preservados como itens", async () => {
    const { blocks } = await extractDocx(fixture("curriculo-completo.docx"));

    const listItems = blocks.filter((block) => block.kind === "listItem");
    expect(listItems.map((block) => block.text)).toContain(
      "Liderei a migração da plataforma de pagamentos.",
    );
    // Sete bullets no currículo de exemplo.
    expect(listItems).toHaveLength(7);

    // E a ordem do documento é preservada.
    const textos = blocks.map((block) => block.text);
    expect(
      textos.indexOf("Liderei a migração da plataforma de pagamentos."),
    ).toBeLessThan(textos.indexOf("Reescrevi o serviço de antifraude."));
  });

  test("Títulos são preservados como títulos", async () => {
    const { blocks } = await extractDocx(fixture("curriculo-completo.docx"));

    const headings = blocks
      .filter((block) => block.kind === "heading")
      .map((block) => block.text);
    expect(headings).toEqual([
      "Resumo",
      "Experiência profissional",
      "Formação",
      "Habilidades",
    ]);
  });

  test("Parágrafo corrido não vira lista", async () => {
    const { blocks } = await extractDocx(fixture("curriculo-paragrafo.docx"));

    expect(blocks.filter((block) => block.kind === "listItem")).toHaveLength(0);
    // O conteúdo continua lá, como parágrafo.
    expect(blocks.some((block) => block.text.includes("antifraude"))).toBe(true);
  });

  test("Soft breaks separam linhas de contato em blocos próprios", async () => {
    const { blocks } = await extractDocx(fixture("curriculo-completo.docx"));
    const textos = blocks.map((block) => block.text);

    // Shift+Enter no DOCX vira `<br>`, e cada segmento precisa sobreviver como bloco
    // separado — é o que impede email, LinkedIn e telefone de colapsarem numa linha.
    for (const linha of [
      "marina.alencar@email.com",
      "(11) 98888-1234",
      "São Paulo, SP",
    ]) {
      expect(textos, linha).toContain(linha);
    }

    // E a ordem entre eles é a do documento.
    expect(textos.indexOf("marina.alencar@email.com")).toBeLessThan(
      textos.indexOf("(11) 98888-1234"),
    );
    expect(textos.indexOf("(11) 98888-1234")).toBeLessThan(
      textos.indexOf("São Paulo, SP"),
    );
  });

  test("Acentuação e caracteres especiais sobrevivem", async () => {
    const { blocks } = await extractDocx(fixture("curriculo-completo.docx"));
    const textos = blocks.map((block) => block.text).join("\n");

    expect(textos).toContain("Experiência profissional");
    expect(textos).toContain("Pós-graduação em Engenharia de Dados");
    expect(textos).toContain("R$ 1,2M/ano");
    // Nenhuma entidade HTML vazando para o texto.
    expect(textos).not.toMatch(/&[a-z]+;/i);
    expect(textos).not.toMatch(/<[a-z]/i);
  });

  test("DOCX é sempre coluna única", async () => {
    const { layout } = await extractDocx(fixture("curriculo-completo.docx"));
    expect(layout).toEqual({ kind: "single-column" });
  });

  test("DOCX corrompido é rejeitado", async () => {
    await expect(extractDocx(fixture("corrompido.docx"))).rejects.toThrow(ImportError);
    await expect(extractDocx(fixture("corrompido.docx"))).rejects.toMatchObject({
      reason: "corrupted-file",
    });
  });

  test("extractRawText não é usado", () => {
    // `extractRawText` perderia a marcação de lista, que é a pista que separa bullet
    // de entrega de linha de endereço.
    const fonte = readFileSync(join(process.cwd(), "lib", "parsing", "docx.ts"), "utf8");
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(semComentarios).not.toContain("extractRawText");
  });
});
