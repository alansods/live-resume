import type { ExportFormat } from "@/lib/export/filename";
import type { Locale } from "@/lib/i18n/dictionary";
import type { ImportReport } from "@/lib/parsing/report";
import type { Patch } from "@/lib/resume/generate";
import { resolvePath } from "@/lib/resume/paths";
import type { Resume } from "@/lib/resume/schema";
import type { Suggestion } from "@/lib/suggestions/model";
import { emptyIntake, type IntakeContent } from "@/lib/update-intake/content";
import { mergeIntake } from "@/lib/update-intake/merge";
import { conteudoValido } from "@/lib/update-intake/valid";

/**
 * Estado do fluxo.
 *
 * Ele mora aqui, num ponto só, e as etapas continuam recebendo tudo por props — foi
 * decisão das changes delas, e é o que permite montá-las sem tocar em nenhuma. O shell é
 * o único lugar do app que conhece `fetch`.
 *
 * Existem dois currículos: o **importado**, que é o arquivo do usuário com as datas que
 * ele completou, e o **em trabalho**, que é o importado mais o que ele digitou na etapa
 * 02. O segundo é derivado, nunca guardado: ele é refeito a partir do primeiro a cada
 * leitura, e é por isso que voltar à etapa 02 e editar recompõe em vez de acumular.
 *
 * Navegar não descarta nada. Só recarregar a página zera — não há storage, por decisão
 * de produto.
 */

export const steps = [1, 2, 3, 4] as const;
export type Step = (typeof steps)[number];

/** Por que as sugestões da IA não vieram inteiras, ou `null` se vieram. */
export type SuggestionsFailure = null | "partial" | "quota";

export type FlowState = {
  step: Step;
  /** O currículo importado, com as datas que o usuário completou. Sem ele não há fluxo. */
  imported: Resume | null;
  fileName: string | null;
  /** O relatório da importação: é dele que saem os períodos a completar. */
  report: ImportReport | null;
  /** O que o usuário digitou na etapa 02. */
  intake: IntakeContent;
  /**
   * O que a etapa 02 emitiu é válido (identificadores preenchidos, datas legíveis).
   * Sem isto o fluxo avançaria com item quebrado — data ilegível vira período quebrado
   * no currículo em trabalho.
   */
  intakeValid: boolean;
  /** Sugestões, pedidas uma vez ao entrar na revisão. `null` = ainda não pedidas. */
  suggestions: Suggestion[] | null;
  requiresDateNotice: boolean;
  /**
   * O que faltou nas sugestões, quando faltou. `"partial"` é uma rota que caiu;
   * `"quota"` é o limite diário da IA, que pede um aviso diferente — tentar de novo
   * hoje não muda nada.
   */
  suggestionsFailure: SuggestionsFailure;
  /** Ids marcados na etapa 03. */
  selected: ReadonlySet<string>;
  locales: readonly Locale[];
  formats: readonly ExportFormat[];
  /**
   * A tela de conclusão da etapa 04, com os arquivos desta exportação — ou `null`
   * quando não há uma exportação concluída para mostrar. É o único estado de TELA (não
   * de currículo) que sobrevive à navegação: "ajustar e exportar outra versão" volta à
   * etapa 03 e depois pode voltar à 04, e nesse ponto o formulário — não a conclusão —
   * deve reaparecer.
   */
  exportCompletion: { files: readonly string[]; partialFailure: boolean } | null;
};

export const initialFlowState: FlowState = {
  step: 1,
  imported: null,
  fileName: null,
  report: null,
  intake: emptyIntake,
  intakeValid: true,
  suggestions: null,
  requiresDateNotice: false,
  suggestionsFailure: null,
  selected: new Set(),
  locales: ["pt"],
  formats: ["pdf"],
  exportCompletion: null,
};

/**
 * Sem currículo importado não se sai da etapa 01.
 *
 * É a primeira trava do fluxo. A segunda é a etapa 02: avançar dela exige conteúdo
 * válido — o que ela emite vira período do currículo em trabalho, e data ilegível
 * entraria como período quebrado. Passar pela etapa 02 sem digitar nada continua
 * legítimo (talvez nada tenha mudado), e pela 03 sem marcar nada também: a geração
 * ainda reformata o documento inteiro.
 */
export function canLeaveImport(state: FlowState): boolean {
  return state.imported !== null;
}

/**
 * Chega-se a uma etapa se a de antes já foi aberta. Voltar nunca é travado; ir à 03
 * ou 04 a partir da 02 (ou antes dela) exige conteúdo válido na 02.
 */
export function canGoTo(state: FlowState, step: Step): boolean {
  if (!canLeaveImport(state)) return step === 1;
  if (step > 2 && state.step <= 2 && !state.intakeValid) return false;
  return true;
}

