"use client";

import styles from "./SegmentedProgress.module.css";

/**
 * Barra de progresso em segmentos fixos — não uma barra contínua de largura livre.
 *
 * Cada segmento marca uma fração igual do total; `filled` é quantos já estão
 * preenchidos. Ela não representa tempo (a change `async-progress-states` proíbe
 * estimar tempo restante) — representa etapas nomeadas concluídas.
 */

export function SegmentedProgress({
  total = 10,
  filled,
}: {
  total?: number;
  filled: number;
}) {
  return (
    <span className={styles.track} aria-hidden>
      {Array.from({ length: total }, (_, indice) => (
        <span
          key={indice}
          className={indice < filled ? styles.segmentFilled : styles.segment}
        />
      ))}
    </span>
  );
}
