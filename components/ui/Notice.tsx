"use client";

import { Warning } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import styles from "./Notice.module.css";

/**
 * Avisos que não têm cartão de progresso próprio.
 *
 * As três esperas longas do fluxo (importar, analisar, exportar) não usam este
 * componente: elas têm cartão de progresso próprio, com checklist de etapas nomeadas
 * (`ImportProgress`, `AnalysisProgress`, `ExportProgress`, em `components/shell`) — a
 * barra por etapa concluída não é a "barra que anda sozinha" que a change anterior
 * recusou, porque ela não estima tempo, só nomeia o que já terminou.
 *
 * São dois tons, e a diferença é de natureza, não de gravidade:
 *
 * - `FailureNotice` — **algo quebrou**: a importação não leu o arquivo, a análise não
 *   voltou, a exportação não gerou. Fica na família do accent, como o resto da interface.
 * - `WarningNotice` — **nada quebrou, mas há algo entre a pessoa e o que ela quer**: a
 *   cota diária da IA acabou (tentar de novo agora é só cedo demais) ou o arquivo que ela
 *   trouxe não é um currículo. Vai em âmbar, a única cor fora da família do accent, porque
 *   é a única que se distingue num tema em que o roxo é o normal.
 */

function Aviso({ tone, children }: { tone: "failure" | "warning"; children: ReactNode }) {
  return (
    <div className={tone === "warning" ? styles.warning : styles.notice} role="alert">
      <Warning size={18} className={styles.icon} aria-hidden />
      <span className={styles.corpo}>{children}</span>
    </div>
  );
}

/** Aviso de que algo não deu certo, sem impedir o que já deu. */
export function FailureNotice({ children }: { children: ReactNode }) {
  return <Aviso tone="failure">{children}</Aviso>;
}

/** Aviso de atenção: nada falhou, mas há algo entre a pessoa e o que ela quer. */
export function WarningNotice({ children }: { children: ReactNode }) {
  return <Aviso tone="warning">{children}</Aviso>;
}
