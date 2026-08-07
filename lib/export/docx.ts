import type { Locale } from "@/lib/i18n/dictionary";
import type { Resume } from "@/lib/resume/schema";
import { formatPeriodForLocale } from "./dates";
import { sectionTitle, type SectionKey } from "./sections";
import {
  BULLET,
  COR,
  ENTRELINHA,
  ESPACO,
  FAMILIA,
  MARGEM,
  NEGRITO,
  REGUA,
  TAMANHO,
  emLinhasDocx,
  emMeiosPontos,
  emOitavosDePonto,
  emTwips,
  semCerquilha,
} from "./typography";

/**
 * DOCX do currículo final.
 *
 * Coluna única, sem tabela, sem caixa de texto, sem cabeçalho ou rodapé com conteúdo. O
 * que o arquivo precisa ser é legível por máquina; a beleza vem depois disso, e bem
 * depois.
 *
 * Título de seção usa **estilo nativo de parágrafo**, não negrito solto. A diferença é
 * invisível na tela e decisiva no parser: com estilo, o Word registra "isto é um
 * título"; com negrito, registra "isto é texto que por acaso está mais escuro".
 *
 * O `docx` é importado dinamicamente, como o SDK do Gemini: a geração roda no servidor,
 * e a biblioteca não tem por que entrar no bundle do cliente.
 */

/** Referência da lista de bullets, ligando os parágrafos à numeração declarada abaixo. */
const LISTA = "bullets";

/** Uma linha do documento, antes de virar parágrafo. */
type Linha =
  | { tipo: "nome"; texto: string }
  | { tipo: "contato"; texto: string }
  | { tipo: "secao"; texto: string }
  | { tipo: "cargo"; texto: string }
  | { tipo: "corpo"; texto: string }
  | { tipo: "bullet"; texto: string };

/**
 * O currículo como sequência de linhas tipadas.
 *
 * Separar isto da escrita do arquivo é o que permite testar a ordem e o conteúdo do
 * documento sem abrir um DOCX — e é o mesmo desenho que o PDF reaproveita.
 */
export function documentLines(resume: Resume, locale: Locale): Linha[] {
  const linhas: Linha[] = [{ tipo: "nome", texto: resume.header.name }];

  if (resume.header.role) linhas.push({ tipo: "cargo", texto: resume.header.role });
  if (resume.header.contact) {
    linhas.push({ tipo: "contato", texto: resume.header.contact });
  }

  const secao = (key: SectionKey) => ({
    tipo: "secao" as const,
    texto: sectionTitle(key, locale),
  });

  // Seção ausente não vira título vazio.
  if (resume.summary !== null) {
    linhas.push(secao("summary"), { tipo: "corpo", texto: resume.summary.text });
  }

  if (resume.jobs.length > 0) {
    linhas.push(secao("experience"));
    for (const job of resume.jobs) {
      linhas.push({
        tipo: "cargo",
        texto: `${job.role} · ${job.company}`,
      });
      linhas.push({
        tipo: "corpo",
        texto: formatPeriodForLocale(job.period, locale),
      });
      for (const bullet of job.bullets) {
        linhas.push({ tipo: "bullet", texto: bullet.value.text });
      }
    }
  }

  if (resume.education.length > 0) {
    linhas.push(secao("education"));
    for (const item of resume.education) {
      linhas.push({ tipo: "cargo", texto: `${item.course} · ${item.school}` });
      linhas.push({
        tipo: "corpo",
        texto: formatPeriodForLocale(item.period, locale),
      });
    }
  }

  if (resume.skills !== null) {
    linhas.push(secao("skills"), { tipo: "corpo", texto: resume.skills.text });
  }

  return linhas;
}

