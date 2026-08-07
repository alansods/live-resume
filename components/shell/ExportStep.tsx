"use client";

import { DownloadSimple, Files, Translate } from "@phosphor-icons/react";
import { Button, Checkbox } from "@/components/ui";
import { WarningNotice } from "@/components/ui/Notice";
import { useEffect, useState } from "react";
import { resumeFileNames, type ExportFormat } from "@/lib/export/filename";
import { useT } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionary";
import { useProgress } from "@/lib/progress/state";
import type { Patch } from "@/lib/resume/generate";
import { serializeResume } from "@/lib/resume/serialize";
import type { Resume } from "@/lib/resume/schema";
import { ExportProgress, type ExportStage } from "./ExportProgress";
import styles from "./Shell.module.css";

/**
 * Etapa 04 — Exportar.
 *
 * O rótulo do botão é `idiomas × formatos`, porque é isso que o usuário vai receber. Com
 * mais de um, vem `.zip`.
 *
 * A exportação inteira roda a cada clique — ordenar e traduzir incluídos. É aceitável:
 * exportar é o fim do fluxo e acontece uma vez. Cachear traria a pergunta de quando
 * invalidar, que não vale o ganho aqui.
 *
 * Ao clicar em baixar, o formulário inteiro sai e só o cartão de progresso fica — a lista
 * de arquivos vem da própria seleção de idiomas × formatos, com o nome real de download.
 */

type Props = {
  resume: Resume;
  patches: Patch[];
  locales: readonly Locale[];
  formats: readonly ExportFormat[];
  onToggleLocale: (locale: Locale) => void;
  onToggleFormat: (format: ExportFormat) => void;
  /** Chamado quando os arquivos terminam de ser gerados — a etapa 04 vira conclusão. */
  onExported: (files: string[], partialFailure: boolean) => void;
  /** "Baixar de novo": monta esta etapa já disparando a geração, sem esperar o clique. */
  autoStart?: boolean;
};

export function ExportStep({
  resume,
  patches,
  locales,
  formats,
  onToggleLocale,
  onToggleFormat,
  onExported,
  autoStart = false,
}: Props) {
  const t = useT();
  const arquivos = resumeFileNames(resume.header.name, locales, formats);
  const [progresso, acoes] = useProgress<ExportStage>(arquivos);
  const [cota, setCota] = useState(false);

  const total = locales.length * formats.length;

  const rotulo =
    total === 0
      ? t.step4.downloadNone
      : total === 1
        ? t.step4.downloadOne
        : t.step4.downloadMany.replace("{n}", String(total));

  async function baixar() {
    setCota(false);
    acoes.start();

    try {
      const resposta = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resume: JSON.parse(serializeResume(resume)),
          patches,
          locales,
          formats,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json();
        if (corpo?.error?.code === "quota-exceeded") {
          setCota(true);
          acoes.reset();
          return;
        }
        acoes.fail(corpo?.error?.message ?? t.failure.exportFailed);
        return;
      }

      // O que falhou vem no cabeçalho; o corpo é o arquivo que deu certo.
      const falhouParcial = resposta.headers.get("x-export-failures") !== null;

      const nome =
        /filename="([^"]+)"/.exec(
          resposta.headers.get("content-disposition") ?? "",
        )?.[1] ?? "curriculo";

      // Download pelo blob: navegar para a rota perderia o corpo POST e o estado do fluxo.
      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);

      acoes.finish();
      onExported(arquivos, falhouParcial);
    } catch {
      // Linguagem do usuário, não o texto que o navegador dá para uma falha de rede.
      acoes.fail(t.failure.exportFailed);
    }
  }

  useEffect(() => {
    // Roda uma vez ao montar — "baixar de novo" monta esta etapa já disparando, sem
    // esperar o clique; um novo `baixar` a cada render viraria laço.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoStart) void baixar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caixa = (marcado: boolean, rotuloDaCaixa: string, aoTrocar: () => void) => (
    <Checkbox
      className={styles.checkbox}
      label={rotuloDaCaixa}
      checked={marcado}
      onChange={aoTrocar}
    />
  );

  if (progresso.mode === "running") {
    return (
      <div className={styles.stepColumn}>
        <ExportProgress state={progresso} />
      </div>
    );
  }

  if (progresso.mode === "error") {
    return (
      <div className={styles.stepColumn}>
        {/*
          Atenção, não falha: quando a exportação não entrega nenhum arquivo, a causa mais
          comum é a mesma da cota esgotada — um limite da IA, não um defeito do app. O tom
          âmbar é o mesmo já usado ali.
        */}
        <WarningNotice>{progresso.error}</WarningNotice>
        <Button variant="secondary" onClick={() => acoes.reset()}>
          {t.progress.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.stepColumn}>
      <p className={styles.kicker}>{t.step4.kicker}</p>
      <h2 className={styles.title}>{t.step4.title}</h2>
      <p className={styles.subtitle}>{t.step4.subtitle}</p>

      <fieldset className={styles.group}>
        <legend className={styles.groupLabel}>
          <Translate size={15} className={styles.dropIcon} aria-hidden />
          {t.step4.languages}
        </legend>
        {caixa(locales.includes("pt"), t.step4.pt, () => onToggleLocale("pt"))}
        {caixa(locales.includes("en"), t.step4.en, () => onToggleLocale("en"))}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupLabel}>
          <Files size={15} className={styles.dropIcon} aria-hidden />
          {t.step4.formats}
        </legend>
        {caixa(formats.includes("pdf"), t.step4.pdf, () => onToggleFormat("pdf"))}
        {caixa(formats.includes("docx"), t.step4.docx, () => onToggleFormat("docx"))}
      </fieldset>

      <button
        type="button"
        className={styles.download}
        disabled={total === 0}
        onClick={() => void baixar()}
      >
        <DownloadSimple size={15} aria-hidden />
        {rotulo}
      </button>

      {total > 1 ? <p className={styles.note}>{t.step4.zipNote}</p> : null}

      {cota ? (
        <div className={styles.stepNotice}>
          <WarningNotice>{t.failure.quota}</WarningNotice>
        </div>
      ) : null}

      <section className={styles.guarantees}>
        <h3 className={styles.groupLabel}>{t.step4.guaranteesTitle}</h3>
        <p className={styles.note}>{t.step4.guarantees}</p>
      </section>
    </div>
  );
}
