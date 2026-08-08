import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { ordemDaIa, traducaoParaIngles } from "@/fixtures/ai-responses";
import { importedResume, minimalResume } from "@/fixtures/resumes";
import type { AiClient, StructuredRequest } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/client";
import { toResumeOrder } from "@/lib/ai/organize-content";
import { generateFinal, type Patch } from "@/lib/resume/generate";
import { jobBulletPath } from "@/lib/resume/paths";
import type { Resume } from "@/lib/resume/schema";
import { buildDocx } from "./docx";
import { exportResume } from "./export";
import { resumeFileName, slug, zipFileName } from "./filename";
import {
  BULLET,
  ENTRELINHA,
  ESPACO,
  FAMILIA,
  MARGEM,
  TAMANHO,
  emLinhasDocx,
  emTwips,
} from "./typography";
import { buildPdf } from "./pdf";

/**
 * A verificação é por REABERTURA: o DOCX volta por `mammoth` e o PDF por `pdfjs-dist`,
 * os mesmos parsers da importação. Um PDF sem texto selecionável falha aqui exatamente
 * como falharia num ATS.
 */

// ── Reabertura ──────────────────────────────────────────────────────────────────

async function textoDoDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
  return value;
}

/** O XML interno, para o que o mammoth não mostra: tabela, caixa de texto, coluna. */
async function documentXml(bytes: Uint8Array): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  return await zip.file("word/document.xml")!.async("string");
}

/** Os estilos do DOCX, onde mora a tipografia que o Word aplica. */
async function stylesXml(bytes: Uint8Array): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  return await zip.file("word/styles.xml")!.async("string");
}

/** A numeração do DOCX, onde moram a marca e o recuo do bullet. */
async function numberingXml(bytes: Uint8Array): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  return await zip.file("word/numbering.xml")!.async("string");
}

/** O tamanho em pontos de um estilo do DOCX, lido em meios-pontos. */
function tamanhoDoEstilo(xml: string, styleId: string): number {
  const estilo = new RegExp(
    `<w:style [^>]*w:styleId="${styleId}"[\\s\\S]*?</w:style>`,
  ).exec(xml)?.[0];
  const meiosPontos = /<w:sz w:val="(\d+)"/.exec(estilo ?? "")?.[1];
  return Number(meiosPontos) / 2;
}

/**
 * O tamanho de cada trecho do PDF, pelo mesmo extrator que a importação usa — a altura
 * do item é a do corpo da fonte.
 */
async function tamanhosDoPdf(bytes: Uint8Array): Promise<Map<string, number>> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const porTexto = new Map<string, number>();
  for (const item of content.items) {
    if (!("str" in item) || item.str.trim().length === 0) continue;
    porTexto.set(item.str.trim(), Math.round(item.height * 10) / 10);
  }
  return porTexto;
}

/**
 * Cada trecho do PDF com o que distingue peso e posição: `fontName` é o recurso de fonte
 * que o item usa — dois pesos da mesma família são dois recursos —, e `x` é onde ele
 * começa na página, que é o que revela margem e recuo.
 */
async function itensDoPdf(
  bytes: Uint8Array,
): Promise<{ str: string; fontName: string; x: number }[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const content = await (await doc.getPage(1)).getTextContent();

  return content.items.flatMap((item) =>
    "str" in item && item.str.trim().length > 0
      ? [
          {
            str: item.str.trim(),
            fontName: item.fontName,
            x: Math.round(item.transform[4] * 10) / 10,
          },
        ]
      : [],
  );
}

/** O primeiro item cujo texto começa pelo trecho pedido. */
function itemQueComeca(
  itens: { str: string; fontName: string; x: number }[],
  inicio: string,
) {
  const achado = itens.find((item) => item.str.startsWith(inicio));
  if (!achado) throw new Error(`Trecho não encontrado no PDF: ${inicio}`);
  return achado;
}

async function textoDoPdf(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;

  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    paginas.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return paginas.join("\n");
}

// ── Cliente de IA gravado ───────────────────────────────────────────────────────

/**
 * A exportação faz duas chamadas diferentes (ordem e tradução) com o mesmo cliente.
 * Este mock responde pela forma do pedido e conta quantas vezes cada uma aconteceu.
 *
 * A tradução é montada sobre o currículo **final** — depois dos patches e da ordem —,
 * porque é sobre ele que a tradução acontece de verdade. Montá-la sobre o currículo de
 * entrada faz a verificação de estrutura recusar a resposta, e com razão: a ordem dos
 * bullets já não seria a mesma.
 */
