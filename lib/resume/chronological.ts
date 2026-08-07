import type { ResumeOrder } from "./generate";
import type { ItemId } from "./ids";
import { isOpenEnd, isYearMonth, type Period } from "./period";
import type { Resume } from "./schema";

/**
 * Ordem cronológica de recurso.
 *
 * É o que sai quando a IA não pôde decidir a ordem — chamada que falhou ou permutação
 * que não serve. Um currículo em ordem cronológica é um currículo correto, só menos
 * curado; abortar a exportação por causa da ordem trocaria uma perda pequena e
 * invisível por uma perda total, no momento em que o usuário clicou em baixar.
 *
 * A regra é a convenção de currículo, e nada além dela: em curso primeiro, depois do
 * início mais recente para o mais antigo.
 *
 * O que esta função NÃO faz é ordenar bullets. Escolher qual entrega é mais forte é
 * exatamente o julgamento que se delega à IA; sem ela, a escolha honesta é conservar a
 * ordem em que estão. "Bullet mais longo primeiro" seria heurística disfarçada de
 * critério, e das piores — premiaria o mais prolixo.
 */

/**
 * Chave de ordenação por início. `comparePeriodStart` não serve aqui: ele recusa
 * comparar período incompleto, e no recurso é preciso ordenar o que existe. Um período
 * sem mês entra pelo ano que tem — nenhum mês é assumido, porque assumir mês é papel de
 * `suggestions-dates`, que o faz à vista e com aviso.
 */
function chaveDeInicio(period: Period): number {
  const start = period.start;
  if (start === null) return Number.NEGATIVE_INFINITY;
  const month = isYearMonth(start) ? start.month : 0;
  return start.year * 12 + month;
}

/** Em curso é o que o leitor procura primeiro, mesmo que outro tenha começado depois. */
function emCurso(period: Period): boolean {
  return period.end !== null && isOpenEnd(period.end);
}

function maisRecentePrimeiro(a: Period, b: Period): number {
  if (emCurso(a) !== emCurso(b)) return emCurso(a) ? -1 : 1;
  return chaveDeInicio(b) - chaveDeInicio(a);
}

function ordenados<T extends { id: ItemId; period: Period }>(
  items: readonly T[],
): ItemId[] {
  // Cópia antes de ordenar: `sort` muta, e a entrada é do chamador.
  return [...items]
    .sort((a, b) => maisRecentePrimeiro(a.period, b.period))
    .map((i) => i.id);
}

/**
 * A ordem cronológica do currículo, no formato que `generateFinal` consome.
 *
 * `bullets` fica de fora de propósito: ordem omitida é ordem conservada, e é isso que
 * se quer aqui.
 */
export function chronologicalOrder(resume: Resume): ResumeOrder {
  return {
    jobs: ordenados(resume.jobs),
    education: ordenados(resume.education),
  };
}
