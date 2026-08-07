"use client";

import { StageChecklist, type StageItem } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import type { ProgressState } from "@/lib/progress/state";
import styles from "./ExportProgress.module.css";

/**
 * Etapas nomeadas da exportação: um nome de arquivo de download por etapa, na ordem em
 * que idiomas × formatos foram combinados.
 */
export type ExportStage = string;

export function ExportProgress({ state }: { state: ProgressState<ExportStage> }) {
  const t = useT();
  const total = state.stages.length;
  const atual = state.mode === "done" ? total : state.stageIndex + 1;

  const items: StageItem[] = state.stages.map((arquivo, indice) => ({
    label: arquivo,
    state:
      state.mode === "done" || indice < state.stageIndex
        ? "done"
        : indice === state.stageIndex
          ? "active"
          : "pending",
  }));

  return (
    <div className={styles.card} role="status" aria-live="polite">
      <div className={styles.header}>
        <span className={styles.titulo}>{t.progress.exportGenerating}</span>
        <span className={styles.contador}>
          {t.progress.exportCounter
            .replace("{current}", String(atual))
            .replace("{total}", String(total))}
        </span>
      </div>
      <StageChecklist items={items} />
      <p className={styles.reload}>{t.wait.reload}</p>
    </div>
  );
}