function clienteDaExportacao(
  resume: Resume,
  patches: readonly Patch[] = [],
  traducaoFalha = false,
) {
  const chamadas = { ordem: 0, traducao: 0 };
  const final = generateFinal(resume, patches, toResumeOrder(resume, ordemDaIa(resume))!);

  const client: AiClient = {
    async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
      if (request.system.includes("organiza a ordem")) {
        chamadas.ordem += 1;
        return request.validate.parse(ordemDaIa(resume));
      }

      chamadas.traducao += 1;
      // O idioma pedido está no system: "português" só aparece quando o alvo é pt.
      const alvoEhPortugues = request.system.includes("para português");

      // A falha é do inglês: o português não depende de tradução para sair.
      if (traducaoFalha && !alvoEhPortugues) {
        throw new AiError("call-failed", "A chamada ao modelo falhou: tempo esgotado.");
      }

      // O currículo está em português: pedir pt devolve o original, pedir en traduz.
      return request.validate.parse({ ...traducaoParaIngles(final), language: "pt" });
    },
  };

  return { client, chamadas };
}

const exportar = (
  locales: ("pt" | "en")[],
  formats: ("docx" | "pdf")[],
  resume = importedResume,
  falha = false,
) => {
  const { client, chamadas } = clienteDaExportacao(resume, [], falha);
  return exportResume({ resume, patches: [], locales, formats }, { client }).then(
    (resultado) => ({ resultado, chamadas }),
  );
};

// ── DOCX ────────────────────────────────────────────────────────────────────────

describe("DOCX no modelo padrão", () => {
  test("Títulos de seção usam estilo nativo", async () => {
    const html = await textoDoDocx(await buildDocx(importedResume, "pt"));

    // `mammoth` mapeia estilo de título para <h1>/<h2>; negrito solto viraria <strong>.
    expect(html).toContain("<h1>EXPERIÊNCIA PROFISSIONAL</h1>");
    expect(html).toMatch(/<h1>(Marina Alencar|RESUMO PROFISSIONAL)<\/h1>/);
  });

  test("O DOCX declara o próprio espaçamento", async () => {
    const xml = await documentXml(await buildDocx(importedResume, "pt"));

    const paragrafos = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    expect(paragrafos.length).toBeGreaterThan(5);

    for (const paragrafo of paragrafos) {
      // Todo parágrafo diz o próprio espaçamento: nada fica a cargo do editor.
      expect(paragrafo).toContain("<w:spacing ");
      expect(paragrafo).toContain(`w:line="${emLinhasDocx(ENTRELINHA)}"`);
    }

    // E a escala é a do módulo, em twips.
    expect(xml).toContain(`w:before="${emTwips(ESPACO.secao)}"`);
    expect(xml).toContain(`w:after="${emTwips(ESPACO.linha)}"`);
  });

  test("Os dois formatos leem a mesma escala", async () => {
    const fonteDoPdf = readFileSync(join(process.cwd(), "lib/export/pdf.ts"), "utf8");
    const fonteDoDocx = readFileSync(join(process.cwd(), "lib/export/docx.ts"), "utf8");

    // Nenhum gerador define escala própria: os dois importam a do módulo comum.
    for (const [nome, fonte] of [
      ["pdf.ts", fonteDoPdf],
      ["docx.ts", fonteDoDocx],
    ] as const) {
      expect(fonte, nome).toMatch(/ESPACO[^=]*from "\.\/typography"|ESPACO,/);
      expect(fonte, nome).not.toMatch(/const ESPACO\s*=/);
      expect(fonte, nome).not.toMatch(/lineHeight:\s*[\d.]+/);
    }
  });

  test("DOCX não contém tabela", async () => {
    const xml = await documentXml(await buildDocx(importedResume, "pt"));

    expect(xml).not.toContain("<w:tbl>");
    expect(xml).not.toContain("<w:tblPr>");
  });

  test("DOCX não contém caixa de texto nem coluna", async () => {
    const xml = await documentXml(await buildDocx(importedResume, "pt"));

    expect(xml).not.toContain("w:txbxContent");
    expect(xml).not.toContain("<w:cols w:num=");
  });

  test("Estilo nativo não impõe a tipografia do tema", async () => {
    const estilos = await stylesXml(await buildDocx(importedResume, "pt"));

    // O que quebrava: `HeadingLevel` trazia família, corpo e cor do tema do Word, e o
    // documento saía com duas fontes — uma delas azul.
    for (const styleId of ["Title", "Heading1"]) {
      const estilo = new RegExp(
        `<w:style [^>]*w:styleId="${styleId}"[\\s\\S]*?</w:style>`,
      ).exec(estilos)?.[0];

      expect(estilo, styleId).toBeTruthy();
      expect(estilo, styleId).toContain(`w:ascii="${FAMILIA.docx}"`);
      expect(estilo, styleId).toMatch(/<w:sz w:val="\d+"/);
    }
  });

  test("Todo o conteúdo aparece no DOCX", async () => {
    const html = await textoDoDocx(await buildDocx(importedResume, "pt"));

    for (const trecho of [
      importedResume.header.name,
      ...importedResume.header.contact,
      importedResume.summary!.text,
      importedResume.skills!.text,
      "Fintech Kobo",
      "Banco Órion",
      "Liderei a migração da plataforma de pagamentos.",
      "Universidade Federal do ABC",
    ]) {
      expect(html, trecho).toContain(trecho);
    }
  });

  test("Seção ausente não vira título vazio", async () => {
    // `minimalResume` não tem resumo, formação nem habilidades.
    const html = await textoDoDocx(await buildDocx(minimalResume, "pt"));

    expect(html).not.toContain("RESUMO PROFISSIONAL");
    expect(html).not.toContain("HABILIDADES");
    expect(html).not.toContain("FORMAÇÃO ACADÊMICA");
    expect(html).toContain("Cooperativa Sul");
  });
});

