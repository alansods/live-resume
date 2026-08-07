import { describe, expect, test } from "vitest";
import { revisaoDeExemplo } from "@/fixtures/review";
import {
  allItems,
  dismiss,
  initialReviewState,
  pendingCount,
  reviewScore,
  selectAll,
  selectedPatches,
  setFilter,
  toggleSelected,
  visibleItems,
} from "./state";

/**
 * O estado da revisão é `selected` + `dismissed`, nunca `applied`. É a diferença entre
 * um checklist e um editor, e é o que estes testes protegem.
 */

const sugestoes = revisaoDeExemplo;
const metrica = sugestoes[0];
const data = sugestoes[2];

describe("Marcar é a única ação sobre o currículo final", () => {
  test("Marcar inclui a sugestão no conjunto", () => {
    const state = toggleSelected(initialReviewState, metrica.id);

    expect(selectedPatches(state, sugestoes)).toEqual([
      { path: metrica.path, text: metrica.after },
    ]);
  });

  test("Desmarcar remove do conjunto", () => {
    const marcada = toggleSelected(initialReviewState, metrica.id);
    const desmarcada = toggleSelected(marcada, metrica.id);

    expect(selectedPatches(desmarcada, sugestoes)).toEqual([]);
  });

  test("Marcar todas marca as pendentes", () => {
    const state = selectAll(initialReviewState, sugestoes);

    expect(selectedPatches(state, sugestoes)).toHaveLength(sugestoes.length);
    expect(pendingCount(state, sugestoes)).toBe(0);
  });

  test("Marcar todas não ressuscita ignorada", () => {
    const comIgnorada = dismiss(initialReviewState, metrica.id);
    const state = selectAll(comIgnorada, sugestoes);

    expect(state.selected.has(metrica.id)).toBe(false);
    expect(selectedPatches(state, sugestoes)).toHaveLength(sugestoes.length - 1);
  });
});

describe("Ignorar remove a sugestão da revisão", () => {
  test("Sugestão ignorada some da tela", () => {
    const state = dismiss(initialReviewState, metrica.id);

    const visiveis = visibleItems(state, sugestoes).map((i) => i.suggestion.id);
    expect(visiveis).not.toContain(metrica.id);
    expect(visiveis).toHaveLength(sugestoes.length - 1);
  });

  test("Ignorar uma sugestão marcada tira do conjunto", () => {
    const marcada = toggleSelected(initialReviewState, metrica.id);
    const ignorada = dismiss(marcada, metrica.id);

    expect(selectedPatches(ignorada, sugestoes)).toEqual([]);
  });

  test("Desmarcada continua listada", () => {
    const marcada = toggleSelected(initialReviewState, metrica.id);
    const desmarcada = toggleSelected(marcada, metrica.id);

    const visiveis = visibleItems(desmarcada, sugestoes).map((i) => i.suggestion.id);
    expect(visiveis).toContain(metrica.id);
  });
});

describe("Filtro por tipo e contagem de pendências", () => {
  test("Filtro por tipo mostra só aquele tipo", () => {
    const state = setFilter(initialReviewState, "dates");

    const tipos = visibleItems(state, sugestoes).map((i) => i.suggestion.kind);
    expect(new Set(tipos)).toEqual(new Set(["dates"]));
    expect(tipos.length).toBeGreaterThan(0);
  });

  test("Filtro não altera o conjunto marcado", () => {
    const marcada = toggleSelected(initialReviewState, metrica.id);
    const filtrada = setFilter(marcada, "ats");

    expect(selectedPatches(filtrada, sugestoes)).toEqual([
      { path: metrica.path, text: metrica.after },
    ]);
  });

  test("Pendências contam o que não foi tratado", () => {
    const duas = toggleSelected(toggleSelected(initialReviewState, metrica.id), data.id);

    expect(pendingCount(duas, sugestoes)).toBe(sugestoes.length - 2);
  });

  test("O filtro não renumera as sugestões", () => {
    // O número vem da lista completa: filtrar não pode fazer a 3 virar 1.
    const completa = allItems(initialReviewState, sugestoes);
    const numeroDaData = completa.find((i) => i.suggestion.id === data.id)!.number;

    const filtrada = visibleItems(setFilter(initialReviewState, "dates"), sugestoes);
    expect(filtrada.find((i) => i.suggestion.id === data.id)!.number).toBe(numeroDaData);
    expect(numeroDaData).toBeGreaterThan(1);
  });
});

describe("Pontuação de ATS projetada na tela", () => {
  test("Pontuação sobe ao marcar", () => {
    const antes = reviewScore(initialReviewState, sugestoes);
    const depois = reviewScore(toggleSelected(initialReviewState, metrica.id), sugestoes);

    expect(depois).toBeGreaterThan(antes);
  });

  test("Pontuação reflete o conjunto marcado, não o total", () => {
    const uma = toggleSelected(initialReviewState, metrica.id);

    expect(reviewScore(uma, sugestoes)).toBeLessThan(100);
    expect(reviewScore(selectAll(initialReviewState, sugestoes), sugestoes)).toBe(100);
  });
});
