import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ImportError, MAX_FILE_BYTES } from "./blocks";
import { detectFormat, extract } from "./detect";

const fixture = (nome: string) =>
  new Uint8Array(readFileSync(join(process.cwd(), "fixtures", "files", nome)));

describe("Arquivos que não podem ser processados", () => {
  test("Formato não suportado", async () => {
    await expect(extract(fixture("curriculo.odt"), "curriculo.odt")).rejects.toThrow(
      ImportError,
    );
    await expect(
      extract(fixture("curriculo.odt"), "curriculo.odt"),
    ).rejects.toMatchObject({ reason: "unsupported-format" });
    // O erro identifica o formato recebido.
    await expect(extract(fixture("curriculo.odt"), "curriculo.odt")).rejects.toThrow(
      /\.odt/,
    );
  });

  test("Arquivo corrompido", async () => {
    // O PDF corrompido tem o magic certo, então chega na extração e falha lá.
    await expect(
      extract(fixture("corrompido.pdf"), "corrompido.pdf"),
    ).rejects.toMatchObject({ reason: "corrupted-file" });
  });

  test("PDF sem camada de texto", async () => {
    await expect(
      extract(fixture("curriculo-digitalizado.pdf"), "digitalizado.pdf"),
    ).rejects.toMatchObject({ reason: "pdf-without-text-layer" });
  });

  test("Arquivo grande demais", async () => {
    const grande = new Uint8Array(120);

    await expect(extract(grande, "curriculo.pdf", 100)).rejects.toMatchObject({
      reason: "file-too-large",
    });
    // A checagem vem antes de olhar o conteúdo: bytes sem formato nenhum ainda assim
    // falham por tamanho, não por formato.
    await expect(extract(grande, "curriculo.pdf", 100)).rejects.toThrow(/limite/);
  });

  test("Extensão não decide o formato", () => {
    // Conteúdo de PDF com nome de DOCX continua sendo PDF.
    expect(detectFormat(fixture("curriculo-completo.pdf"), "curriculo.docx")).toBe("pdf");
    // E o contrário também.
    expect(detectFormat(fixture("curriculo-completo.docx"), "curriculo.pdf")).toBe(
      "docx",
    );
  });

  test("DOCX corrompido não passa por DOCX", () => {
    // "PK isto não é um docx" não tem o magic de zip completo.
    expect(() => detectFormat(fixture("corrompido.docx"), "corrompido.docx")).toThrow(
      ImportError,
    );
  });

  test("O limite padrão é generoso para um documento de texto", () => {
    expect(MAX_FILE_BYTES).toBeGreaterThanOrEqual(5 * 1024 * 1024);
  });
});

describe("Extração determinística", () => {
  test("Mesma entrada, mesmo texto extraído", async () => {
    for (const nome of [
      "curriculo-completo.docx",
      "curriculo-completo.pdf",
      "curriculo-duas-colunas.pdf",
      "curriculo-duas-paginas.pdf",
    ]) {
      const primeira = await extract(fixture(nome), nome);
      const segunda = await extract(fixture(nome), nome);
      expect(segunda, nome).toEqual(primeira);
    }
  });

  test("DOCX e PDF do mesmo currículo trazem o mesmo conteúdo", async () => {
    const docx = await extract(fixture("curriculo-completo.docx"), "a.docx");
    const pdf = await extract(fixture("curriculo-completo.pdf"), "a.pdf");

    const textoDe = (documento: { blocks: { text: string }[] }) =>
      documento.blocks
        .map((block) => block.text)
        .join(" ")
        .replace(/\s+/g, " ");

    for (const trecho of [
      "Marina Alencar",
      "Tech Lead — Fintech Kobo",
      "Reescrevi o serviço de antifraude.",
      "Universidade Federal do ABC",
      "Go, Python, AWS",
    ]) {
      expect(textoDe(docx), `docx: ${trecho}`).toContain(trecho);
      expect(textoDe(pdf), `pdf: ${trecho}`).toContain(trecho);
    }
  });
});
