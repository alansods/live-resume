import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import {
  back,
  canGoBack,
  canGoNext,
  canGoTo,
  goTo,
  initialFlowState,
  next,
  toggleFormat,
  toggleLocale,
  withResume,
  withSelection,
  withSuggestions,
} from "./state";

/**
 * A trava do fluxo é uma só: sem currículo importado não se sai da etapa 01. Nas outras
 * não há trava — passar pela 02 sem digitar e pela 03 sem marcar é legítimo.
 */

const comCurriculo = withResume(initialFlowState, importedResume, "curriculo.docx");

describe("Navegação entre as quatro etapas", () => {
  test("A etapa atual é indicada", () => {
    expect(initialFlowState.step).toBe(1);
    expect(next(comCurriculo).step).toBe(2);
    expect(goTo(comCurriculo, 4).step).toBe(4);
  });

  test("Voltar não passa da primeira", () => {
    expect(canGoBack(initialFlowState)).toBe(false);
    expect(back(initialFlowState).step).toBe(1);
  });

  test("Avançar não passa da última", () => {
    const naUltima = goTo(comCurriculo, 4);

    expect(canGoNext(naUltima)).toBe(false);
    expect(next(naUltima).step).toBe(4);
  });
});

describe("Avançar exige o passo anterior", () => {
  test("Sem currículo, não se avança", () => {
    expect(canGoNext(initialFlowState)).toBe(false);
    expect(next(initialFlowState).step).toBe(1);

    for (const etapa of [2, 3, 4] as const) {
      expect(canGoTo(initialFlowState, etapa), `etapa ${etapa}`).toBe(false);
      expect(goTo(initialFlowState, etapa).step).toBe(1);
    }
  });

  test("Com currículo, o fluxo abre", () => {
    expect(canGoNext(comCurriculo)).toBe(true);
    for (const etapa of [2, 3, 4] as const) {
      expect(canGoTo(comCurriculo, etapa), `etapa ${etapa}`).toBe(true);
    }
  });

  test("Currículo novo zera sugestões e marcações", () => {
    const comTudo = withSelection(
      withSuggestions(comCurriculo, [], false),
      new Set(["s1"]),
    );

    const reimportado = withResume(comTudo, importedResume, "outro.pdf");
    expect(reimportado.suggestions).toBeNull();
    expect(reimportado.selected.size).toBe(0);
  });
});

describe("Seleção de saídas na etapa 04", () => {
  test("Marcar e desmarcar idioma e formato compõe o conjunto", () => {
    // A contagem em si é verificada onde ela aparece — no rótulo do botão, em
    // `AppShell.test.tsx`. Aqui fica só a composição do conjunto.
    const doisPorDois = toggleFormat(toggleLocale(comCurriculo, "en"), "docx");
    expect(doisPorDois.locales).toHaveLength(2);
    expect(doisPorDois.formats).toHaveLength(2);

    expect(toggleLocale(comCurriculo, "pt").locales).toHaveLength(0);
  });
});
