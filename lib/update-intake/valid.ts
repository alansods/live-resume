import type { IntakeContent } from "./content";
import { parseMonthYear, type YearMonth } from "@/lib/resume/period";

/**
 * Validade do que o usuário digitou na etapa 02, sem mensagens — o portão de navegação
 * (o shell) só pergunta "isto está pronto?", e as mensagens são da tela, que já as mostra
 * campo a campo.
 *
 * A regra é a mesma do modal: identificadores obrigatórios e data válida quando preenchida.
 * Viver aqui, e não no componente, é o que permite ao shell travar a navegação sem depender
 * de tela.
 */

const ANO_MINIMO = 1900;
const ANO_MAXIMO = 2200;

export type ResultadoDeData =
  | { ok: true; valor: YearMonth | null }
  | { ok: false; motivo: "soAno" | "mesFora" | "invalido" };

export function resultadoDaData(raw: string): ResultadoDeData {
  const texto = raw.trim();
  if (texto.length === 0) return { ok: true, valor: null };
  if (/^\d{4}$/.test(texto)) return { ok: false, motivo: "soAno" };
  const numerico = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec(texto);
  if (numerico) {
    const month = Number(numerico[1]);
    const year = Number(numerico[2]);
    if (month < 1 || month > 12) return { ok: false, motivo: "mesFora" };
    if (year < ANO_MINIMO || year > ANO_MAXIMO) return { ok: false, motivo: "invalido" };
    return { ok: true, valor: { month, year } };
  }
  const porNome = parseMonthYear(texto);
  if (porNome === null) return { ok: false, motivo: "invalido" };
  return { ok: true, valor: porNome };
}

/** Mensagem livre: o portão da navegação pergunta só "isto é data válida?". */
export function monthYearValido(raw: string): boolean {
  return resultadoDaData(raw).ok;
}

function indice(data: YearMonth): number {
  return data.year * 12 + (data.month - 1);
}

/** Fim não pode ser anterior ao início; fim em aberto e campo vazio são ausência. */
function rangeValido(inicio: string, fim: string, ongoing: boolean): boolean {
  if (ongoing) return true;
  const a = resultadoDaData(inicio);
  const b = resultadoDaData(fim);
  if (!a.ok || !b.ok) return true; // data inválida é pega pela própria regra
  if (a.valor === null || b.valor === null) return true; // ausência não é inconsistência
  return indice(b.valor) >= indice(a.valor);
}

function vazio(s: string): boolean {
  return s.trim().length === 0;
}

export function conteudoValido(content: IntakeContent): boolean {
  for (const item of content.education) {
    if (vazio(item.course) || vazio(item.school)) return false;
    if (!monthYearValido(item.start) || !monthYearValido(item.finish)) return false;
    if (!rangeValido(item.start, item.finish, false)) return false;
  }
  for (const item of content.experience) {
    if (vazio(item.company) || vazio(item.role)) return false;
    if (!monthYearValido(item.start) || !monthYearValido(item.end)) return false;
    if (!rangeValido(item.start, item.end, item.ongoing)) return false;
  }
  for (const item of content.skills) {
    if (vazio(item.name)) return false;
  }
  return true;
}