import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ImportError, pdfReaderUnavailable } from "./blocks";
import { extractPdf } from "./pdf";

const fixture = (nome: string) =>
  new Uint8Array(readFileSync(join(process.cwd(), "fixtures", "files", nome)));

describe("Extração de PDF", () => {
  test("Linhas são reconstruídas pela posição", async () => {
    const { blocks } = await extractPdf(fixture("curriculo-completo.pdf"));
    const textos = blocks.map((block) => block.text);

    // Cada uma destas linhas chega do pdfjs partida em vários fragmentos: a
    // reconstrução tem de devolvê-las inteiras, com um espaço em cada junção e
    // nenhum a mais. O contato vem em três linhas separadas no arquivo.
    for (const esperada of [
      "Marina Alencar",
      "Engenheira de Software",
      "marina.alencar@email.com",
      "(11) 98888-1234",
      "São Paulo, SP",
      "Experiência profissional",
      "Tech Lead — Fintech Kobo",
      "01/2025 – atual",
      "Go, Python, AWS, Kubernetes, PostgreSQL, Kafka, Terraform",
    ]) {
      expect(textos, esperada).toContain(esperada);
    }

    for (const texto of textos) {
      expect(texto, texto).not.toMatch(/ {2}/);
      expect(texto, texto).toBe(texto.trim());
    }
  });

  test("Marcadores de lista são reconhecidos", async () => {
    const { blocks } = await extractPdf(fixture("curriculo-completo.pdf"));

    const listItems = blocks.filter((block) => block.kind === "listItem");
    expect(listItems.length).toBeGreaterThanOrEqual(5);
    expect(listItems.map((block) => block.text)).toContain(
      "Liderei a migração da plataforma de pagamentos.",
    );
    // O marcador não sobrevive no texto.
    for (const item of listItems) {
      expect(item.text, item.text).not.toMatch(/^[•▪◦‣·・●○*\-–—]/);
    }
  });

  test("Páginas são unidas na ordem", async () => {
    const { blocks, pages } = await extractPdf(fixture("curriculo-duas-paginas.pdf"));

    expect(pages).toBe(2);
    const paginas = blocks.map((block) => block.page);
    expect(new Set(paginas)).toEqual(new Set([1, 2]));
    // A ordem das páginas é crescente ao longo dos blocos.
    expect([...paginas].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(paginas);
  });

  test("Mesma entrada, mesmo texto extraído", async () => {
    const primeira = await extractPdf(fixture("curriculo-completo.pdf"));
    const segunda = await extractPdf(fixture("curriculo-completo.pdf"));

    expect(segunda).toEqual(primeira);
  });

  test("PDF sem camada de texto", async () => {
    await expect(extractPdf(fixture("curriculo-digitalizado.pdf"))).rejects.toThrow(
      ImportError,
    );
    await expect(extractPdf(fixture("curriculo-digitalizado.pdf"))).rejects.toMatchObject(
      {
        reason: "pdf-without-text-layer",
      },
    );
  });

  test("Arquivo corrompido", async () => {
    await expect(extractPdf(fixture("corrompido.pdf"))).rejects.toMatchObject({
      reason: "corrupted-file",
    });
  });
});

describe("A extração de PDF funciona no servidor em execução", () => {
  test("A dependência que lê PDF é declarada externa", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    // Sem isto, o empacotador reescreve o caminho do worker do pdfjs e TODO PDF passa
    // a ser recusado — foi o que aconteceu, e não há teste de unidade que perceba,
    // porque em teste o módulo resolve normalmente.
    expect(config).toMatch(/serverExternalPackages/);
    expect(config).toMatch(/["']pdfjs-dist["']/);
  });

  test("Falha de worker não é atribuída ao arquivo do usuário", () => {
    // A mensagem real do pdfjs quando o worker não é encontrado.
    const erro = pdfReaderUnavailable(
      `Setting up fake worker failed: "Cannot find module '.next/chunks/pdf.worker.mjs'".`,
    );

    expect(erro.reason).toBe("pdf-reader-unavailable");
    expect(erro.reason).not.toBe("corrupted-file");
    // O usuário não pode ler que o arquivo dele está corrompido por um defeito nosso.
    expect(erro.message).not.toMatch(/corromp/i);
    expect(erro.detail?.cause).toMatch(/worker/);
  });
});

describe("Ordem de leitura em layout de múltiplas colunas", () => {
  test("Currículo em duas colunas é detectado", async () => {
    const { blocks, layout } = await extractPdf(fixture("curriculo-duas-colunas.pdf"));

    expect(layout).toEqual({ kind: "multi-column", columns: 2 });
    expect(new Set(blocks.map((block) => block.column))).toEqual(new Set([0, 1]));
  });

  test("Colunas não são intercaladas", async () => {
    const { blocks } = await extractPdf(fixture("curriculo-duas-colunas.pdf"));

    // O que quebraria: nome do currículo colado num título de seção da outra coluna,
    // ou habilidade colada num bullet de experiência.
    for (const block of blocks) {
      expect(block.text, block.text).not.toMatch(/Marina Alencar\s+Experiência/);
      expect(block.text, block.text).not.toMatch(/Terraform\s+•?\s*Conduzi/);
      expect(block.text, block.text).not.toMatch(/Habilidades\s+•/);
    }

    // Cada bloco pertence a uma coluna só, e os blocos saem agrupados por coluna.
    const colunas = blocks.map((block) => block.column);
    expect([...colunas].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(colunas);
  });

  test("Coluna única não é sinalizada", async () => {
    const { blocks, layout } = await extractPdf(fixture("curriculo-completo.pdf"));

    expect(layout).toEqual({ kind: "single-column" });
    expect(blocks.every((block) => block.column === undefined)).toBe(true);
  });

  test("Conteúdo de todas as colunas é preservado", async () => {
    const { blocks } = await extractPdf(fixture("curriculo-duas-colunas.pdf"));
    const tudo = blocks.map((block) => block.text).join("\n");

    // Coluna da esquerda.
    expect(tudo).toContain("Go, Python, AWS");
    expect(tudo).toContain("Insper");
    expect(tudo).toContain("Universidade Federal do ABC");
    // Coluna da direita.
    expect(tudo).toContain("Liderei a migração da plataforma de");
    expect(tudo).toContain("Banco Órion");
    expect(tudo).toContain("01/2025 – atual");
  });
});
