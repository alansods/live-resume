import { describe, expect, test } from "vitest";
import { dictionaries } from "@/lib/i18n/dictionary";
import { validateIntake, validateMonthYear, validateRange } from "./dates";
import { initialState, intakeReducer, type IntakeState } from "./state";

const t = dictionaries.pt;

function comExperiencias(quantas: number): IntakeState {
  let state = initialState;
  for (let i = 0; i < quantas; i += 1) {
    state = intakeReducer(state, { type: "openModal", kind: "experience" });
    state = intakeReducer(state, {
      type: "updateDraft",
      field: "company",
      value: `Empresa ${i + 1}`,
    });
    state = intakeReducer(state, {
      type: "updateDraft",
      field: "role",
      value: `Cargo ${i + 1}`,
    });
    state = intakeReducer(state, { type: "confirmDraft" });
  }
  return state;
}

describe("Campos controlados", () => {
  test("Edição atinge só o item editado", () => {
    const state = comExperiencias(3);

    const depois = intakeReducer(state, {
      type: "updateItem",
      kind: "experience",
      id: state.experience[1].id,
      field: "role",
      value: "Tech Lead",
    });

    expect(depois.experience[1].role).toBe("Tech Lead");
    expect(depois.experience[0]).toEqual(state.experience[0]);
    expect(depois.experience[2]).toEqual(state.experience[2]);
  });

  test("Remover apaga o item certo", () => {
    let state = initialState;
    for (const curso of ["Pós", "Bacharelado", "Certificação"]) {
      state = intakeReducer(state, { type: "openModal", kind: "education" });
      state = intakeReducer(state, {
        type: "updateDraft",
        field: "course",
        value: curso,
      });
      state = intakeReducer(state, { type: "confirmDraft" });
    }

    const depois = intakeReducer(state, {
      type: "removeItem",
      kind: "education",
      id: state.education[1].id,
    });

    expect(depois.education.map((item) => item.course)).toEqual(["Pós", "Certificação"]);
  });

  test("Remover não embaralha o que foi digitado", () => {
    const state = comExperiencias(4);
    const antes = state.experience.map((item) => ({ ...item }));

    const depois = intakeReducer(state, {
      type: "removeItem",
      kind: "experience",
      id: state.experience[2].id,
    });

    expect(depois.experience).toEqual([antes[0], antes[1], antes[3]]);
    // Nenhum texto migrou de um item para outro.
    for (const item of depois.experience) {
      const original = antes.find((candidato) => candidato.id === item.id);
      expect(item.company).toBe(original?.company);
      expect(item.role).toBe(original?.role);
    }
  });

  test("Cada item nasce com id próprio", () => {
    const state = comExperiencias(5);
    expect(new Set(state.experience.map((item) => item.id)).size).toBe(5);
  });
});

describe("Rascunho do modal", () => {
  test("Cancelar não cria nada", () => {
    let state = intakeReducer(initialState, { type: "openModal", kind: "skill" });
    state = intakeReducer(state, { type: "updateDraft", field: "name", value: "Rust" });
    state = intakeReducer(state, { type: "closeModal" });

    expect(state.skills).toEqual([]);
    expect(state.modal).toBeNull();

    // Reabrir apresenta campos vazios.
    const reaberto = intakeReducer(state, { type: "openModal", kind: "skill" });
    expect(reaberto.draft).toEqual({ name: "" });
  });

  test("Confirmar fecha o modal e limpa o rascunho", () => {
    let state = intakeReducer(initialState, { type: "openModal", kind: "skill" });
    state = intakeReducer(state, { type: "updateDraft", field: "name", value: "Rust" });
    state = intakeReducer(state, { type: "confirmDraft" });

    expect(state.skills.map((item) => item.name)).toEqual(["Rust"]);
    expect(state.modal).toBeNull();
    expect(state.draft).toEqual({});
  });
});