describe("Tipografia comum às duas saídas", () => {
  test("O tamanho de cada elemento é o mesmo nos dois formatos", async () => {
    const estilos = await stylesXml(await buildDocx(importedResume, "pt"));
    const noPdf = await tamanhosDoPdf(await buildPdf(importedResume, "pt"));

    // O mesmo currículo em dois formatos é o mesmo documento, não dois.
    expect(tamanhoDoEstilo(estilos, "Title")).toBe(TAMANHO.nome);
    expect(noPdf.get("Marina Alencar")).toBe(TAMANHO.nome);

    expect(tamanhoDoEstilo(estilos, "Heading1")).toBe(TAMANHO.secao);
    expect(noPdf.get("EXPERIÊNCIA PROFISSIONAL")).toBe(TAMANHO.secao);

    expect(/<w:sz w:val="(\d+)"/.exec(estilos)).toBeTruthy();
    expect(noPdf.get("01/2025 – atual")).toBe(TAMANHO.corpo);
  });

  test("Uma única família de fonte por documento", async () => {
    const estilos = await stylesXml(await buildDocx(importedResume, "pt"));

    // Toda declaração de fonte do DOCX aponta para a mesma família.
    const familias = new Set(
      [...estilos.matchAll(/w:ascii="([^"]+)"/g)].map((achado) => achado[1]),
    );
    expect([...familias]).toEqual([FAMILIA.docx]);

    // No PDF, uma família só chega ao arquivo. O sufixo de peso sai antes da conta:
    // `Helvetica-Bold` é a mesma família num peso diferente, não uma segunda fonte — o
    // que esta cena proíbe é corpo numa família e título em outra.
    const pdf = Buffer.from(await buildPdf(importedResume, "pt")).toString("latin1");
    const baseFonts = new Set(
      [...pdf.matchAll(/BaseFont\s*\/([A-Za-z-]+)/g)].map((achado) =>
        achado[1].replace(/-(Bold|Oblique|BoldOblique)$/, ""),
      ),
    );
    expect([...baseFonts]).toEqual([FAMILIA.pdf]);
  });

  test("O peso de cada elemento é o mesmo nos dois formatos", async () => {
    const docx = await buildDocx(importedResume, "pt");
    const estilos = await stylesXml(docx);
    const xml = await documentXml(docx);
    const itens = await itensDoPdf(await buildPdf(importedResume, "pt"));

    // No DOCX o negrito do nome e do título de seção vem do estilo…
    for (const styleId of ["Title", "Heading1"]) {
      const estilo = new RegExp(
        `<w:style [^>]*w:styleId="${styleId}"[\\s\\S]*?</w:style>`,
      ).exec(estilos)?.[0];
      expect(estilo, styleId).toContain("<w:b/>");
    }

    // …e o do cargo, do próprio trecho. O período, logo abaixo, não é negrito.
    const paragrafoDoCargo = /<w:p\b(?:(?!<\/w:p>)[\s\S])*Tech Lead[\s\S]*?<\/w:p>/.exec(
      xml,
    )?.[0];
    expect(paragrafoDoCargo).toContain("<w:b/>");

    const paragrafoDoPeriodo =
      /<w:p\b(?:(?!<\/w:p>)[\s\S])*01\/2025 – atual[\s\S]*?<\/w:p>/.exec(xml)?.[0];
    expect(paragrafoDoPeriodo).not.toContain("<w:b/>");

    // No PDF, peso é recurso de fonte: nome, seção e cargo compartilham o mesmo, e o
    // corpo e o contato usam outro.
    const negrito = itemQueComeca(itens, "Marina Alencar").fontName;
    for (const inicio of ["EXPERIÊNCIA PROFISSIONAL", "Tech Lead"]) {
      expect(itemQueComeca(itens, inicio).fontName, inicio).toBe(negrito);
    }
    for (const inicio of ["01/2025 – atual", "marina.alencar@email.com"]) {
      expect(itemQueComeca(itens, inicio).fontName, inicio).not.toBe(negrito);
    }
  });

  test("A largura da coluna de texto é a mesma nos dois formatos", async () => {
    const xml = await documentXml(await buildDocx(importedResume, "pt"));
    const itens = await itensDoPdf(await buildPdf(importedResume, "pt"));

    // O DOCX declara a margem em vez de herdar a da biblioteca…
    const margem = /<w:pgMar[^>]*>/.exec(xml)?.[0];
    expect(margem).toContain(`w:left="${emTwips(MARGEM)}"`);
    expect(margem).toContain(`w:right="${emTwips(MARGEM)}"`);

    // …e no PDF o texto começa nessa mesma margem.
    expect(itemQueComeca(itens, "Marina Alencar").x).toBe(MARGEM);
    expect(itemQueComeca(itens, "01/2025 – atual").x).toBe(MARGEM);
  });

  test("O bullet tem a mesma marca e o mesmo recuo nos dois formatos", async () => {
    const docx = await buildDocx(importedResume, "pt");
    const xml = await documentXml(docx);
    const numeracao = await numberingXml(docx);
    const itens = await itensDoPdf(await buildPdf(importedResume, "pt"));

    // A numeração que os parágrafos apontam é a que traz a marca e o recuo do módulo —
    // e não a `●` que a biblioteca define por padrão, que o PDF não desenha.
    const numId = /<w:numId w:val="(\d+)"/.exec(xml)?.[1];
    const abstractId = new RegExp(
      `<w:num w:numId="${numId}"[^>]*>\\s*<w:abstractNumId w:val="(\\d+)"`,
    ).exec(numeracao)?.[1];
    const nivel = new RegExp(
      `<w:abstractNum w:abstractNumId="${abstractId}"[\\s\\S]*?<w:lvl w:ilvl="0"[^>]*>([\\s\\S]*?)</w:lvl>`,
    ).exec(numeracao)?.[1];

    expect(nivel).toContain(`<w:lvlText w:val="${BULLET.marca}"/>`);
    expect(nivel).toContain(`w:left="${emTwips(BULLET.recuo)}"`);
    expect(nivel).toContain(`w:hanging="${emTwips(BULLET.deslocamento)}"`);

    // No PDF a marca é a mesma, e cai no mesmo lugar: a marca em `recuo - deslocamento`
    // e o texto em `recuo`, os dois a partir da margem.
    const marca = itens.find((item) => item.str === BULLET.marca);
    expect(marca).toBeTruthy();
    expect(marca!.x).toBe(MARGEM + BULLET.recuo - BULLET.deslocamento);
    expect(itemQueComeca(itens, "Liderei a migração").x).toBe(MARGEM + BULLET.recuo);
  });

  test("Nenhuma cor de tema nos títulos", async () => {
    const estilos = await stylesXml(await buildDocx(importedResume, "pt"));

    // 2E74B5 é o azul que o estilo nativo do Word trazia sozinho, em qualquer nível.
    expect(estilos).not.toContain("2E74B5");

    const deTitulo = [
      ...estilos.matchAll(
        new RegExp(
          '<w:style [^>]*w:styleId="(Title|Heading\\d)"[\\s\\S]*?</w:style>',
          "g",
        ),
      ),
    ];
    expect(deTitulo.length).toBeGreaterThanOrEqual(2);

    for (const [estilo, styleId] of deTitulo.map(
      (achado) => [achado[0], achado[1]] as const,
    )) {
      const cor = /<w:color w:val="([^"]+)"/.exec(estilo)?.[1].toLowerCase();
      expect(cor, styleId).toBe("111111");
    }
  });

  test("O nome não domina a página", async () => {
    const noPdf = await tamanhosDoPdf(await buildPdf(importedResume, "pt"));
    const nome = noPdf.get("Marina Alencar")!;
    const corpo = noPdf.get("01/2025 – atual")!;

    expect(nome).toBeGreaterThan(corpo);
    expect(nome).toBeLessThan(corpo * 2);

    // Uma linha só: o nome inteiro sai num item de texto, sem quebra.
    expect(noPdf.has("Marina Alencar")).toBe(true);
  });
});

