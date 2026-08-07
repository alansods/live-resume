import type { Patch } from "@/lib/resume/generate";
import { atsScore } from "@/lib/suggestions/ats";
import type { Suggestion, SuggestionKind } from "@/lib/suggestions/model";

/**
 * Estado da etapa 03.
 *
 * O nome dos campos é a regra de produto inteira: `selected` e `dismissed`, nunca
 * `applied`. Marcar não aplica nada — o currículo do preview é o importado, e o conjunto
 * marcado só vira patch na exportação.
 *
 * A numeração é de exibição; o vínculo entre marcador e cartão é o **id** da sugestão.
 * Se fosse pelo número, filtrar renumeraria e o marcador passaria a apontar para outro
 * cartão.
 */

export type ReviewFilter = "all" | SuggestionKind;

export type ReviewState = {
  /** Marcadas: o que entra no currículo final. */
  selected: ReadonlySet<string>;
  /** Ignoradas: somem da tela. Diferente de desmarcada, que continua listada. */
  dismissed: ReadonlySet<string>;
  filter: ReviewFilter;
  /** Cartão em foco, apontado por um marcador. */
  focused: string | null;
};

export const initialReviewState: ReviewState = {
  selected: new Set(),
  dismissed: new Set(),
  filter: "all",
  focused: null,
};

function comAlternancia(conjunto: ReadonlySet<string>, id: string): Set<string> {
  const proximo = new Set(conjunto);
  if (!proximo.delete(id)) proximo.add(id);
  return proximo;
}

export function toggleSelected(state: ReviewState, id: string): ReviewState {
  return { ...state, selected: comAlternancia(state.selected, id) };
}

/** Marca todas as que ainda estão na tela. Ignorada não volta por aqui. */
export function selectAll(state: ReviewState, suggestions: Suggestion[]): ReviewState {
  const selected = new Set(state.selected);
  for (const sugestao of suggestions) {
    if (!state.dismissed.has(sugestao.id)) selected.add(sugestao.id);
  }
  return { ...state, selected };
}

/**
 * Ignorar tira da tela **e** do conjunto marcado: um cartão que sumiu não pode continuar
 * pesando no currículo final sem o usuário ter como desfazer a marcação.
 */
export function dismiss(state: ReviewState, id: string): ReviewState {
  const selected = new Set(state.selected);
  selected.delete(id);

  const dismissed = new Set(state.dismissed);
  dismissed.add(id);

  return {
    ...state,
    selected,
    dismissed,
    focused: state.focused === id ? null : state.focused,
  };
}

export function setFilter(state: ReviewState, filter: ReviewFilter): ReviewState {
  return { ...state, filter };
}

export function focus(state: ReviewState, id: string | null): ReviewState {
  return { ...state, focused: id };
}

// ── Derivados ───────────────────────────────────────────────────────────────────

/** Uma sugestão como a tela precisa dela: com número de exibição e estado. */
export type ReviewItem = {
  suggestion: Suggestion;
  /** Posição na lista completa não ignorada — o número da bolinha e do cartão. */
  number: number;
  selected: boolean;
};

/**
 * As sugestões visíveis, numeradas.
 *
 * A numeração vem da lista completa **antes** do filtro, para que filtrar não faça a
 * sugestão 3 virar 1 na tela e no papel ao mesmo tempo.
 */
export function visibleItems(
  state: ReviewState,
  suggestions: Suggestion[],
): ReviewItem[] {
  return suggestions
    .filter((sugestao) => !state.dismissed.has(sugestao.id))
    .map((suggestion, i) => ({
      suggestion,
      number: i + 1,
      selected: state.selected.has(suggestion.id),
    }))
    .filter((item) => state.filter === "all" || item.suggestion.kind === state.filter);
}

/** Todas as não ignoradas, numeradas — é o que o papel do currículo consome. */
export function allItems(state: ReviewState, suggestions: Suggestion[]): ReviewItem[] {
  return visibleItems({ ...state, filter: "all" }, suggestions);
}

/** Mapa path -> item, a âncora entre currículo, marcador e cartão. */
export function itemsByPath(
  state: ReviewState,
  suggestions: Suggestion[],
): Map<string, ReviewItem> {
  return new Map(
    allItems(state, suggestions).map((item) => [item.suggestion.path, item]),
  );
}

/** Pendente é o que continua na tela e não foi marcado. */
export function pendingCount(state: ReviewState, suggestions: Suggestion[]): number {
  return allItems(state, suggestions).filter((item) => !item.selected).length;
}

export function reviewScore(state: ReviewState, suggestions: Suggestion[]): number {
  // Ignorada não conta como resolvida: ela continua sendo um defeito do currículo.
  return atsScore(suggestions, state.selected as Set<string>);
}

/**
 * O que a exportação recebe. É aqui que a marcação vira substituição de texto — e só
 * aqui, depois de o usuário ter marcado.
 */
export function selectedPatches(state: ReviewState, suggestions: Suggestion[]): Patch[] {
  return suggestions
    .filter((sugestao) => state.selected.has(sugestao.id))
    .map((sugestao) => ({ path: sugestao.path, text: sugestao.after }));
}
