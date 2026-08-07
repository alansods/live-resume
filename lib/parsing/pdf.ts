import {
  corruptedFile,
  normalizeWhitespace,
  pdfReaderUnavailable,
  pdfWithoutTextLayer,
  type Block,
  type ExtractedDocument,
  type Layout,
} from "./blocks";

/**
 * Extração de PDF.
 *
 * PDF não tem parágrafos nem listas: tem glifos com coordenadas. Toda a estrutura é
 * reconstruída da posição — linhas por proximidade vertical, bullets por glifo
 * marcador. Um extrator de texto simples devolveria um muro onde bullet e parágrafo
 * são indistinguíveis, e aí o modelo perderia a granularidade que a etapa 3 precisa
 * para ancorar sugestões.
 *
 * A ordem das operações importa: **colunas são detectadas antes de as linhas serem
 * montadas**. Duas colunas compartilham a mesma coordenada vertical, então montar
 * linhas primeiro funde o texto da esquerda com o da direita — exatamente o
 * embaralhamento que o requisito proíbe.
 */

type Item = {
  text: string;
  /** Canto inferior esquerdo, em pontos, origem embaixo à esquerda. */
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
};

type Linha = {
  text: string;
  x: number;
  y: number;
  page: number;
};

/**
 * O worker do pdfjs não subiu. Acontece quando o empacotador reescreve o caminho do
 * módulo — é falha de configuração nossa, nunca do arquivo enviado.
 */
const FALHA_DE_WORKER = /worker|Cannot find module/i;

/** Marcadores de lista comuns no início de linha. */
const MARCADOR = /^[•▪◦‣·・●○*\-–—]\s+/;

/** Duas linhas são a mesma quando os seus centros verticais quase coincidem. */
const TOLERANCIA_LINHA = 3;

/** Uma calha precisa ser larga o bastante para não ser só espaçamento entre palavras. */
const CALHA_MINIMA = 0.04;

/** Só o miolo da página conta: vazio nas bordas é margem, não calha. */
const MIOLO = { inicio: 0.15, fim: 0.85 };

/**
 * O build legacy é o que roda em Node. O import é dinâmico e local ao módulo para que
 * o pdfjs não entre no bundle do cliente.
 */
async function carregarPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

type Leitura = { itens: Item[]; pages: number; largura: number };

async function lerItens(data: Uint8Array): Promise<Leitura> {
  const pdfjs = await carregarPdfjs();

  // A loading task é quem libera os recursos no fim — `destroy()` é dela, não do
  // documento.
  const tarefa = pdfjs.getDocument({
    data,
    // Só precisamos do texto: as fontes do sistema bastam e evitam baixar as
    // embutidas, que não usamos para nada aqui.
    useSystemFonts: true,
  });

  let documento;
  try {
    documento = await tarefa.promise;
  } catch (error) {
    await tarefa.destroy();
    const motivo = (error as Error).message;
    // O worker que não sobe é defeito nosso de empacotamento — o arquivo do usuário
    // pode estar perfeito, e dizer que ele está corrompido manda a pessoa procurar
    // problema onde não há.
    throw FALHA_DE_WORKER.test(motivo)
      ? pdfReaderUnavailable(motivo)
      : corruptedFile("PDF", motivo);
  }

  const pages = documento.numPages;
  const itens: Item[] = [];
  let largura = 0;

  for (let numero = 1; numero <= pages; numero += 1) {
    const pagina = await documento.getPage(numero);
    largura = Math.max(largura, pagina.getViewport({ scale: 1 }).width);
    const conteudo = await pagina.getTextContent();

    for (const item of conteudo.items) {
      if (!("str" in item)) continue;
      if (item.str.trim().length === 0) continue;
      // transform = [a, b, c, d, e, f]; e/f são a posição.
      const [, , , , x, y] = item.transform as number[];
      itens.push({
        text: item.str,
        x,
        y,
        width: item.width,
        height: item.height,
        page: numero,
      });
    }
  }

  await tarefa.destroy();
  return { itens, pages, largura };
}

/**
 * Detecta calhas verticais: faixas horizontais que nenhum texto ocupa, no miolo da
 * página. Currículo de coluna única não tem calha — as linhas curtas deixam vazio à
 * direita, que é margem e fica de fora por construção.
 */
