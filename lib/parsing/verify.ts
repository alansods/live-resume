import type { StructuredResume } from "@/lib/ai/structure";
import type { Block } from "./blocks";

/**
 * Verificação anti-reescrita.
 *
 * Na estruturação a IA apenas **distribui** o texto extraído nos campos. Reescrever é
 * papel das sugestões, que passam pelo checklist do usuário — aqui, qualquer palavra
 * que não veio do arquivo é motivo para recusar a importação inteira.
 *
 * A comparação é por **contenção de texto normalizado**, não por similaridade. Um
 * limiar de similaridade é justamente a fresta por onde uma reescrita passa;
 * contenção é binária e auditável. Ela aceita o que deve aceitar — dividir um
 * parágrafo em dois bullets, descartar o marcador de lista, colapsar espaços — e
 * recusa reformulação, mesmo com o mesmo sentido.
 *
 * Há dois regimes. Prosa (resumo, bullets, empresas) é **estrita**: o texto tem de
 * existir como trecho contíguo. Habilidades são **por palavra**: o campo é, por
 * natureza, montado de fragmentos espalhados pelo arquivo — a IA coleciona "React"
 * de um bullet e "AWS" de outro — e exigir contiguidade recusaria essa agregação
 * legítima. Reescrever uma habilidade quase não existe ("React" não tem paráfrase),
 * então basta que cada palavra venha do arquivo: qualquer token inventado cai na
 * mesma trava.
 */

/**
 * A **forma** da divergência, nunca o texto dela.
 *
 * Conteúdo de currículo não vai para log — é invariante do projeto, e truncar não
 * desidentifica: "Reduzi os tickets de suporte em…" já é o currículo de alguém. Um
 * rótulo e um número dizem o suficiente para saber se o modelo está piorando, e não
 * dizem nada sobre quem enviou o arquivo.
 */
export type DivergenceKind =
  /** Coincide com o arquivo se a acentuação for ignorada. */
  | "sem-acento"
  /** N palavras do campo não aparecem no arquivo. */
  | `palavras:${number}`
  /** Nenhuma palavra do campo aparece no arquivo. */
  | "ausente";

export class RewriteDetectedError extends Error {
  constructor(
    readonly field: string,
    readonly text: string,
    /** Classificação segura para log e para o retorno à IA. */
    readonly divergence: DivergenceKind = "ausente",
  ) {
    super(
      `A IA devolveu em "${field}" um texto que não existe no arquivo importado: "${text}". A estruturação distribui o texto extraído, nunca o reescreve.`,
    );
    this.name = "RewriteDetectedError";
  }
}

/** Sem acento, para separar "difere só na acentuação" de "difere de verdade". */
function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Classifica a recusa. Só olha palavras e contagens — nada do que ela devolve permite
 * reconstruir o texto.
 */
export function classificarDivergencia(
  referencia: string,
  texto: string,
): DivergenceKind {
  const alvo = normalizar(texto);
  if (semAcento(referencia).includes(semAcento(alvo))) return "sem-acento";

  const palavras = alvo.split(" ").filter((palavra) => palavra.length > 0);
  const fora = palavras.filter((palavra) => !referencia.includes(palavra));

  if (fora.length === palavras.length) return "ausente";
  return `palavras:${fora.length}`;
}

/** Marcadores de lista que a IA pode legitimamente ter descartado. */
const MARCADOR = /^[•▪◦‣·・●○*\-–—]\s*/;

/**
 * Normaliza para comparar: reduz a comparação às PALAVRAS.
 *
 * Espaços, marcador de lista, aspas tipográficas e pontuação trocam de forma sem trocar
 * de conteúdo. Ignorá-las é o que permite à IA reunir duas seções do arquivo numa linha
 * só — juntar "IDIOMAS" com o que vem depois pede um dois-pontos de ligação, e recusar
 * a importação por causa dele seria recusar a junção inteira.
 *
 * A trava continua valendo porque reescrita troca palavra, não vírgula: um texto
 * reformulado não aparece no arquivo, com ou sem pontuação.
 */
