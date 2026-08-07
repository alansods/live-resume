import { newItemId } from "@/lib/resume/ids";
import { educationPeriodPath, jobPeriodPath, type ResumePath } from "@/lib/resume/paths";
import {
  isOpenEnd,
  isYearMonth,
  periodsOverlap,
  type Period,
  type YearMonth,
} from "@/lib/resume/period";
import type { Resume } from "@/lib/resume/schema";
import type { Suggestion } from "./model";

/**
 * Sugestões de data.
 *
 * Duas coisas exigem atenção: períodos que se sobrepõem e períodos sem mês. As duas
 * são resolvidas por aritmética de calendário — não há julgamento aqui que justifique
 * chamar um modelo, e manter a IA fora deixa toda escolha de data numa regra fixa que
 * dá para ler no código e explicar ao usuário.
 *
 * A distinção que atravessa o módulo:
 * - **derivado** é mês calculado de uma data que o usuário escreveu;
 * - **inferido** é mês escolhido pelo app.
 *
 * Só o segundo aciona o aviso da revisão.
 */

export type InferredPeriod = {
  path: ResumePath;
  /** O que estava no arquivo. */
  original: string;
  /** O período completo que o app propôs. */
  proposed: string;
};

export type DateSuggestionsResult = {
  suggestions: Suggestion[];
  /** Períodos cujo mês o app escolheu, e não derivou do material do usuário. */
  inferred: InferredPeriod[];
  /** A revisão precisa exibir o aviso de datas organizadas. */
  requiresDisclosure: boolean;
};

export type DateSuggestionsOptions = {
  makeId?: () => string;
};

const MESES = 12;

function indice(data: YearMonth): number {
  return data.year * MESES + (data.month - 1);
}

function deIndice(valor: number): YearMonth {
  return { year: Math.floor(valor / MESES), month: (valor % MESES) + 1 };
}

function formata(data: YearMonth): string {
  return `${String(data.month).padStart(2, "0")}/${data.year}`;
}

/** Início de um período completo, para ordenar e comparar. */
function inicioDe(period: Period): YearMonth | null {
  return period.start !== null && isYearMonth(period.start) ? period.start : null;
}

function fimDe(period: Period): YearMonth | null {
  if (period.end === null || isOpenEnd(period.end)) return null;
  return isYearMonth(period.end) ? period.end : null;
}

/** Texto do período completo, com o fim em aberto marcado por reticências do modelo. */
function textoDoPeriodo(start: YearMonth, end: YearMonth | "open"): string {
  return `${formata(start)} – ${end === "open" ? "…" : formata(end)}`;
}

// ── Sobreposição ────────────────────────────────────────────────────────────────

type Sobreposicao = {
  anterior: number;
  seguinte: number;
  meses: number;
};

function encontrarSobreposicoes(resume: Resume): Sobreposicao[] {
  const pares: Sobreposicao[] = [];

  for (let i = 0; i < resume.jobs.length; i += 1) {
    for (let j = i + 1; j < resume.jobs.length; j += 1) {
      const a = resume.jobs[i].period;
      const b = resume.jobs[j].period;

      // Período incompleto não é comparado: um mês desconhecido não pode ser
      // assumido para calcular sobreposição.
      const resultado = periodsOverlap(a, b);
      if (!resultado.comparable || !resultado.value) continue;

      const inicioA = inicioDe(a);
      const inicioB = inicioDe(b);
      if (inicioA === null || inicioB === null) continue;

      // Quem começou antes é o "anterior"; é o período dele que a correção ajusta.
      const [anterior, seguinte] = indice(inicioA) <= indice(inicioB) ? [i, j] : [j, i];

      const inicioSeguinte = indice(inicioDe(resume.jobs[seguinte].period)!);
      const fimAnterior = fimDe(resume.jobs[anterior].period);
      const fimIndice =
        fimAnterior === null ? Number.POSITIVE_INFINITY : indice(fimAnterior);
      const fimSeguinte = fimDe(resume.jobs[seguinte].period);
      const ultimoComum = Math.min(
        fimIndice,
        fimSeguinte === null ? Number.POSITIVE_INFINITY : indice(fimSeguinte),
      );

      const meses = Number.isFinite(ultimoComum)
        ? ultimoComum - inicioSeguinte + 1
        : Number.POSITIVE_INFINITY;

      pares.push({ anterior, seguinte, meses: Number.isFinite(meses) ? meses : 0 });
    }
  }

  return pares;
}

// ── Períodos incompletos ────────────────────────────────────────────────────────

type Organizado = {
  start: YearMonth;
  end: YearMonth | "open";
  /** O app escolheu ao menos um dos meses. */
  inferido: boolean;
  /** Data do usuário que serviu de base, quando houve derivação. */
  base: string | null;
};

/**
 * Completa um período preservando os anos do arquivo. Deriva o mês de uma data
 * vizinha quando dá; só então infere — início vira janeiro, fim vira dezembro.
 */