describe("Data no formato do idioma da saída", () => {
  test("Arquivo em português traz data numérica", async () => {
    const html = await textoDoDocx(await buildDocx(importedResume, "pt"));

    expect(html).toContain("03/2022 – 12/2024");
  });

  test("Arquivo em inglês traz mês abreviado", async () => {
    const html = await textoDoDocx(await buildDocx(importedResume, "en"));

    expect(html).toContain("Mar 2022 – Dec 2024");
    expect(html).not.toContain("03/2022 – 12/2024");
  });
});

// ── PDF ─────────────────────────────────────────────────────────────────────────

describe("PDF com texto selecionável", () => {
  test("Texto do PDF é extraível", async () => {
    const texto = await textoDoPdf(await buildPdf(importedResume, "pt"));

    expect(texto).toContain("Marina Alencar");
    expect(texto).toContain("Fintech Kobo");
    expect(texto).toContain("Liderei a migração");
  });

  test("PDF não é imagem", async () => {
    const texto = await textoDoPdf(await buildPdf(importedResume, "pt"));

    expect(texto.trim().length).toBeGreaterThan(200);
  });

  test("Todo o conteúdo aparece no PDF", async () => {
    const texto = await textoDoPdf(await buildPdf(importedResume, "pt"));

    for (const trecho of ["Marina Alencar", "Banco Órion", "Tech Lead", "Insper"]) {
      expect(texto, trecho).toContain(trecho);
    }
  });
});

