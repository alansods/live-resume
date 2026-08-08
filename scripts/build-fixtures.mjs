/**
 * Gera as fixtures binárias de importação a partir de `fixtures/source/resume-source.mjs`.
 *
 *   npm run fixtures
 *
 * Cada arquivo existe para exercitar um caminho do parsing, e todos são reproduzíveis:
 * rodar de novo produz o mesmo conteúdo.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  education,
  header,
  jobs,
  sectionTitles,
  sectionTitlesEn,
  skills,
  summary,
} from "../fixtures/source/resume-source.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "fixtures", "files");
mkdirSync(destino, { recursive: true });

const escrever = (nome, bytes) => {
  writeFileSync(join(destino, nome), bytes);
  console.log(`  ${nome} — ${bytes.length} bytes`);
};

/**
 * Data fixa em tudo que é gerado.
 *
 * DOCX e PDF carimbam a hora da geração, o que faria cada `npm run fixtures` sujar o
 * diff com arquivos binários "novos" e idênticos por dentro. Com data fixa, rodar o
 * script duas vezes produz os mesmos bytes.
 */
const DATA_FIXA = new Date(Date.UTC(2020, 0, 1));

/** Reescreve o zip do DOCX com datas fixas — inclusive as de dentro do core.xml. */
async function determinizarDocx(buffer) {
  const origem = await JSZip.loadAsync(buffer);
  const saida = new JSZip();
  const carimbo = "2020-01-01T00:00:00Z";

  for (const nome of Object.keys(origem.files).sort()) {
    const entrada = origem.files[nome];
    if (entrada.dir) continue;

    let conteudo = await entrada.async("nodebuffer");
    if (nome === "docProps/core.xml") {
      conteudo = Buffer.from(
        conteudo
          .toString("utf8")
          .replace(/(<dcterms:created[^>]*>)[^<]*(<\/dcterms:created>)/, `$1${carimbo}$2`)
          .replace(
            /(<dcterms:modified[^>]*>)[^<]*(<\/dcterms:modified>)/,
            `$1${carimbo}$2`,
          ),
        "utf8",
      );
    }
    saida.file(nome, conteudo, { date: DATA_FIXA });
  }

  return saida.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

const docx = async (documento) => determinizarDocx(await Packer.toBuffer(documento));

// ── DOCX ────────────────────────────────────────────────────────────────────────

function paragrafo(text, options = {}) {
  return new Paragraph({ children: [new TextRun(text)], ...options });
}

function titulo(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}

/**
 * Parágrafo de contato com soft breaks (Shift+Enter) entre as linhas — exatamente o
 * caso que o parsing precisa reproduzir como blocos separados. O mammoth converte
 * esses breaks em `<br/>`, e o parser os separa.
 */
function paragrafoDeContato() {
  return new Paragraph({
    children: header.contact.map(
      (linha, indice) =>
        new TextRun({ text: linha, break: indice > 0 ? 1 : undefined }),
    ),
  });
}

/** Currículo com as entregas como itens de lista — o caso normal. */
function docxComListas(titles) {
  const filhos = [
    new Paragraph({
      children: [new TextRun({ text: header.name, bold: true, size: 32 })],
    }),
    paragrafo(header.role),
    paragrafoDeContato(),
    titulo(titles.summary),
    paragrafo(summary),
    titulo(titles.experience),
  ];

  for (const job of jobs) {
    filhos.push(
      new Paragraph({
        children: [new TextRun({ text: `${job.role} — ${job.company}`, bold: true })],
      }),
    );
    filhos.push(paragrafo(job.period));
    for (const bullet of job.bullets) {
      filhos.push(paragrafo(bullet, { bullet: { level: 0 } }));
    }
  }

  filhos.push(titulo(titles.education));
  for (const item of education) {
    filhos.push(paragrafo(`${item.course} — ${item.school}`));
    filhos.push(paragrafo(item.period));
  }

  filhos.push(titulo(titles.skills));
  filhos.push(paragrafo(skills));

  return new Document({ sections: [{ children: filhos }] });
}

/** As entregas em parágrafo corrido, sem lista: o parsing não pode inventar bullets. */
function docxSemListas() {
  const filhos = [
    new Paragraph({
      children: [new TextRun({ text: header.name, bold: true, size: 32 })],
    }),
    paragrafoDeContato(),
    titulo(sectionTitles.experience),
  ];

  for (const job of jobs) {
    filhos.push(
      new Paragraph({
        children: [new TextRun({ text: `${job.role} — ${job.company}`, bold: true })],
      }),
    );
    filhos.push(paragrafo(job.period));
    filhos.push(paragrafo(job.bullets.join(" ")));
  }

  return new Document({ sections: [{ children: filhos }] });
}

// ── PDF ─────────────────────────────────────────────────────────────────────────

const A4 = [595.28, 841.89];
const MARGEM = 56;

async function novoPdf() {
  const pdf = await PDFDocument.create();
  // Metadados fixos: sem isso, cada geração produz bytes diferentes.
  pdf.setCreationDate(DATA_FIXA);
  pdf.setModificationDate(DATA_FIXA);
  pdf.setProducer("curriculo-vivo fixtures");
  pdf.setCreator("curriculo-vivo fixtures");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { pdf, regular, negrito };
}

/**
 * Escreve linhas numa coluna, quebrando por largura. Devolve o Y final, para que o
 * chamador saiba quando virar a página.
 */
function escreverLinhas(page, linhas, { x, y, largura, regular, negrito }) {
  let cursor = y;
  for (const linha of linhas) {
    const fonte = linha.bold ? negrito : regular;
    const tamanho = linha.size ?? 10;
    const palavras = linha.text.split(" ");
    let atual = "";

    const emitir = (texto) => {
      page.drawText(texto, {
        x,
        y: cursor,
        size: tamanho,
        font: fonte,
        color: rgb(0, 0, 0),
      });
      cursor -= tamanho * 1.6;
    };

    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
        emitir(atual);
        atual = palavra;
      } else {
        atual = tentativa;
      }
    }
    if (atual) emitir(atual);
    cursor -= linha.espacoDepois ?? 0;
  }
  return cursor;
}

