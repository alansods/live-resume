/**
 * Preço da sessão de importação, pelo idioma da interface — nunca por geolocalização.
 *
 * Cobre o custo da chamada de IA da importação (ver proposal.md da change
 * `payments-checkout`). Português cobra em reais, qualquer outro idioma cobra em
 * dólares — hoje só existe `en` além de `pt`, mas a função não assume que a lista para.
 */

export type PriceLocale = "pt" | "en";

export type Price = {
  /** Valor em centavos, como o Stripe espera. */
  amount: number;
  currency: "brl" | "usd";
};

const PRECOS: Record<PriceLocale, Price> = {
  pt: { amount: 200, currency: "brl" },
  en: { amount: 40, currency: "usd" },
};

export function priceForLocale(locale: string): Price {
  return locale === "pt" ? PRECOS.pt : PRECOS.en;
}