function organizar(
  period: Period,
  vizinhoSeguinte: Period | undefined,
): Organizado | null {
  const anoInicio =
    period.start !== null && "year" in period.start ? period.start.year : null;
  if (anoInicio === null) return null;

  let inferido = false;
  let base: string | null = null;

  const start: YearMonth = isYearMonth(period.start!)
    ? (period.start as YearMonth)
    : ((inferido = true), { month: 1, year: anoInicio });

  if (period.end !== null && isOpenEnd(period.end)) {
    return { start, end: "open", inferido, base };
  }

  const anoFim = period.end !== null && "year" in period.end ? period.end.year : null;
  if (anoFim === null) return null;

  let end: YearMonth;
  if (isYearMonth(period.end!)) {
    end = period.end as YearMonth;
  } else {
    // Derivar do início da experiência seguinte, quando ela cai no mesmo ano.
    const inicioVizinho = vizinhoSeguinte ? inicioDe(vizinhoSeguinte) : null;
    if (
      inicioVizinho !== null &&
      inicioVizinho.year === anoFim &&
      inicioVizinho.month > 1
    ) {
      end = deIndice(indice(inicioVizinho) - 1);
      base = formata(inicioVizinho);
    } else {
      end = { month: MESES, year: anoFim };
      inferido = true;
    }
  }

  return { start, end, inferido, base };
}

// ── Geração ─────────────────────────────────────────────────────────────────────

export function suggestDates(
  resume: Resume,
  options: DateSuggestionsOptions = {},
): DateSuggestionsResult {
  const makeId = options.makeId ?? (() => newItemId() as string);
  const porPath = new Map<string, Suggestion>();
  const inferred: InferredPeriod[] = [];

  // Sobreposição primeiro: ela traz proposta derivada, e um trecho só aceita uma
  // sugestão de data.
  for (const par of encontrarSobreposicoes(resume)) {
    const anterior = resume.jobs[par.anterior];
    const seguinte = resume.jobs[par.seguinte];
    const inicioSeguinte = inicioDe(seguinte.period)!;
    const inicioAnterior = inicioDe(anterior.period)!;

    // Sem base para derivar um fim válido.
    if (indice(inicioSeguinte) - 1 < indice(inicioAnterior)) continue;

    const novoFim = deIndice(indice(inicioSeguinte) - 1);
    const path = String(jobPeriodPath(anterior.id));
    if (porPath.has(path)) continue;

    porPath.set(path, {
      id: makeId(),
      kind: "dates",
      path,
      where: `${anterior.company} ⇄ ${seguinte.company}`,
      title: `Períodos sobrepostos em ${par.meses} ${par.meses === 1 ? "mês" : "meses"}`,
      before: anterior.period.raw,
      after: textoDoPeriodo(inicioAnterior, novoFim),
      why: `Você começou em ${seguinte.company} em ${formata(inicioSeguinte)}, e este período segue depois disso. Se não foi trabalho paralelo, a saída provável é ${formata(novoFim)}.`,
      action: "fixDate",
      unsupportedNumbers: [],
    });
  }

  const organizarLista = (
    itens: { id: string; period: Period; rotulo: string }[],
    caminho: (id: string) => ResumePath,
  ) => {
    itens.forEach((item, indiceItem) => {
      if (item.period.complete) return;

      const vizinho = itens[indiceItem + 1]?.period;
      const organizado = organizar(item.period, vizinho);
      if (organizado === null) return;

      const path = String(caminho(item.id));
      if (porPath.has(path)) return;

      const after = textoDoPeriodo(organizado.start, organizado.end);
      const origem = organizado.base
        ? ` O mês veio de ${organizado.base}, que você informou.`
        : " Os meses foram organizados pelo app; confira se correspondem ao que você viveu.";

      porPath.set(path, {
        id: makeId(),
        kind: "dates",
        path,
        where: item.rotulo,
        title: "Data sem mês",
        before: item.period.raw,
        after,
        why: `Sistemas de recrutamento calculam tempo de experiência a partir de mm/aaaa; "${item.period.raw}" fica ambíguo.${origem}`,
        action: "normalize",
        unsupportedNumbers: [],
      });

      if (organizado.inferido) {
        inferred.push({
          path: caminho(item.id),
          original: item.period.raw,
          proposed: after,
        });
      }
    });
  };

  organizarLista(
    resume.jobs.map((job) => ({
      id: job.id,
      period: job.period,
      rotulo: job.role ? `${job.company} · ${job.role}` : job.company,
    })),
    (id) => jobPeriodPath(id as never),
  );

  organizarLista(
    resume.education.map((item) => ({
      id: item.id,
      period: item.period,
      rotulo: `${item.course} · ${item.school}`,
    })),
    (id) => educationPeriodPath(id as never),
  );

  return {
    suggestions: [...porPath.values()],
    inferred,
    requiresDisclosure: inferred.length > 0,
  };
}
