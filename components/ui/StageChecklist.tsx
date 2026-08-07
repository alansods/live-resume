"use client";

import { CheckCircle, Circle, CircleNotch } from "@phosphor-icons/react";
import styles from "./StageChecklist.module.css";

export type StageItemState = "done" | "active" | "pending";

export type StageItem = {
  label: string;
  state: StageItemState;
};

const ICONE: Record<StageItemState, typeof CheckCircle> = {
  done: CheckCircle,
  active: CircleNotch,
  pending: Circle,
};

/**
 * Só a etapa cumprida é sólida. O anel que gira fica no traço: preenchido, o disco do
 * `CircleNotch` vira fundo e engole o próprio recorte que indica o giro.
 */
const PESO_DO_ICONE: Record<StageItemState, "fill" | "bold" | "regular"> = {
  done: "fill",
  active: "bold",
  pending: "regular",
};

/**
 * Checklist de etapas nomeadas, usado nos três cartões de progresso.
 *
 * O ícone e a cor do texto são a única forma de estado — não há barra por item, para
 * não duplicar o que `SegmentedProgress` já mostra na importação.
 */

export function StageChecklist({ items }: { items: readonly StageItem[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item, indice) => {
        const Icone = ICONE[item.state];
        return (
          <li key={indice} className={styles.item}>
            <Icone
              size={16}
              weight={PESO_DO_ICONE[item.state]}
              className={
                item.state === "active"
                  ? `${styles.icon} ${styles.iconActive} ${styles[item.state]}`
                  : `${styles.icon} ${styles[item.state]}`
              }
              aria-hidden
            />
            <span
              className={item.state === "pending" ? styles.labelPending : styles.label}
            >
              {item.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
