"use client";

import { Check, File } from "@phosphor-icons/react";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import shell from "./Shell.module.css";
import styles from "./ExportComplete.module.css";

/**
 * Tela de conclusão da exportação — substitui formulário e progresso por completo, as
 * duas são mutuamente exclusivas. Fica em `AppShell.tsx` porque é o único lugar que sabe
 * navegar entre etapas e resetar o fluxo inteiro.
 */

export function ExportComplete({
  files,
  partialFailure,
  onDownloadAgain,
  onStartOver,
}: {
  files: readonly string[];
  partialFailure: boolean;
  onDownloadAgain: () => void;
  onStartOver: () => void;
}) {
  const t = useT();

  return (
    <div className={`${shell.stepColumn} ${styles.column}`}>
      <div className={styles.header}>
        <span className={styles.circle}>
          <Check size={26} weight="bold" aria-hidden />
        </span>
        <div>
          <h2 className={styles.title}>{t.exportComplete.title}</h2>
          <p className={styles.thanks}>
            {files.length === 1
              ? t.exportComplete.thanksOne
              : t.exportComplete.thanksMany.replace("{n}", String(files.length))}
          </p>
        </div>
      </div>

      {partialFailure ? (
        <p className={styles.warning} role="alert">
          {t.step4.partialFailure}
        </p>
      ) : null}

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>{t.exportComplete.filesTitle}</h3>
        <ul className={styles.fileList}>
          {files.map((arquivo) => (
            <li key={arquivo} className={styles.fileItem}>
              <File size={16} className={styles.fileIcon} aria-hidden />
              {arquivo}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.noteBlock}>
        <h3 className={styles.blockTitle}>{t.exportComplete.beforeSendTitle}</h3>
        <ul className={styles.noteList}>
          <li>{t.exportComplete.beforeSend1}</li>
          <li>{t.exportComplete.beforeSend2}</li>
          <li>{t.exportComplete.beforeSend3}</li>
        </ul>
      </section>

      <div className={styles.actions}>
        <Button onClick={onDownloadAgain}>{t.exportComplete.downloadAgain}</Button>
        <Button variant="secondary" onClick={onStartOver}>
          {t.exportComplete.startOver}
        </Button>
      </div>
    </div>
  );
}
