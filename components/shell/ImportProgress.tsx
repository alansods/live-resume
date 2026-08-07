"use client";

import { SegmentedProgress, StageChecklist, type StageItem } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import type { ProgressState } from "@/lib/progress/state";
import styles from "./ImportProgress.module.css";

/**
 * Etapas nomeadas da importação — o contrato que a integração real (progresso vindo do
 * backend) vai preencher no lugar do timer simulado, sem mudar este componente.
 */
export type ImportStage = "extract" | "split" | "normalize-dates" | "flag-unmetriced";

export const IMPORT_STAGES: readonly ImportStage[] = [
  "extract",
  "split",
  "normalize-dates",
  "flag-unmetriced",
];

export function ImportProgress({
  fileName,
  state,
}: {
  fileName: string;
  state: ProgressState<ImportStage>;
}) {
  const t = useT();

  const rotulos: Record<ImportStage, string> = {
    extract: t.progress.importStage1,
    split: t.progress.importStage2,
    "normalize-dates": t.progress.importStage3,
    "flag-unmetriced": t.progress.importStage4,
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

  /*
   * Etapas **concluídas**, e não a corrente entre elas.
   *
   * Contar a etapa em andamento como concluída (`stageIndex + 1`) fazia a barra bater
   * 100% assim que o timer chegava à última etapa — e o timer chega lá muito antes da
   * chamada real, que é quem termina a operação. O usuário via 100% com a requisição
   * ainda pendente e o checklist ainda girando: três indicadores, um deles mentindo.
   *
   * Agora o número diz o mesmo que o checklist ao lado: quantos itens já têm o check.
   * 100% só existe em `done`, que só acontece quando `finish()` é chamado.
   */
  const concluidas = state.mode === "done" ? state.stages.length : state.stageIndex;
  const percentual = Math.round((concluidas / state.stages.length) * 100);

  return (
    <div className={styles.card} role="status" aria-live="polite">
      <div className={styles.header}>
        <span className={styles.corpo}>
          <span className={styles.nome}>{fileName}</span>
          <span className={styles.legenda}>
            {rotulos[state.stages[state.stageIndex]]}
          </span>
        </span>
        <span className={styles.percentual}>{percentual}%</span>
      </div>
      <SegmentedProgress total={10} filled={Math.round((percentual / 100) * 10)} />
      <StageChecklist items={items} />
      <p className={styles.reload}>{t.wait.reload}</p>
    </div>
  );
}