function normalizar(texto: string): string {
  return texto
    .replace(MARCADOR, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** O texto extraído inteiro, como referência única de contenção. */
export function referenceText(blocks: Block[]): string {
  return normalizar(blocks.map((block) => block.text).join(" "));
}

/**
 * Separadores de sentença. Vírgula fica de fora de propósito: ela separa itens dentro
 * de uma lista de habilidades, e quebrar ali produziria exatamente os fragmentos curtos
 * que o piso abaixo existe para impedir.
 */
const SEPARADOR_DE_SENTENCA = /(?<=\.|;)\s+/;

/**
 * Unidade mínima de evidência, em caracteres normalizados.
 *
 * Curto o bastante para não atrapalhar "português: nativo"; longo o bastante para que
 * "react" ou "vue" nunca sejam prova de nada. Sem esse piso, um campo montado de muitos
 * pedaços curtos — "React. Vue. Node." — passaria colhendo palavras soltas pelo
 * documento inteiro, e a trava viraria enfeite.
 */
const FRAGMENTO_MINIMO = 12;

/**
 * Quebra o campo em unidades de conferência: fragmento curto é reunido ao anterior, em
 * vez de verificado sozinho. Reunir é mais exigente que verificar em separado — o
 * pedaço curto continua tendo de existir, só que dentro de um trecho maior.
 */
function unidadesDe(texto: string): string[] {
  const unidades: string[] = [];
  const curto = (parte: string) => normalizar(parte).length < FRAGMENTO_MINIMO;

  for (const parte of texto.split(SEPARADOR_DE_SENTENCA)) {
    const anterior = unidades[unidades.length - 1];
    // Curto se junta ao anterior. Curto no começo, sem anterior, espera o próximo —
    // que é o mesmo efeito, na outra direção.
    if (anterior !== undefined && (curto(parte) || curto(anterior))) {
      unidades[unidades.length - 1] = `${anterior} ${parte}`;
      continue;
    }
    unidades.push(parte);
  }

  return unidades;
}

/**
 * Contíguo primeiro; fragmento só quando ele falha.
 *
 * A quebra é a exceção: ela existe para a IA poder reunir num campo material que o
 * arquivo trazia em lugares distantes — habilidades e idiomas na mesma linha —, sem
 * abrir a porta para reescrita, que continua não aparecendo em lugar nenhum do texto
 * extraído.
 */
function assertContido(referencia: string, texto: string, field: string): void {
  const alvo = normalizar(texto);
  // Campo vazio é ausência declarada, não conteúdo inventado.
  if (alvo.length === 0) return;
  if (referencia.includes(alvo)) return;

  const recusar = (): never => {
    throw new RewriteDetectedError(
      field,
      texto,
      classificarDivergencia(referencia, texto),
    );
  };

  const unidades = unidadesDe(texto);
  // Sem separador não há o que reunir: o campo é uma unidade só, e ela não bate.
  if (unidades.length < 2) recusar();

  for (const unidade of unidades) {
    const pedaco = normalizar(unidade);
    if (pedaco.length === 0) continue;
    if (!referencia.includes(pedaco)) recusar();
  }
}

/**
 * Conectivos que a IA pode legitimamente acrescentar ao reunir habilidades.
 *
 * "React, Vue e Angular" exige o "e" de ligação que o arquivo pode não trazer entre
 * os dois nomes. Ignorá-los é o que separa a agregação (permitida) da invenção
 * (recusada): um token que não é conectivo e não veio do arquivo continua sendo
 * motivo de recusa.
 */
const CONECTIVOS = new Set([
  // português
  "a",
  "as",
  "o",
  "os",
  "e",
  "ou",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "com",
  "sem",
  "por",
  "para",
  "pelo",
  "pela",
  "pelos",
  "pelas",
  "entre",
  "um",
  "uma",
  "uns",
  "umas",
  "nem",
  // inglês
  "a",
  "an",
  "the",
  "and",
  "or",
  "with",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "from",
  "by",
  "as",
  "per",
  "via",
]);

/**
 * Verificação por palavra, só para habilidades.
 *
 * O campo agrega tokens de seções distantes do arquivo, então o trecho contíguo não
 * existe — mas cada token tem de existir. A comparação é palavra a palavra (não
 * substring, para "back" não provar "backend"), e conectivos de ligação não contam.
 */
function assertContidoPorPalavra(referencia: string, texto: string, field: string): void {
  const alvo = normalizar(texto);
  // Campo vazio é ausência declarada, não conteúdo inventado.
  if (alvo.length === 0) return;

  const palavras = new Set(referencia.split(" ").filter((palavra) => palavra.length > 0));
  const tokens = alvo.split(" ").filter((token) => token.length > 0);
  const fora = tokens.filter((token) => !CONECTIVOS.has(token) && !palavras.has(token));

  if (fora.length > 0) {
    throw new RewriteDetectedError(
      field,
      texto,
      classificarDivergencia(referencia, texto),
    );
  }
}

/**
 * Confere que todo texto da resposta veio do arquivo. Falha na primeira violação: uma
 * resposta que reescreveu um trecho não é aproveitável em parte.
 */
export function assertOnlyExtractedText(
  structured: StructuredResume,
  blocks: Block[],
): void {
  const referencia = referenceText(blocks);

  assertContido(referencia, structured.header.name, "header.name");
  assertContido(referencia, structured.header.role, "header.role");
  for (const [indice, linha] of structured.header.contact.entries()) {
    assertContido(referencia, linha, `header.contact[${indice}]`);
  }
  assertContido(referencia, structured.summary ?? "", "summary");
  // Habilidades são montadas de fragmentos espalhados: verificação por palavra.
  assertContidoPorPalavra(referencia, structured.skills ?? "", "skills");

  structured.jobs.forEach((job, indice) => {
    assertContido(referencia, job.company, `jobs[${indice}].company`);
    assertContido(referencia, job.role, `jobs[${indice}].role`);
    assertContido(referencia, job.period, `jobs[${indice}].period`);
    job.bullets.forEach((bullet, posicao) => {
      assertContido(referencia, bullet, `jobs[${indice}].bullets[${posicao}]`);
    });
  });

  structured.education.forEach((item, indice) => {
    assertContido(referencia, item.course, `education[${indice}].course`);
    assertContido(referencia, item.school, `education[${indice}].school`);
    assertContido(referencia, item.period, `education[${indice}].period`);
  });
}
