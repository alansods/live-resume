import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { newItemId } from "@/lib/resume/ids";
import type { IntakeContent } from "@/lib/update-intake/content";
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
  withIntake,
  withResume,
  withSelection,
  withSuggestions,
} from "./state";

/**
 * As travas do fluxo: sem currículo importado não se sai da etapa 01; e a etapa 02 só
 * se cruza com conteúdo válido. Nas outras não há trava — passar pela 03 sem marcar é
 * legítimo.
 */

const comCurriculo = withResume(initialFlowState, importedResume, "curriculo.docx");

/** Uma experiência com data ilegível: é o item que quebraria o currículo em trabalho. */
const conteudoComDataQuebrada: IntakeContent = {
  education: [],
  experience: [
    {
      id: newItemId(),
      company: "Acme",
      role: "Gerente",
      start: "13/2022",
      end: "",
      ongoing: false,
      delivered: "",
    },
  ],
  skills: [],
};

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

describe("A etapa 02 só se cruza com conteúdo válido", () => {
  test("Conteúdo quebrado trava o avanço", () => {
    const naEtapa2 = next(comCurriculo);
    const comQuebra = withIntake(naEtapa2, conteudoComDataQuebrada);

    expect(comQuebra.intakeValid).toBe(false);
    expect(canGoNext(comQuebra)).toBe(false);
    expect(next(comQuebra).step).toBe(2);
  });

  test("Conteúdo quebrado trava o salto para a revisão e a exportação", () => {
    const naEtapa2 = next(comCurriculo);
    const comQuebra = withIntake(naEtapa2, conteudoComDataQuebrada);

    for (const etapa of [3, 4] as const) {
      expect(canGoTo(comQuebra, etapa), `etapa ${etapa}`).toBe(false);
      expect(goTo(comQuebra, etapa).step).toBe(2);
    }
  });

  test("Conteúdo quebrado não trava voltar nem a etapa 02", () => {
    const naEtapa2 = next(comCurriculo);
    const comQuebra = withIntake(naEtapa2, conteudoComDataQuebrada);

    expect(canGoTo(comQuebra, 1)).toBe(true);
    expect(canGoTo(comQuebra, 2)).toBe(true);
    expect(canGoBack(comQuebra)).toBe(true);
    expect(back(comQuebra).step).toBe(1);
  });

  test("Corrigir a data libera o avanço", () => {
    const naEtapa2 = next(comCurriculo);
    const comQuebra = withIntake(naEtapa2, conteudoComDataQuebrada);
    const corrigido: IntakeContent = {
      ...conteudoComDataQuebrada,
      experience: [
        { ...conteudoComDataQuebrada.experience[0], start: "03/2022" },
      ],
    };

    const liberado = withIntake(comQuebra, corrigido);
    expect(liberado.intakeValid).toBe(true);
    expect(canGoNext(liberado)).toBe(true);
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
