import { describe, expect, test } from "vitest";
import { priceForLocale } from "./pricing";

describe("Preço por idioma", () => {
  test("português cobra em reais", () => {
    expect(priceForLocale("pt")).toEqual({ amount: 200, currency: "brl" });
  });

  test("inglês cobra em dólares", () => {
    expect(priceForLocale("en")).toEqual({ amount: 40, currency: "usd" });
  });

  test("idioma desconhecido cai no padrão em dólares", () => {
    expect(priceForLocale("fr")).toEqual({ amount: 40, currency: "usd" });
  });
});