/** Linhas do currículo, em ordem de leitura. */
function linhasDoCurriculo(titles = sectionTitles) {
  const linhas = [
    { text: header.name, bold: true, size: 18 },
    { text: header.role, size: 11 },
    ...header.contact.map((linha) => ({
      text: linha,
      size: 9,
      espacoDepois: linha === header.contact[header.contact.length - 1] ? 10 : 0,
    })),
    { text: titles.summary, bold: true, size: 11 },
    { text: summary, espacoDepois: 10 },
    { text: titles.experience, bold: true, size: 11 },
  ];

  for (const job of jobs) {
    linhas.push({ text: `${job.role} — ${job.company}`, bold: true });
    linhas.push({ text: job.period, size: 9 });
    for (const bullet of job.bullets) linhas.push({ text: `• ${bullet}` });
    linhas.push({ text: "", espacoDepois: 4 });
  }

  linhas.push({ text: titles.education, bold: true, size: 11 });
  for (const item of education) {
    linhas.push({ text: `${item.course} — ${item.school}` });
    linhas.push({ text: item.period, size: 9 });
  }

  linhas.push({ text: titles.skills, bold: true, size: 11, espacoDepois: 2 });
  linhas.push({ text: skills });
  return linhas;
}

async function pdfColunaUnica() {
  const { pdf, regular, negrito } = await novoPdf();
  const page = pdf.addPage(A4);
  escreverLinhas(page, linhasDoCurriculo(), {
    x: MARGEM,
    y: A4[1] - MARGEM,
    largura: A4[0] - MARGEM * 2,
    regular,
    negrito,
  });
  return pdf.save();
}

