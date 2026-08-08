import { z } from "zod";
import { OriginSchema, type Origin } from "./origin";

/**
 * Período de experiência ou formação.
 *
 * Toda data tem mês e ano. O que falta não é preenchido com um default: um período
 * importado sem mês fica `complete: false`, com o `raw` intacto e com o ano que se
 * sabe preservado, e é o usuário quem informa o mês. Inferir `01/2018` de `2018`
 * seria um mês que ninguém informou.
 */

/** Data completa: o que o currículo final exige. */
export const YearMonthSchema = z.strictObject({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1900).max(2200),
});

/**
 * Data pela metade: o ano veio no arquivo, o mês não. O `month: null` é explícito
 * para que nenhum consumidor confunda "não sei" com "janeiro".
 */
export const PartialDateSchema = z.strictObject({
  month: z.null(),
  year: z.number().int().min(1900).max(2200),
});

/** Fim em aberto: o rótulo ("atual" / "Present") é da interface, não do modelo. */
export const OpenEndSchema = z.strictObject({ open: z.literal(true) });

export const PeriodStartSchema = z.union([YearMonthSchema, PartialDateSchema]);
export const PeriodEndSchema = z.union([
  YearMonthSchema,
  PartialDateSchema,
  OpenEndSchema,
]);

export type YearMonth = z.infer<typeof YearMonthSchema>;
export type PartialDate = z.infer<typeof PartialDateSchema>;
export type OpenEnd = z.infer<typeof OpenEndSchema>;
export type PeriodStart = z.infer<typeof PeriodStartSchema>;
export type PeriodEnd = z.infer<typeof PeriodEndSchema>;

export function isOpenEnd(end: PeriodEnd): end is OpenEnd {
  return "open" in end;
}

export function isYearMonth(date: PeriodStart | PeriodEnd): date is YearMonth {
  return "month" in date && date.month !== null;
}

export const PeriodSchema = z
  .strictObject({
    /** O texto como veio do arquivo importado ou do usuário. Nunca é descartado. */
    raw: z.string(),
    start: PeriodStartSchema.nullable(),
    end: PeriodEndSchema.nullable(),
    /** Derivado: só é completo quando início e fim têm mês e ano (ou fim em aberto). */
    complete: z.boolean(),
    origin: OriginSchema,
  })
  .refine((period) => period.complete === isComplete(period.start, period.end), {
    message:
      "complete precisa refletir se início e fim têm mês e ano: um período com mês ausente é incompleto.",
    path: ["complete"],
  });

export type Period = z.infer<typeof PeriodSchema>;

function isComplete(start: PeriodStart | null, end: PeriodEnd | null): boolean {
  if (start === null || end === null) return false;
  if (!isYearMonth(start)) return false;
  return isOpenEnd(end) || isYearMonth(end);
}

// ── Normalização ────────────────────────────────────────────────────────────────

/**
 * Separadores de intervalo aceitos. Os travessões dispensam espaço; "até" e "to"
 * exigem, para não partirem uma palavra ao meio. Nada de `\b` em volta de "até": o
 * "é" não é caractere de palavra em regex, e a fronteira nunca casaria.
 */
const RANGE_SEPARATOR = /\s*(?:–|—|−|-)\s*|\s+(?:at[ée]|to)\s+/i;

/** Marcas de fim em aberto, em PT e EN. */
const OPEN_END_TOKENS = new Set([
  "atual",
  "atualmente",
  "presente",
  "present",
  "hoje",
  "momento",
  "o momento",
  "current",
  "now",
  "today",
]);

const ANO_MINIMO = 1900;
const ANO_MAXIMO = 2200;

const YEAR_ONLY = /^(\d{4})$/;

/**
 * Nomes de mês em inglês, completos e abreviados, mapeados para o número do mês.
 *
 * Só inglês: o formato do português é numérico (`mm/aaaa`), e o nome por extenso é a
 * convenção do currículo em inglês. Nada de casar prefixo — "marcos" não é "março".
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Lê mês + ano de uma data solta: numérico (`03/2022`) ou nome do mês em inglês
 * (`Mar 2022`, `March 2022`, `mar/2022`).
 *
 * O `-` não separa data por extenso porque é o separador de intervalo do período — um
 * `Mar-2022` partiria o período em pedaços. Ano fora de 1900–2200 não é data.
 */
export function parseMonthYear(raw: string): YearMonth | null {
  const text = raw.trim().toLowerCase();
  if (text.length === 0) return null;

  const numerico = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec(text);
  if (numerico) {
    const month = Number(numerico[1]);
    const year = Number(numerico[2]);
    if (month < 1 || month > 12 || year < ANO_MINIMO || year > ANO_MAXIMO) return null;
    return { month, year };
  }

  const porNome = /^([a-z]+)(?:\s*\/\s*|\s+)(\d{4})$/.exec(text);
  if (porNome) {
    const month = MONTH_NAMES[porNome[1]];
    const year = Number(porNome[2]);
    if (month === undefined || year < ANO_MINIMO || year > ANO_MAXIMO) return null;
    return { month, year };
  }

  return null;
}