export async function buildDocx(resume: Resume, locale: Locale): Promise<Uint8Array> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  /**
   * A fonte vai também em cada trecho, e não só nos estilos.
   *
   * O estilo é a declaração correta e o Word a respeita, mas leitor que ignora o estilo
   * padrão cai na fonte dele — o visualizador do macOS mostra assim o corpo em serifa,
   * num documento cujos títulos são Arial. Este arquivo vai ser aberto por ferramentas
   * que ninguém escolheu; declarar em cada trecho tira o resultado das mãos delas.
   */
  const trecho = (
    texto: string,
    opcoes: { pontos?: number; bold?: boolean; cor?: string } = {},
  ) =>
    new TextRun({
      text: texto,
      font: FAMILIA.docx,
      size: emMeiosPontos(opcoes.pontos ?? TAMANHO.corpo),
      ...(opcoes.bold ? { bold: true } : {}),
      ...(opcoes.cor ? { color: semCerquilha(opcoes.cor) } : {}),
    });

  /**
   * O espaçamento vai declarado em cada parágrafo.
   *
   * O que o DOCX não declara, ele herda do leitor: o Word aplica 8pt depois do parágrafo,
   * outros aplicam zero, e o mesmo currículo sai com respiro diferente conforme o programa
   * que o abriu. A escala é a de `typography.ts`, a mesma que o PDF usa.
   */
  const espaco = (opcoes: { antes?: number; depois?: number }) => ({
    spacing: {
      ...(opcoes.antes ? { before: emTwips(opcoes.antes) } : {}),
      ...(opcoes.depois ? { after: emTwips(opcoes.depois) } : {}),
      line: emLinhasDocx(ENTRELINHA),
    },
  });

  const paragrafo = (linha: Linha) => {
    switch (linha.tipo) {
      case "nome":
        return new Paragraph({
          heading: HeadingLevel.TITLE,
          ...espaco({ depois: ESPACO.nome }),
          // Só família e corpo no trecho: negrito e cor vêm do estilo, e repeti-los
          // aqui faria o título virar "texto em negrito" para quem lê a estrutura.
          children: [
            new TextRun({
              text: linha.texto,
              font: FAMILIA.docx,
              size: emMeiosPontos(TAMANHO.nome),
            }),
          ],
        });
      case "secao":
        return new Paragraph({
          heading: HeadingLevel.HEADING_1,
          ...espaco({ antes: ESPACO.secao, depois: ESPACO.linha }),
          children: [
            new TextRun({
              text: linha.texto,
              font: FAMILIA.docx,
              size: emMeiosPontos(TAMANHO.secao),
            }),
          ],
        });
      case "cargo":
        return new Paragraph({
          children: [trecho(linha.texto, { pontos: TAMANHO.cargo, bold: NEGRITO.cargo })],
          ...espaco({ antes: ESPACO.item }),
        });
      case "contato":
        return new Paragraph({
          children: [trecho(linha.texto, { pontos: TAMANHO.contato, cor: COR.contato })],
          ...espaco({ depois: ESPACO.linha }),
        });
      case "bullet":
        return new Paragraph({
          children: [trecho(linha.texto)],
          // Numeração própria, e não o `bullet: { level: 0 }` da biblioteca: o padrão
          // dela é `●`, que o PDF não desenha. A marca e o recuo vêm do módulo comum.
          numbering: { reference: LISTA, level: 0 },
          ...espaco({ depois: ESPACO.bullet }),
        });
      case "corpo":
        return new Paragraph({
          children: [trecho(linha.texto)],
          ...espaco({ depois: ESPACO.linha }),
        });
    }
  };

  /**
   * Estilo nativo do Word traz consigo família, corpo e cor do tema — foi assim que o
   * nome saiu com 28pt e os títulos em serifa azul, num documento cujo corpo era outra
   * fonte. Sobrescrever é o que mantém o estilo nativo (estrutura navegável, legível por
   * ATS) sem herdar a bagagem dele.
   */
  const fonte = FAMILIA.docx;
  const runDeTitulo = (pontos: number, negrito: boolean) => ({
    font: fonte,
    size: emMeiosPontos(pontos),
    bold: negrito,
    color: semCerquilha(COR.texto),
  });

  const tituloDeSecao = {
    run: runDeTitulo(TAMANHO.secao, NEGRITO.secao),
    paragraph: {
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: emOitavosDePonto(REGUA),
          color: semCerquilha(COR.regua),
        },
      },
    },
  };

  /**
   * Os níveis 2 a 6 não são usados pelo documento, mas o Word os grava assim mesmo — e
   * gravaria com o azul do tema. Quem editar o arquivo e aplicar um deles não deve
   * receber uma cor que ninguém escolheu.
   */
  const demaisTitulos = { run: runDeTitulo(TAMANHO.secao, NEGRITO.secao) };

  const doc = new Document({
    styles: {
      default: {
        // Uma fonte só no documento inteiro.
        document: { run: { font: fonte, size: emMeiosPontos(TAMANHO.corpo) } },
        title: { run: runDeTitulo(TAMANHO.nome, NEGRITO.nome) },
        heading1: tituloDeSecao,
        heading2: demaisTitulos,
        heading3: demaisTitulos,
        heading4: demaisTitulos,
        heading5: demaisTitulos,
        heading6: demaisTitulos,
      },
      /*
       * O mesmo em "Normal". `docDefaults` é a declaração correta e o Word a respeita,
       * mas nem todo leitor a lê — o visualizador do macOS, por exemplo, cai na fonte
       * dele e mostra o corpo em serifa. Declarar nos dois lugares custa uma regra e
       * tira o resultado das mãos do leitor.
       */
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: fonte, size: emMeiosPontos(TAMANHO.corpo) },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: LISTA,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: BULLET.marca,
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: emTwips(BULLET.recuo),
                    hanging: emTwips(BULLET.deslocamento),
                  },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        // A margem vai declarada: o padrão da biblioteca é o mesmo valor, mas padrão não
        // é decisão, e é a largura da coluna que decide onde o texto quebra.
        properties: {
          page: {
            margin: {
              top: emTwips(MARGEM),
              right: emTwips(MARGEM),
              bottom: emTwips(MARGEM),
              left: emTwips(MARGEM),
            },
          },
        },
        children: documentLines(resume, locale).map(paragrafo),
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
