import type { Suggestion, SuggestionKind } from "./model";

/**
 * Pontuação de ATS.
 *
 * Ela sai das sugestões, não de uma análise própria do currículo. O conjunto de
 * sugestões **é** a lista de defeitos que o app conhece; marcar uma é resolver aquele
 * defeito. A alternativa — calcular uma base lendo o currículo direto, como o `52` fixo
 * do protótipo — obrigaria o código a julgar por conta própria se o resumo é bom,
 * exatamente a heurística que o projeto proíbe, e discordaria da IA na primeira
 * divergência: uma nota baixa que nenhum cartão explica.
 *
 * Aqui, cada ponto que falta tem um cartão correspondente na tela. Currículo sem
 * defeito nenhum nasce em 100, e não é bug: se o app não tem nada a apontar, não há por
 * que exibir uma nota que insinua um problema que ele não sabe nomear.
 */

export const MAX_SCORE = 100;

/**
 * Os pesos ordenam por onde o dano acontece: `ats` é defeito de indexação — o texto não
 * chega a ser lido; `dates` faz o parser calcular tempo de experiência errado; `metric`
 * e `verb` custam menos porque o texto é lido, só é fraco.
 *
 * São convenção, não medida: nenhuma fonte pública dá peso real de ATS, e inventar
 * precisão seria pior que assumir a convenção. Ficam aqui, num ponto só.
 */
export const SCORE_WEIGHTS: Record<SuggestionKind, number> = {
  ats: 12,
  dates: 8,
  metric: 4,
  verb: 3,
};

/**
 * A nota de 0 a 100 para o conjunto marcado.
 *
 * Não recebe o currículo: ele não entra na conta. Marcar sobe, desmarcar devolve o
 * valor anterior, e marcar tudo chega a 100.
 *
 * Um currículo com sugestões demais satura no piso, e ali marcar não move a nota. É
 * preferível a normalizar a soma pelo total — normalizar faria a nota *piorar* quando a
 * IA encontrasse mais um problema no mesmo texto, o que confunde mais que o piso.
 */
export function atsScore(suggestions: Suggestion[], selected: Set<string>): number {
  const pendente = suggestions
    .filter((sugestao) => !selected.has(sugestao.id))
    .reduce((total, sugestao) => total + SCORE_WEIGHTS[sugestao.kind], 0);

  return Math.max(0, MAX_SCORE - pendente);
}
