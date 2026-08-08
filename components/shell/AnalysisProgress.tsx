"use client";

import { StageChecklist, type StageItem } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import type { ProgressState } from "@/lib/progress/state";
import shell from "./Shell.module.css";
import styles from "./AnalysisProgress.module.css";

/** Etapas nomeadas da análise — mesmo contrato de nomes para a integração real futura. */
export type AnalysisStage =
  "read" | "merge-updates" | "find-unmetriced" | "check-dates" | "apply-ats";

export const ANALYSIS_STAGES: readonly AnalysisStage[] = [
  "read",
  "merge-updates",
  "find-unmetriced",
  "check-dates",
  "apply-ats",
];

export function AnalysisProgress({ state }: { state: ProgressState<AnalysisStage> }) {
  const t = useT();

  const rotulos: Record<AnalysisStage, string> = {
    read: t.progress.analysisStage1,
    "merge-updates": t.progress.analysisStage2,
    "find-unmetriced": t.progress.analysisStage3,
    "check-dates": t.progress.analysisStage4,
    "apply-ats": t.progress.analysisStage5,
  };

  const items: StageItem[] = state.stages.map((etapa, indice) => ({
    label: rotulos[etapa],
    state:
      state.mode === "done" || indice < state.stageIndex
        ? "done"
        : indice === state.stageIndex
          ? "active"
          : "pending",
  }));

  return (
    <div
      className={`${shell.stepColumn} ${styles.column}`}
      role="status"
      aria-live="polite"
    >
      <h3 className={styles.title}>{t.progress.analysisTitle}</h3>
      <p className={styles.detail}>{t.progress.analysisDetail}</p>
      {/*
        Sem skeleton abaixo do checklist: as etapas nomeadas logo acima já dizem que algo
        está acontecendo, e barras cinzas prometeriam um formato de resultado que a
        revisão não tem.
      */}
      <StageChecklist items={items} />
      <p className={styles.reload}>{t.wait.reload}</p>
    </div>
  );
}
