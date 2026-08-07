import type { Translations } from "@/lib/i18n/dictionary";
import { parsePeriod, type YearMonth } from "@/lib/resume/period";
import { typed } from "@/lib/resume/origin";

/**
 * Validação das datas digitadas na etapa 02.
 *
 * Toda data tem mês e ano. O campo aceita o que o usuário escreve e valida quando ele
 * sai dali — máscara que reescreve enquanto se digita atrapalha colar, apagar e
 * corrigir, e só impõe o formato em vez de ensiná-lo.
 *
 * A validação reaproveita `parsePeriod` do modelo, para que a etapa 02 e a importação
 * concordem sobre o que é uma data válida.
 */

const ANO_MINIMO = 1900;
const ANO_MAXIMO = 2200;

export type DateValidation =
  | { valid: true; value: YearMonth }
  | { valid: false; message: string }
  | { valid: true; value: null };

/** Campo vazio não é erro: é ausência, e quem exige preenchimento é o formulário. */
export function validateMonthYear(raw: string, t: Translations): DateValidation {
  const texto = raw.trim();
  if (texto.length === 0) return { valid: true, value: null };

  // Só ano: o caso que a importação também recusa completar sozinha.
  if (/^\d{4}$/.test(texto)) {
    return { valid: false, message: t.dates.missingMonth };
  }

  const separado = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec(texto);
  if (!separado) {
    return { valid: false, message: t.dates.invalidFormat };
  }

  const month = Number(separado[1]);
  const year = Number(separado[2]);

  if (month < 1 || month > 12) {
    return { valid: false, message: t.dates.invalidMonth };
  }
  if (year < ANO_MINIMO || year > ANO_MAXIMO) {
    return { valid: false, message: t.dates.invalidFormat };
  }

  // Confere contra o parser do modelo: se ele não reconhece, nós também não.
  const periodo = parsePeriod(`${separado[1]}/${year}`, typed);
  if (periodo.start === null || periodo.start.month === null) {
    return { valid: false, message: t.dates.invalidFormat };
  }

  return { valid: true, value: { month, year } };
}

function indice(data: YearMonth): number {
  return data.year * 12 + (data.month - 1);
}

/**
 * O fim não pode ser anterior ao início. Fim em aberto nunca é anterior a nada, e
 * campo vazio é ausência, não inconsistência.
 */
export function validateRange(
  start: string,
  end: string,
  ongoing: boolean,
  t: Translations,
): { valid: true } | { valid: false; message: string } {
  if (ongoing) return { valid: true };

  const inicio = validateMonthYear(start, t);
  const fim = validateMonthYear(end, t);
  if (!inicio.valid || !fim.valid) return { valid: true };
  if (inicio.value === null || fim.value === null) return { valid: true };

  return indice(fim.value) < indice(inicio.value)
    ? { valid: false, message: t.dates.endBeforeStart }
    : { valid: true };
}