export function canGoNext(state: FlowState): boolean {
  return (
    state.step < 4 &&
    canLeaveImport(state) &&
    (state.step !== 2 || state.intakeValid)
  );
}

export function canGoBack(state: FlowState): boolean {
  return state.step > 1;
}

/**
 * Sair da etapa 04 limpa a conclusão da exportação: ela só faz sentido enquanto se está
 * nela, e reaparecer sozinha ao voltar seria mostrar uma exportação que talvez nem
 * corresponda mais à seleção corrente de idiomas e formatos.
 */
function movendo(state: FlowState, step: Step): FlowState {
  return state.step === 4 && step !== 4
    ? { ...state, step, exportCompletion: null }
    : { ...state, step };
}

export function goTo(state: FlowState, step: Step): FlowState {
  return canGoTo(state, step) ? movendo(state, step) : state;
}

export function next(state: FlowState): FlowState {
  return canGoNext(state) ? movendo(state, (state.step + 1) as Step) : state;
}

export function back(state: FlowState): FlowState {
  return canGoBack(state) ? movendo(state, (state.step - 1) as Step) : state;
}

export function withResume(
  state: FlowState,
  resume: Resume,
  fileName: string,
  report: ImportReport | null = null,
): FlowState {
  // Currículo novo invalida tudo que dependia do anterior: as sugestões apontam para
  // ids que já não existem, e o que foi digitado era sobre outro currículo.
  return {
    ...state,
    imported: resume,
    fileName,
    report,
    intake: emptyIntake,
    intakeValid: true,
    suggestions: null,
    requiresDateNotice: false,
    suggestionsFailure: null,
    selected: new Set(),
  };
}

/** O que a etapa 02 emitiu. A validade acompanha o conteúdo: item quebrado trava o fluxo. */
export function withIntake(state: FlowState, intake: IntakeContent): FlowState {
  return { ...state, intake, intakeValid: conteudoValido(intake) };
}

export function withSuggestions(
  state: FlowState,
  suggestions: Suggestion[],
  requiresDateNotice: boolean,
  failure: SuggestionsFailure = null,
): FlowState {
  return { ...state, suggestions, requiresDateNotice, suggestionsFailure: failure };
}

export function withSelection(
  state: FlowState,
  selected: ReadonlySet<string>,
): FlowState {
  return { ...state, selected };
}

export function withExportCompletion(
  state: FlowState,
  files: readonly string[],
  partialFailure = false,
): FlowState {
  return { ...state, exportCompletion: { files, partialFailure } };
}

export function clearExportCompletion(state: FlowState): FlowState {
  return { ...state, exportCompletion: null };
}

// ── Derivados ───────────────────────────────────────────────────────────────────

/**
 * O currículo em trabalho: o importado mais o que o usuário digitou.
 *
 * É o que circula pelas etapas 03 e 04. O importado fica como origem da fusão, para que
 * reeditar a etapa 02 recomponha o resultado em vez de somar ao anterior.
 */
export function workingResume(state: FlowState): Resume | null {
  if (state.imported === null) return null;
  return mergeIntake(state.imported, state.intake).resume;
}

/**
 * O que o usuário digitou e não virou item do currículo. Vai às sugestões como material
 * dele, para conferir os números que a IA propõe — nunca entra no currículo.
 */
export function workingLeftovers(state: FlowState): string[] {
  if (state.imported === null) return [];
  return mergeIntake(state.imported, state.intake).leftovers;
}

/**
 * Os patches que vão à exportação: os das sugestões marcadas cujo trecho ainda existe.
 *
 * Uma sugestão pode ter ficado órfã — o usuário marcou e depois removeu, na etapa 02, o
 * item que ela endereçava. `generateFinal` recusaria o conjunto inteiro, e com razão;
 * quem sabe que o item pode ter sumido é o shell, então é aqui que ela é descartada.
 */
export function selectedPatches(state: FlowState): Patch[] {
  const resume = workingResume(state);
  if (resume === null) return [];

  return (state.suggestions ?? [])
    .filter((sugestao) => state.selected.has(sugestao.id))
    .filter((sugestao) => {
      try {
        resolvePath(resume, sugestao.path);
        return true;
      } catch {
        return false;
      }
    })
    .map((sugestao) => ({ path: sugestao.path, text: sugestao.after }));
}

function alternar<T>(lista: readonly T[], valor: T): T[] {
  return lista.includes(valor)
    ? lista.filter((item) => item !== valor)
    : [...lista, valor];
}

export function toggleLocale(state: FlowState, locale: Locale): FlowState {
  return { ...state, locales: alternar(state.locales, locale) };
}

export function toggleFormat(state: FlowState, format: ExportFormat): FlowState {
  return { ...state, formats: alternar(state.formats, format) };
}