describe("Datas com mês e ano", () => {
  test("Data válida é aceita", () => {
    expect(validateMonthYear("03/2022", t)).toEqual({
      valid: true,
      value: { month: 3, year: 2022 },
    });
    expect(validateMonthYear("3/2022", t)).toEqual({
      valid: true,
      value: { month: 3, year: 2022 },
    });
  });

  test("Mês inválido é recusado", () => {
    expect(validateMonthYear("13/2022", t)).toEqual({
      valid: false,
      message: t.dates.invalidMonth,
    });
    expect(validateMonthYear("00/2022", t)).toEqual({
      valid: false,
      message: t.dates.invalidMonth,
    });
  });

  test("Ano solto é recusado", () => {
    const resultado = validateMonthYear("2018", t);

    expect(resultado).toEqual({ valid: false, message: t.dates.missingMonth });
    // Nenhum mês é assumido no caminho.
    expect(JSON.stringify(resultado)).not.toContain("month");
  });

  test("Fim antes do início é recusado", () => {
    expect(validateRange("03/2022", "01/2021", false, t)).toEqual({
      valid: false,
      message: t.dates.endBeforeStart,
    });
    expect(validateRange("03/2022", "03/2022", false, t)).toEqual({ valid: true });
    expect(validateRange("03/2022", "12/2024", false, t)).toEqual({ valid: true });
  });

  test("Fim em aberto é aceito", () => {
    // Em andamento dispensa data de fim, e não pode ser recusado por ordem.
    expect(validateRange("03/2022", "", true, t)).toEqual({ valid: true });
    expect(validateRange("03/2022", "01/2000", true, t)).toEqual({ valid: true });
  });

  test("Formato irreconhecível é recusado", () => {
    for (const entrada of ["março de 2022", "2022-03", "03.2022", "abc"]) {
      expect(validateMonthYear(entrada, t), entrada).toEqual({
        valid: false,
        message: t.dates.invalidFormat,
      });
    }
  });

  test("Formato em inglês é aceito", () => {
    expect(validateMonthYear("Mar 2022", t)).toEqual({
      valid: true,
      value: { month: 3, year: 2022 },
    });
    expect(validateMonthYear("march/2022", t)).toEqual({
      valid: true,
      value: { month: 3, year: 2022 },
    });
    expect(validateMonthYear("December 2024", t)).toEqual({
      valid: true,
      value: { month: 12, year: 2024 },
    });
  });

  test("Nome de mês em inglês desconhecido é recusado", () => {
    expect(validateMonthYear("Foo 2022", t)).toEqual({
      valid: false,
      message: t.dates.invalidFormat,
    });
  });

  test("Campo vazio não é erro", () => {
    expect(validateMonthYear("", t)).toEqual({ valid: true, value: null });
    expect(validateMonthYear("   ", t)).toEqual({ valid: true, value: null });
  });
});

describe("Botão Adicionar só habilita com o essencial", () => {
  const campos = (valores: Record<string, string | boolean>) => (campo: string) =>
    String(valores[campo] ?? "");

  test("Experiência sem empresa ou cargo não pode ser adicionada", () => {
    expect(validateIntake("experience", campos({}), false, t).valid).toBe(false);
    expect(
      validateIntake("experience", campos({ company: "Acme" }), false, t).valid,
    ).toBe(false);
    expect(
      validateIntake(
        "experience",
        campos({ company: "Acme", role: "Dev" }),
        false,
        t,
      ).valid,
    ).toBe(true);
  });

  test("Formação sem curso ou instituição não pode ser adicionada", () => {
    expect(
      validateIntake("education", campos({ course: "Engenharia" }), false, t).valid,
    ).toBe(false);
    expect(
      validateIntake(
        "education",
        campos({ course: "Engenharia", school: "USP" }),
        false,
        t,
      ).valid,
    ).toBe(true);
  });

  test("Habilidade sem nome não pode ser adicionada", () => {
    expect(validateIntake("skill", campos({}), false, t).valid).toBe(false);
    expect(validateIntake("skill", campos({ name: "Rust" }), false, t).valid).toBe(
      true,
    );
  });

  test("Data preenchida e inválida bloqueia; vazia, não", () => {
    const base = { company: "Acme", role: "Dev" };

    expect(
      validateIntake("experience", campos({ ...base, start: "13/2022" }), false, t),
    ).toMatchObject({ valid: false, dateError: { field: "start" } });
    expect(
      validateIntake("experience", campos({ ...base, start: "Mar 2022" }), false, t)
        .valid,
    ).toBe(true);
    expect(validateIntake("experience", campos(base), false, t).valid).toBe(true);
  });

  test("Fim antes do início bloqueia", () => {
    const base = { company: "Acme", role: "Dev" };

    expect(
      validateIntake(
        "experience",
        campos({ ...base, start: "03/2022", end: "01/2021" }),
        false,
        t,
      ).valid,
    ).toBe(false);
    expect(
      validateIntake(
        "experience",
        campos({ ...base, start: "03/2022", end: "12/2024" }),
        false,
        t,
      ).valid,
    ).toBe(true);
  });

  test("Em andamento ignora o fim", () => {
    const base = { company: "Acme", role: "Dev", start: "03/2022" };

    expect(
      validateIntake("experience", campos({ ...base, end: "01/2000" }), true, t)
        .valid,
    ).toBe(true);
  });
});
