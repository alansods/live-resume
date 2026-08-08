import type { Translations } from "@/lib/i18n/dictionary";
import { resultadoDaData } from "@/lib/update-intake/valid";
import type { YearMonth } from "@/lib/resume/period";
import type { ItemKind } from "./state";

/**
 * Validação das datas digitadas na etapa 02.
 *
 * Toda data tem mês e ano. Enquanto se digita, a máscara do campo só insere a barra
 * de separação (mm/aaaa); a validação acontece ao sair do campo e, no modal, é
 * recalculada a cada tecla para marcar o erro no próprio campo.
 *
 * A validação reaproveita `parsePeriod` do modelo, para que a etapa 02 e a importação
 * concordem sobre o que é uma data válida.
 */

export type DateValidation =
  | { valid: true; value: YearMonth }
  | { valid: false; message: string }
  | { valid: true; value: null };

/** Campo vazio não é erro: é ausência, e quem exige preenchimento é o formulário. */
export function validateMonthYear(raw: string, t: Translations): DateValidation {
  const resultado = resultadoDaData(raw);
  if (resultado.ok) return { valid: true, value: resultado.valor };
  switch (resultado.motivo) {
    case "soAno":
      return { valid: false, message: t.dates.missingMonth };
    case "mesFora":
      return { valid: false, message: t.dates.invalidMonth };
    case "invalido":
      return { valid: false, message: t.dates.invalidFormat };
  }
}

function indice(data: YearMonth | null): number {
  if (!data) return 0;
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

  return indice(fim.value!) < indice(inicio.value!)
    ? { valid: false, message: t.dates.endBeforeStart }
    : { valid: true };
}

// ── O botão "Adicionar" do modal ───────────────────────────────────────────────

/** Os identificadores sem os quais o item não existe, por tipo. */
const OBRIGATORIOS: Record<ItemKind, readonly string[]> = {
  education: ["course", "school"],
  experience: ["company", "role"],
  skill: ["name"],
};

/** Os campos de data de cada tipo. Vazios seguram o Adicionar; preenchidos, precisam ser válidos. */
const CAMPOS_DE_DATA: Record<ItemKind, readonly string[]> = {
  education: ["start", "finish"],
  experience: ["start", "end"],
  skill: [],
};

export type IntakeValidity = {
  valid: boolean;
  /** Os obrigatórios e as datas vazios — o que mantém o botão desabilitado. */
  missing: readonly string[];
  /** Campo de data preenchido com valor inválido, quando houver. */
  dateError?: { field: string; message: string };
};

/**
 * O que libera o "Adicionar" do modal: identificadores e datas preenchidos e válidos.
 * Item sem período não é item — quem quer acrescentar de verdade preenche o essencial;
 * data ilegível entraria no currículo como período quebrado. O fim só é dispensado
 * quando o item está "em andamento", porque o próprio campo fica desabilitado.
 */
export function validateIntake(
  kind: ItemKind,
  texto: (campo: string) => string,
  ongoing: boolean,
  t: Translations,
): IntakeValidity {
  const missing = OBRIGATORIOS[kind].filter(
    (campo) => texto(campo).trim().length === 0,
  );

  for (const campo of CAMPOS_DE_DATA[kind]) {
    const valor = texto(campo).trim();
    if (valor.length === 0) {
      if (campo === "end" && ongoing) continue; // em andamento dispensa o fim
      missing.push(campo);
      continue;
    }

    const resultado = validateMonthYear(valor, t);
    if (!resultado.valid) {
      return {
        valid: false,
        missing,
        dateError: { field: campo, message: resultado.message },
      };
    }
  }

  const campoFim = kind === "education" ? "finish" : "end";
  const range = validateRange(texto("start"), texto(campoFim), ongoing, t);
  if (!range.valid) {
    return {
      valid: false,
      missing,
      dateError: { field: campoFim, message: range.message },
    };
  }

  return { valid: missing.length === 0, missing };
}