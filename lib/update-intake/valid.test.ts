import { describe, expect, test } from "vitest";
import {
  conteudoValido,
  monthYearValido,
  resultadoDaData,
} from "./valid";
import type { IntakeContent } from "./content";
import { newItemId } from "@/lib/resume/ids";

describe("resultadoDaData", () => {
  test("Campo vazio é ausência, não erro", () => {
    expect(resultadoDaData("")).toEqual({ ok: true, valor: null });
    expect(resultadoDaData("   ")).toEqual({ ok: true, valor: null });
  });

  test("Só o ano não é data completa", () => {
    expect(resultadoDaData("2018")).toEqual({ ok: false, motivo: "soAno" });
  });

  test("Mês fora da faixa tem motivo próprio", () => {
    expect(resultadoDaData("13/2022")).toEqual({ ok: false, motivo: "mesFora" });
    expect(resultadoDaData("00/2022")).toEqual({ ok: false, motivo: "mesFora" });
  });

  test("Numérico válido devolve mês e ano", () => {
    expect(resultadoDaData("03/2022")).toEqual({
      ok: true,
      valor: { month: 3, year: 2022 },
    });
    expect(resultadoDaData("3/2022")).toEqual({
      ok: true,
      valor: { month: 3, year: 2022 },
    });
  });

  test("Nome do mês em inglês é reconhecido", () => {
    expect(resultadoDaData("Mar 2022")).toEqual({
      ok: true,
      valor: { month: 3, year: 2022 },
    });
    expect(resultadoDaData("march/2022")).toEqual({
      ok: true,
      valor: { month: 3, year: 2022 },
    });
    expect(resultadoDaData("December 2024")).toEqual({
      ok: true,
      valor: { month: 12, year: 2024 },
    });
  });

  test("O que o parser do modelo não reconhece é inválido", () => {
    expect(resultadoDaData("Foo 2022")).toEqual({ ok: false, motivo: "invalido" });
    expect(resultadoDaData("Mar-2022")).toEqual({ ok: false, motivo: "invalido" });
    expect(resultadoDaData("13/22")).toEqual({ ok: false, motivo: "invalido" });
  });
});

describe("monthYearValido", () => {
  test("É o resumo booleano do resultado", () => {
    expect(monthYearValido("")).toBe(true);
    expect(monthYearValido("03/2022")).toBe(true);
    expect(monthYearValido("Mar 2022")).toBe(true);
    expect(monthYearValido("2018")).toBe(false);
    expect(monthYearValido("13/2022")).toBe(false);
    expect(monthYearValido("garbage")).toBe(false);
  });
});

describe("conteudoValido", () => {
  const vazio: IntakeContent = { education: [], experience: [], skills: [] };

  function experiencia(parcial: Partial<IntakeContent["experience"][number]> = {}) {
    return {
      id: newItemId(),
      company: "Acme",
      role: "Gerente",
      start: "",
      end: "",
      ongoing: false,
      delivered: "",
      ...parcial,
    };
  }

  function formacao(parcial: Partial<IntakeContent["education"][number]> = {}) {
    return {
      id: newItemId(),
      course: "Engenharia",
      school: "USP",
      start: "",
      finish: "",
      ...parcial,
    };
  }

  test("Nada digitado é legítimo", () => {
    expect(conteudoValido(vazio)).toBe(true);
  });

  test("Identificadores preenchidos e datas vazias são válidos", () => {
    expect(conteudoValido({ ...vazio, experience: [experiencia()] })).toBe(true);
    expect(conteudoValido({ ...vazio, education: [formacao()] })).toBe(true);
  });

  test("Item sem identificador é inválido", () => {
    expect(
      conteudoValido({ ...vazio, experience: [experiencia({ company: "" })] }),
    ).toBe(false);
    expect(
      conteudoValido({ ...vazio, education: [formacao({ school: "" })] }),
    ).toBe(false);
    expect(
      conteudoValido({ ...vazio, skills: [{ id: newItemId(), name: "" }] }),
    ).toBe(false);
  });

  test("Data ilegível invalida o item", () => {
    expect(
      conteudoValido({
        ...vazio,
        experience: [experiencia({ start: "13/2022" })],
      }),
    ).toBe(false);
    expect(
      conteudoValido({
        ...vazio,
        education: [formacao({ finish: "2018" })],
      }),
    ).toBe(false);
  });

  test("Fim anterior ao início invalida o item", () => {
    expect(
      conteudoValido({
        ...vazio,
        experience: [experiencia({ start: "03/2022", end: "01/2021" })],
      }),
    ).toBe(false);
    expect(
      conteudoValido({
        ...vazio,
        education: [formacao({ start: "03/2022", finish: "01/2021" })],
      }),
    ).toBe(false);
  });

  test("Em andamento dispensa o fim", () => {
    expect(
      conteudoValido({
        ...vazio,
        experience: [experiencia({ start: "03/2022", end: "", ongoing: true })],
      }),
    ).toBe(true);
  });

  test("Um item inválido derruba o conjunto", () => {
    expect(
      conteudoValido({
        ...vazio,
        experience: [experiencia(), experiencia({ start: "13/2022" })],
      }),
    ).toBe(false);
  });
});