type ParsedSide =
  | { kind: "yearMonth"; value: YearMonth }
  | { kind: "partial"; value: PartialDate }
  | { kind: "open" }
  | { kind: "unrecognized" };

function parseSide(side: string): ParsedSide {
  const text = side.trim().toLowerCase();
  if (text.length === 0) return { kind: "unrecognized" };
  if (OPEN_END_TOKENS.has(text)) return { kind: "open" };

  const monthYear = parseMonthYear(text);
  if (monthYear) return { kind: "yearMonth", value: monthYear };

  const yearOnly = YEAR_ONLY.exec(text);
  if (yearOnly) {
    // O ano é preservado; o mês continua desconhecido.
    return { kind: "partial", value: { month: null, year: Number(yearOnly[1]) } };
  }

  return { kind: "unrecognized" };
}

function toStart(side: ParsedSide): PeriodStart | null {
  if (side.kind === "yearMonth" || side.kind === "partial") return side.value;
  return null;
}

function toEnd(side: ParsedSide): PeriodEnd | null {
  if (side.kind === "open") return { open: true };
  if (side.kind === "yearMonth" || side.kind === "partial") return side.value;
  return null;
}

/**
 * Lê um período escrito à mão. O que não for reconhecido vira período incompleto com
 * o texto original preservado — nunca um mês arbitrado.
 */
export function parsePeriod(raw: string, origin: Origin): Period {
  const sides = raw.split(RANGE_SEPARATOR).filter((side) => side.trim().length > 0);

  const start = sides.length > 0 ? toStart(parseSide(sides[0])) : null;
  const end = sides.length > 1 ? toEnd(parseSide(sides[1])) : null;

  return { raw, start, end, complete: isComplete(start, end), origin };
}

/**
 * O usuário informa o que faltava. Só o mês pode ser completado a partir de uma data
 * parcial; o resto vem inteiro dele.
 */
export function completePeriod(
  period: Period,
  filled: { start?: PeriodStart; end?: PeriodEnd },
): Period {
  const start = filled.start ?? period.start;
  const end = filled.end ?? period.end;
  return { ...period, start, end, complete: isComplete(start, end) };
}

// ── Comparação ──────────────────────────────────────────────────────────────────

/**
 * Comparar exige mês e ano dos dois lados. Um período incompleto não é comparado com
 * um mês assumido: a operação diz que não dá.
 */
export type Comparison<T> =
  { comparable: true; value: T } | { comparable: false; reason: "incomplete" };

const INCOMPARABLE = { comparable: false, reason: "incomplete" } as const;

function monthIndex(date: YearMonth): number {
  return date.year * 12 + (date.month - 1);
}

/** Fim em aberto vale como "ainda em curso": maior que qualquer data conhecida. */
function endIndex(end: PeriodEnd): number {
  return isOpenEnd(end) ? Number.POSITIVE_INFINITY : monthIndex(end as YearMonth);
}

/** Negativo se `a` começa antes de `b`, positivo se depois, zero se no mesmo mês. */
export function comparePeriodStart(a: Period, b: Period): Comparison<number> {
  if (!a.complete || !b.complete) return INCOMPARABLE;
  return {
    comparable: true,
    value: monthIndex(a.start as YearMonth) - monthIndex(b.start as YearMonth),
  };
}

/** Períodos se sobrepõem quando um começa antes de o outro terminar. */
export function periodsOverlap(a: Period, b: Period): Comparison<boolean> {
  if (!a.complete || !b.complete) return INCOMPARABLE;
  const aStart = monthIndex(a.start as YearMonth);
  const bStart = monthIndex(b.start as YearMonth);
  return {
    comparable: true,
    value: aStart <= endIndex(b.end!) && bStart <= endIndex(a.end!),
  };
}

// ── Formatação ──────────────────────────────────────────────────────────────────

function formatDate(date: YearMonth): string {
  return `${String(date.month).padStart(2, "0")}/${date.year}`;
}

/**
 * `mm/aaaa – mm/aaaa`. O rótulo do fim em aberto vem da interface ("atual" em PT,
 * "Present" em EN) — é a única coisa que o idioma do app afeta aqui.
 *
 * Período incompleto devolve o texto original: não há mm/aaaa para mostrar, e
 * inventar um seria o default que a regra proíbe.
 */
export function formatPeriod(period: Period, openEndLabel: string): string {
  if (!period.complete) return period.raw;
  const start = formatDate(period.start as YearMonth);
  const end = isOpenEnd(period.end!) ? openEndLabel : formatDate(period.end as YearMonth);
  return `${start} – ${end}`;
}
