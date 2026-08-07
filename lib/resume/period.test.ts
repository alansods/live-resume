import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { imported, typed } from "./origin";
import {
  comparePeriodStart,
  completePeriod,
  formatPeriod,
  parsePeriod,
  periodsOverlap,
} from "./period";

describe("Período com mês e ano", () => {
  test("Formato completo é normalizado", () => {
    const fechado = parsePeriod("03/2022 – 12/2024", imported);
    expect(fechado.complete).toBe(true);
    expect(fechado.start).toEqual({ month: 3, year: 2022 });
    expect(fechado.end).toEqual({ month: 12, year: 2024 });
    expect(fechado.raw).toBe("03/2022 – 12/2024");

    const aberto = parsePeriod("01/2025 – atual", imported);
    expect(aberto.complete).toBe(true);
    expect(aberto.start).toEqual({ month: 1, year: 2025 });
    expect(aberto.end).toEqual({ open: true });

    // Outras grafias de intervalo e de fim em aberto.
    expect(parsePeriod("02/2015 até o momento", imported).end).toEqual({ open: true });
    expect(parsePeriod("05/2021 - Present", imported).end).toEqual({ open: true });
    expect(parsePeriod("01/2020 to 12/2022", imported).complete).toBe(true);
  });

  test("Período sem mês fica incompleto", () => {
    const period = parsePeriod("2018 - 2019", imported);

    expect(period.complete).toBe(false);
    expect(period.raw).toBe("2018 - 2019");
    // O ano que se sabe é preservado; o mês continua explicitamente desconhecido.
    expect(period.start).toEqual({ month: null, year: 2018 });
    expect(period.end).toEqual({ month: null, year: 2019 });
  });

  test("Nenhum caminho atribui mês por conta própria", () => {
    const soltos = ["2018 - 2019", "2020", "de 2015 a 2019", "verão de 2019", ""];

    for (const raw of soltos) {
      const period = parsePeriod(raw, imported);
      const meses = [period.start, period.end]
        .filter((date) => date !== null && "month" in date)
        .map((date) => (date as { month: number | null }).month);
      expect(meses.every((month) => month === null)).toBe(true);
      expect(period.complete).toBe(false);
    }
  });

  test("Formato não reconhecido", () => {
    const period = parsePeriod("desde sempre", imported);

    expect(period.complete).toBe(false);
    expect(period.raw).toBe("desde sempre");
    expect(period.start).toBeNull();
    expect(period.end).toBeNull();
  });

  test("Usuário completa o período", () => {
    const incompleto = parsePeriod("2018 - 2019", imported);

    const completo = completePeriod(incompleto, {
      start: { month: 3, year: 2018 },
      end: { month: 11, year: 2019 },
    });

    expect(completo.complete).toBe(true);
    expect(completo.start).toEqual({ month: 3, year: 2018 });
    expect(completo.end).toEqual({ month: 11, year: 2019 });
    expect(completo.raw).toBe("2018 - 2019");
    // Imutável: o período incompleto continua incompleto.
    expect(incompleto.complete).toBe(false);
  });

  test("Completar pela metade não torna o período completo", () => {
    const incompleto = parsePeriod("2018 - 2019", typed);
    const meioCaminho = completePeriod(incompleto, { start: { month: 3, year: 2018 } });

    expect(meioCaminho.complete).toBe(false);
  });

  test("Renderização em mm/aaaa", () => {
    const fechado = parsePeriod("3/2022 – 12/2024", imported);
    expect(formatPeriod(fechado, "atual")).toBe("03/2022 – 12/2024");

    const aberto = parsePeriod("01/2025 – atual", imported);
    expect(formatPeriod(aberto, "atual")).toBe("01/2025 – atual");
    expect(formatPeriod(aberto, "Present")).toBe("01/2025 – Present");

    // Sem mm/aaaa para mostrar, o texto original é o que existe.
    const incompleto = parsePeriod("2018 - 2019", imported);
    expect(formatPeriod(incompleto, "atual")).toBe("2018 - 2019");
  });

  test("Comparação de períodos", () => {
    const antes = parsePeriod("01/2020 – 12/2022", imported);
    const depois = parsePeriod("03/2022 – 12/2024", imported);
    const emCurso = parsePeriod("01/2025 – atual", imported);

    const ordem = comparePeriodStart(antes, depois);
    expect(ordem).toEqual({ comparable: true, value: expect.any(Number) });
    expect(ordem.comparable && ordem.value).toBeLessThan(0);
    expect(comparePeriodStart(depois, antes).comparable && true).toBe(true);
    expect(comparePeriodStart(antes, antes)).toEqual({ comparable: true, value: 0 });

    // Os 10 meses de sobreposição do currículo de exemplo.
    expect(periodsOverlap(antes, depois)).toEqual({ comparable: true, value: true });
    expect(periodsOverlap(depois, antes)).toEqual({ comparable: true, value: true });
    expect(periodsOverlap(antes, emCurso)).toEqual({ comparable: true, value: false });

    // Fim em aberto alcança qualquer data posterior.
    expect(periodsOverlap(emCurso, parsePeriod("06/2025 – 12/2025", imported))).toEqual({
      comparable: true,
      value: true,
    });
  });

  test("Período incompleto não é comparado silenciosamente", () => {
    const incompleto = parsePeriod("2018 - 2019", imported);
    const completo = parsePeriod("01/2020 – 12/2022", imported);

    expect(comparePeriodStart(incompleto, completo)).toEqual({
      comparable: false,
      reason: "incomplete",
    });
    expect(periodsOverlap(completo, incompleto)).toEqual({
      comparable: false,
      reason: "incomplete",
    });
  });

  test("O currículo importado carrega os casos do handoff", () => {
    const vetor = importedResume.jobs.find((job) => job.id === "job-vetor");
    const orion = importedResume.jobs.find((job) => job.id === "job-orion");
    const senior = importedResume.jobs.find((job) => job.id === "job-kobo-senior");

    expect(vetor?.period.complete).toBe(false);
    expect(periodsOverlap(orion!.period, senior!.period)).toEqual({
      comparable: true,
      value: true,
    });
  });
});