/** Duas páginas, com uma experiência atravessando a quebra. */
async function pdfDuasPaginas() {
  const { pdf, regular, negrito } = await novoPdf();
  const linhas = linhasDoCurriculo();
  const corte = Math.floor(linhas.length * 0.55);

  for (const parte of [linhas.slice(0, corte), linhas.slice(corte)]) {
    const page = pdf.addPage(A4);
    escreverLinhas(page, parte, {
      x: MARGEM,
      y: A4[1] - MARGEM,
      largura: A4[0] - MARGEM * 2,
      regular,
      negrito,
    });
  }
  return pdf.save();
}

/**
 * Duas colunas com calha vazia no meio: habilidades e formação à esquerda,
 * experiência à direita. É o layout que precisa ser detectado e normalizado.
 */
async function pdfDuasColunas() {
  const { pdf, regular, negrito } = await novoPdf();
  const page = pdf.addPage(A4);
  const larguraColuna = (A4[0] - MARGEM * 2 - 40) / 2;

  const esquerda = [
    { text: header.name, bold: true, size: 16 },
    ...header.contact.map((linha) => ({
      text: linha,
      size: 8,
      espacoDepois: linha === header.contact[header.contact.length - 1] ? 10 : 0,
    })),
    { text: sectionTitles.skills, bold: true, size: 11 },
    { text: skills, espacoDepois: 10 },
    { text: sectionTitles.education, bold: true, size: 11 },
  ];
  for (const item of education) {
    esquerda.push({ text: item.course });
    esquerda.push({ text: item.school, size: 9 });
    esquerda.push({ text: item.period, size: 9, espacoDepois: 4 });
  }

  const direita = [{ text: sectionTitles.experience, bold: true, size: 11 }];
  for (const job of jobs) {
    direita.push({ text: `${job.role} — ${job.company}`, bold: true });
    direita.push({ text: job.period, size: 9 });
    for (const bullet of job.bullets) direita.push({ text: `• ${bullet}` });
    direita.push({ text: "", espacoDepois: 4 });
  }

  const comum = { y: A4[1] - MARGEM, largura: larguraColuna, regular, negrito };
  escreverLinhas(page, esquerda, { ...comum, x: MARGEM });
  escreverLinhas(page, direita, { ...comum, x: MARGEM + larguraColuna + 40 });
  return pdf.save();
}

/** PDF só com imagem: nenhuma camada de texto. Precisa falhar com erro próprio. */
async function pdfDigitalizado() {
  const { pdf } = await novoPdf();
  const page = pdf.addPage(A4);
  // Retângulos cinzas simulando o scan de uma página — nenhum drawText.
  for (let i = 0; i < 16; i += 1) {
    page.drawRectangle({
      x: MARGEM,
      y: A4[1] - MARGEM - i * 28,
      width: (A4[0] - MARGEM * 2) * (0.5 + ((i * 37) % 50) / 100),
      height: 10,
      color: rgb(0.82, 0.82, 0.82),
    });
  }
  return pdf.save();
}

// ── Execução ────────────────────────────────────────────────────────────────────

console.log("Gerando fixtures em fixtures/files/");

escrever("curriculo-completo.docx", await docx(docxComListas(sectionTitles)));
escrever("curriculo-ingles.docx", await docx(docxComListas(sectionTitlesEn)));
escrever("curriculo-paragrafo.docx", await docx(docxSemListas()));
escrever("curriculo-completo.pdf", Buffer.from(await pdfColunaUnica()));
escrever("curriculo-duas-paginas.pdf", Buffer.from(await pdfDuasPaginas()));
escrever("curriculo-duas-colunas.pdf", Buffer.from(await pdfDuasColunas()));
escrever("curriculo-digitalizado.pdf", Buffer.from(await pdfDigitalizado()));

// Extensão certa, conteúdo que não é o formato: precisa falhar como corrompido.
escrever("corrompido.docx", Buffer.from("PK isto não é um docx de verdade"));
escrever("corrompido.pdf", Buffer.from("%PDF-1.7 mas o resto é lixo"));
escrever("curriculo.odt", Buffer.from("formato não suportado"));

console.log("Pronto.");