// ── Nome de arquivo ─────────────────────────────────────────────────────────────

describe("Nome de arquivo padronizado", () => {
  test("Nome é derivado da pessoa e do idioma", () => {
    expect(resumeFileName("Marina Alencar", "pt", "docx")).toBe(
      "curriculo-marina-alencar-pt.docx",
    );
    expect(resumeFileName("Marina Alencar", "en", "docx")).toBe(
      "resume-marina-alencar-en.docx",
    );
  });

  test("Acento e espaço não sobrevivem ao nome", () => {
    const nome = resumeFileName("José da Silva Ávila", "pt", "pdf");

    expect(nome).toBe("curriculo-jose-da-silva-avila-pt.pdf");
    expect(nome).toMatch(/^[a-z0-9.-]+$/);
  });

  test("Nome vazio não produz arquivo sem identificação", () => {
    expect(resumeFileName("", "pt", "docx")).toBe("curriculo-pt.docx");
    expect(zipFileName("")).toBe("curriculo.zip");
    expect(slug("   ")).toBe("");
  });
});

// ── Orquestração ────────────────────────────────────────────────────────────────

describe("Empacotamento das saídas marcadas", () => {
  test("Várias saídas viram um zip", async () => {
    const { resultado } = await exportar(["pt", "en"], ["docx", "pdf"]);

    expect(resultado.files).toHaveLength(4);
    expect(resultado.download?.contentType).toBe("application/zip");

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(resultado.download!.bytes);
    expect(Object.keys(zip.files).sort()).toEqual([
      "curriculo-marina-alencar-pt.docx",
      "curriculo-marina-alencar-pt.pdf",
      "resume-marina-alencar-en.docx",
      "resume-marina-alencar-en.pdf",
    ]);
  });

  test("Saída única não é compactada", async () => {
    const { resultado } = await exportar(["pt"], ["pdf"]);

    expect(resultado.files).toHaveLength(1);
    expect(resultado.download?.contentType).toBe("application/pdf");
    expect(resultado.download?.name).toBe("curriculo-marina-alencar-pt.pdf");
  });

  test("Nenhuma saída marcada não gera arquivo", async () => {
    const { resultado, chamadas } = await exportar([], ["pdf"]);

    expect(resultado.files).toEqual([]);
    expect(resultado.download).toBeNull();
    // Sem saída marcada, nem a organização é pedida.
    expect(chamadas.ordem).toBe(0);
  });
});