function detectarCalhas(itens: Item[], largura: number): number[] {
  if (itens.length < 20 || largura <= 0) return [];

  const faixas = 100;
  const ocupada = new Array<boolean>(faixas).fill(false);

  for (const item of itens) {
    const inicio = Math.max(0, Math.floor((item.x / largura) * faixas));
    const fim = Math.min(
      faixas - 1,
      Math.ceil(((item.x + item.width) / largura) * faixas),
    );
    for (let i = inicio; i <= fim; i += 1) ocupada[i] = true;
  }

  const primeiraDoMiolo = Math.floor(MIOLO.inicio * faixas);
  const ultimaDoMiolo = Math.ceil(MIOLO.fim * faixas);
  const larguraMinima = Math.ceil(CALHA_MINIMA * faixas);

  const calhas: number[] = [];
  let comeco = -1;

  for (let i = primeiraDoMiolo; i <= ultimaDoMiolo; i += 1) {
    if (!ocupada[i]) {
      if (comeco === -1) comeco = i;
      continue;
    }
    if (comeco !== -1) {
      if (i - comeco >= larguraMinima) {
        calhas.push(((comeco + i) / 2 / faixas) * largura);
      }
      comeco = -1;
    }
  }

  return calhas;
}

/** Junta os fragmentos de uma mesma linha, na ordem horizontal. */
function montarLinhas(itens: Item[]): Linha[] {
  const porLinha: Item[][] = [];

  for (const item of [...itens].sort(
    (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
  )) {
    const atual = porLinha[porLinha.length - 1];
    const mesmaLinha =
      atual &&
      atual[0].page === item.page &&
      Math.abs(atual[0].y - item.y) <= TOLERANCIA_LINHA;
    if (mesmaLinha) atual.push(item);
    else porLinha.push([item]);
  }

  return porLinha.map((grupo) => {
    const ordenado = [...grupo].sort((a, b) => a.x - b.x);

    // O PDF quebra a linha em vários fragmentos e não guarda os espaços entre eles: a
    // distância horizontal é o que diz se havia um.
    let text = ordenado[0].text;
    for (let i = 1; i < ordenado.length; i += 1) {
      const anterior = ordenado[i - 1];
      const atual = ordenado[i];
      const lacuna = atual.x - (anterior.x + anterior.width);
      const precisaEspaco =
        lacuna > anterior.height * 0.2 && !/\s$/.test(text) && !/^\s/.test(atual.text);
      text += (precisaEspaco ? " " : "") + atual.text;
    }

    return {
      text: normalizeWhitespace(text),
      x: Math.min(...ordenado.map((item) => item.x)),
      y: ordenado[0].y,
      page: ordenado[0].page,
    };
  });
}

function montarBlocos(linhas: Linha[], column?: number): Block[] {
  const posicao = column === undefined ? {} : { column };

  return linhas
    .filter((linha) => linha.text.length > 0)
    .map((linha) => {
      const marcador = MARCADOR.exec(linha.text);
      return marcador
        ? {
            text: linha.text.slice(marcador[0].length).trim(),
            kind: "listItem" as const,
            page: linha.page,
            ...posicao,
          }
        : {
            text: linha.text,
            kind: "paragraph" as const,
            page: linha.page,
            ...posicao,
          };
    });
}

export async function extractPdf(data: Uint8Array): Promise<ExtractedDocument> {
  const { itens, pages, largura } = await lerItens(data);

  if (itens.length === 0) {
    // Nenhum glifo em nenhuma página: é digitalização, não currículo legível.
    throw pdfWithoutTextLayer();
  }

  const calhas = detectarCalhas(itens, largura);

  if (calhas.length === 0) {
    return {
      blocks: montarBlocos(montarLinhas(itens)),
      layout: { kind: "single-column" },
      pages,
    };
  }

  // Com colunas, o conteúdo sai agrupado por coluna — nunca intercalado. Remontar a
  // ordem de leitura é trabalho da IA, na estruturação.
  const limites = [0, ...calhas, Number.POSITIVE_INFINITY];
  const colunas = limites.length - 1;
  const blocks: Block[] = [];

  for (let coluna = 0; coluna < colunas; coluna += 1) {
    const daColuna = itens.filter(
      (item) => item.x >= limites[coluna] && item.x < limites[coluna + 1],
    );
    blocks.push(...montarBlocos(montarLinhas(daColuna), coluna));
  }

  const layout: Layout = { kind: "multi-column", columns: colunas };
  return { blocks, layout, pages };
}
