import { describe, expect, test } from "vitest";
import { imported } from "@/lib/resume/origin";
import { parsePeriod } from "@/lib/resume/period";
import { formatPeriodForLocale } from "./dates";

const periodo = (raw: string) => parsePeriod(raw, imported);

describe("Data renderizada no formato do idioma", () => {
  test("Data em português usa mm/aaaa", () => {
    expect(formatPeriodForLocale(periodo("03/2022 – 12/2024"), "pt")).toBe(
      "03/2022 – 12/2024",
    );
  });

  test("Data em inglês usa mês abreviado", () => {
    expect(formatPeriodForLocale(periodo("03/2022 – 12/2024"), "en")).toBe(
      "Mar 2022 – Dec 2024",
    );
  });

  test("Fim aberto usa o rótulo do idioma", () => {
    const emCurso = periodo("01/2025 – atual");

    expect(formatPeriodForLocale(emCurso, "pt")).toBe("01/2025 – atual");
    expect(formatPeriodForLocale(emCurso, "en")).toBe("Jan 2025 – Present");
  });

  test("Período incompleto sai com o texto do arquivo", () => {
    const semMes = periodo("2018 - 2019");
    expect(semMes.complete).toBe(false);

    // Nenhum mês inventado, em nenhum dos dois idiomas.
    expect(formatPeriodForLocale(semMes, "pt")).toBe("2018 - 2019");
    expect(formatPeriodForLocale(semMes, "en")).toBe("2018 - 2019");
  });

  test("Todo mês do ano tem abreviação em inglês", () => {
    const abreviacoes = Array.from({ length: 12 }, (_, i) =>
      formatPeriodForLocale(
        periodo(`${String(i + 1).padStart(2, "0")}/2024 – atual`),
        "en",
      ),
    );

    expect(abreviacoes.map((texto) => texto.split(" ")[0])).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });
});