describe("Ordem e tradução obtidas uma vez por exportação", () => {
  test("Uma ordem serve todas as saídas", async () => {
    const { resultado, chamadas } = await exportar(["pt", "en"], ["docx", "pdf"]);

    expect(chamadas.ordem).toBe(1);
    expect(resultado.files).toHaveLength(4);
  });

  test("Uma tradução serve os dois formatos", async () => {
    const { chamadas } = await exportar(["en"], ["docx", "pdf"]);

    expect(chamadas.traducao).toBe(1);
  });

  test("Idioma do currículo não é traduzido", async () => {
    const { resultado } = await exportar(["pt"], ["docx"]);
    const html = await textoDoDocx(resultado.files[0].bytes);

    // O currículo está em português: o texto sai como o usuário escreveu.
    expect(html).toContain("Liderei a migração da plataforma de pagamentos.");
  });
});

describe("Aplicação das sugestões marcadas na exportação", () => {
  const kobo = importedResume.jobs[0];
  const marcada = {
    path: jobBulletPath(kobo.id, kobo.bullets[0].id),
    text: "Liderei a migração da plataforma de pagamentos, reduzindo a latência em 77%.",
  };

  test("Sugestão marcada aparece no arquivo", async () => {
    const { client } = clienteDaExportacao(importedResume, [marcada]);
    const resultado = await exportResume(
      { resume: importedResume, patches: [marcada], locales: ["pt"], formats: ["docx"] },
      { client },
    );

    const html = await textoDoDocx(resultado.files[0].bytes);
    expect(html).toContain("reduzindo a latência em 77%");
    expect(html).not.toContain("Liderei a migração da plataforma de pagamentos.</p>");
  });

  test("Sugestão não marcada não aparece no arquivo", async () => {
    const { resultado } = await exportar(["pt"], ["docx"]);

    const html = await textoDoDocx(resultado.files[0].bytes);
    expect(html).not.toContain("reduzindo a latência em 77%");
    expect(html).toContain("Liderei a migração da plataforma de pagamentos.");
  });
});

describe("Falha por saída, não por lote", () => {
  test("Falha de tradução não derruba o outro idioma", async () => {
    // A tradução falha; o português não depende dela.
    const { resultado } = await exportar(["pt", "en"], ["docx"], importedResume, true);

    expect(resultado.files).toHaveLength(1);
    expect(resultado.files[0].name).toContain("-pt.docx");
    expect(resultado.failures).toEqual([{ locale: "en", reason: "AiError" }]);
  });

  test("Falha de todas as saídas não devolve arquivo vazio", async () => {
    const { resultado } = await exportar(["en"], ["docx", "pdf"], importedResume, true);

    expect(resultado.files).toEqual([]);
    expect(resultado.download).toBeNull();
    expect(resultado.failures).toHaveLength(1);
  });
});

describe("Nada é persistido na exportação", () => {
  test("Nenhum conteúdo de currículo em log na exportação", async () => {
    const registros: unknown[][] = [];
    vi.spyOn(console, "warn").mockImplementation((...args) => registros.push(args));
    vi.spyOn(console, "error").mockImplementation((...args) => registros.push(args));

    await exportar(["en"], ["docx"], importedResume, true);

    const registrado = JSON.stringify(registros);
    for (const conteudo of ["Marina Alencar", "Fintech Kobo", "Liderei"]) {
      expect(registrado, conteudo).not.toContain(conteudo);
    }
    vi.restoreAllMocks();
  });
});

describe("Testes de exportação sem a IA real", () => {
  test("Nenhuma chamada real de exportação na suíte", async () => {
    // Desliga a cadeia de provedores inteira: com IA nenhuma configurada, qualquer
    // chamada falha antes de sair da máquina — e o teste não precisa saber quais
    // provedores existem hoje.
    vi.stubEnv("AI_PROVIDERS", "none");

    // Sem cliente injetado, a organização cai no recurso e a tradução falha por
    // credencial: nenhuma das duas alcança a API.
    const resultado = await exportResume({
      resume: importedResume,
      patches: [],
      locales: ["en"],
      formats: ["docx"],
    });

    expect(resultado.failures).toEqual([{ locale: "en", reason: "AiError" }]);
    vi.unstubAllEnvs();
  });
});
