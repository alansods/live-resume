"use client";

import { CheckCircle, Warning } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import styles from "./Toast.module.css";

/**
 * Aviso flutuante e passageiro — diferente de `Notice`, que fica fixo dentro da coluna
 * da etapa. Existe para feedback de algo que aconteceu **fora** da página (o retorno do
 * Checkout do Stripe): a pessoa saiu do app, voltou, e precisa de uma confirmação rápida
 * do que aconteceu enquanto esteve fora, sem que essa confirmação ocupe espaço permanente
 * na tela.
 */

export type ToastTone = "success" | "warning" | "failure";

const ICONE: Record<ToastTone, typeof CheckCircle> = {
  success: CheckCircle,
  warning: Warning,
  failure: Warning,
};

const CLASSE_DO_TOM: Record<ToastTone, string> = {
  success: styles.success,
  warning: styles.warning,
  failure: styles.failure,
};

export function Toast({ tone, children }: { tone: ToastTone; children: ReactNode }) {
  const Icone = ICONE[tone];
  return (
    <div
      className={`${styles.toast} ${CLASSE_DO_TOM[tone]}`}
      role="status"
      aria-live="polite"
    >
      <Icone size={18} className={styles.icon} aria-hidden />
      <span className={styles.corpo}>{children}</span>
    </div>
  );
}
