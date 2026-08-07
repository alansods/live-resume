/**
 * Tipografia do currículo exportado.
 *
 * Uma escala só, num lugar só, lida pelos dois geradores. A divergência que motivou este
 * módulo — corpo Calibri com títulos em serifa azul no DOCX, Helvetica no PDF — não
 * aconteceu por descuido: aconteceu porque não havia onde escrever a decisão. Cada
 * gerador tinha a sua, e nenhuma estava errada isoladamente.
 *
 * Isto é o **documento do usuário**, não a interface do app: nada aqui vem de
 * `claude-design/styles.css`, que veste a tela. O alvo é convencional e legível por
 * máquina — um currículo é lido por ATS antes de ser lido por gente.
 */

/** Tamanhos em pontos, como o PDF os usa. O DOCX converte para meios-pontos. */
export const TAMANHO = {
  nome: 16,
  contato: 10,
  secao: 11,
  cargo: 10,
  corpo: 10,
} as const;

/**
 * Peso de cada elemento.
 *
 * Mesmo tamanho com peso diferente é a mesma divergência entre as saídas de sempre, só
 * que menos visível: o DOCX tirava o negrito do estilo nativo (Title e Heading1 já vêm
 * em negrito) e do trecho do cargo, e o PDF, que não tem estilo nativo de onde herdar,
 * não tirava de lugar nenhum. Escrito aqui, os dois leem a mesma decisão.
 */
export const NEGRITO = {
  nome: true,
  contato: false,
  secao: true,
  cargo: true,
  corpo: false,
} as const;

/**
 * Margem da página, em pontos — 1 polegada, a margem de documento convencional.
 *
 * Quebra de linha é função da largura da coluna de texto: duas saídas com a mesma fonte
 * e o mesmo corpo, mas margens diferentes, quebram em pontos diferentes. O DOCX herdava
 * 1 polegada do gerador sem dizer, e o PDF declarava 48/56pt — o mesmo currículo saía
 * com colunas de larguras distintas, e portanto com outras quebras.
 */
export const MARGEM = 72;

/**
 * Marca e recuo do bullet.
 *
 * A marca é `•` (U+2022) e não o `●` (U+25CF) que o gerador de DOCX usa por padrão:
 * `●` não existe na codificação padrão do PDF e sai como letra trocada — vira `Ï` em
 * Helvetica. Entre uma marca que só um dos formatos desenha e uma que os dois desenham,
 * a que serve aos dois é a única que mantém os arquivos sendo o mesmo documento.
 *
 * `recuo` é onde o texto do bullet começa; `deslocamento`, o quanto a marca recua dele —
 * a primeira linha começa em `recuo - deslocamento`, as seguintes alinham em `recuo`.
 */
export const BULLET = {
  marca: "•",
  recuo: 36,
  deslocamento: 18,
} as const;

/**
 * Preto no texto; o contato em cinza escuro, porque é metadado e não conteúdo. Nenhuma
 * cor de destaque: a do tema do Word era azul, e ninguém a escolheu.
 */
export const COR = {
  texto: "#111111",
  contato: "#444444",
  regua: "#999999",
} as const;

/**
 * Uma família por documento, e as duas metricamente equivalentes: mesmas larguras de
 * caractere, então o texto quebra nos mesmos pontos e os dois arquivos ficam
 * sobreponíveis na prática.
 *
 * Nenhuma precisa ser embutida — Helvetica é nativa do gerador de PDF e Arial existe em
 * qualquer instalação do Word. Declarar Helvetica no DOCX deixaria a substituição a
 * cargo do editor, e ela não é previsível; Arial já é o resultado dela.
 */
export const FAMILIA = {
  docx: "Arial",
  pdf: "Helvetica",
} as const;

/** Espessura da régua sob o título de seção, em pontos. */
export const REGUA = 0.75;

/** O DOCX mede fonte em meios-pontos. */
export function emMeiosPontos(pontos: number): number {
  return Math.round(pontos * 2);
}

/** O DOCX mede borda em oitavos de ponto. */
export function emOitavosDePonto(pontos: number): number {
  return Math.round(pontos * 8);
}

/** O DOCX escreve cor sem o `#`. */
export function semCerquilha(cor: string): string {
  return cor.replace("#", "");
}

/**
 * Ritmo vertical, em pontos. A mesma escala para os dois formatos.
 *
 * Ela nasceu dentro do gerador de PDF, que é o único que **precisa** declarar espaço para
 * o arquivo existir. O DOCX não precisa — e por isso não declarava, herdando o padrão de
 * quem o abrisse: 8pt depois do parágrafo no Word, zero em outros leitores. Dois arquivos
 * que são o mesmo documento saíam com respiros diferentes.
 */
export const ESPACO = {
  /** Depois do nome, no topo. */
  nome: 2,
  /** Antes do título de seção — é o que separa um bloco do outro. */
  secao: 14,
  /** Antes de cada cargo ou curso, dentro da seção. */
  item: 10,
  /** Entre linhas de um mesmo bloco. */
  linha: 3,
  /** Entre bullets, que já respiram pela marca. */
  bullet: 1,
} as const;

/** Entrelinha, em múltiplo do corpo. */
export const ENTRELINHA = 1.45;

/** O DOCX mede espaço em twips: 1pt = 20. */
export function emTwips(pontos: number): number {
  return Math.round(pontos * 20);
}

/** O DOCX mede entrelinha em 240 avos, onde 240 é a linha simples. */
export function emLinhasDocx(fator: number): number {
  return Math.round(fator * 240);
}
