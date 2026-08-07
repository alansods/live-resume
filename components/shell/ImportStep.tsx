"use client";

import { CheckCircle, FileArrowUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui";
import { FailureNotice, WarningNotice } from "@/components/ui/Notice";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { Translations } from "@/lib/i18n/dictionary";
import { MAX_FILE_BYTES } from "@/lib/parsing/blocks";
import type { ImportReport } from "@/lib/parsing/report";
import { useProgress } from "@/lib/progress/state";
import { deserializeResume } from "@/lib/resume/serialize";
import type { Resume } from "@/lib/resume/schema";
import { IMPORT_STAGES, ImportProgress } from "./ImportProgress";
import styles from "./Shell.module.css";

/**
 * Etapa 01 — Importar.
 *
 * A única etapa que existe antes de haver currículo, e por isso a única que tranca o
 * fluxo: sem arquivo lido, não há o que atualizar, revisar ou exportar.
 *
 * A espera é longa — a importação lê o arquivo e chama a IA para estruturar o conteúdo —,
 * então ela é nomeada na tela: um cartão de progresso substitui a dropzone, com um
 * checklist de etapas nomeadas. O timer que avança o checklist é simulado (protótipo); a
 * chamada real é quem decide quando a operação termina de verdade.
 */

/**
 * Recusas em que a dropzone FICA na tela.
 *
 * São aquelas em que o próximo passo da pessoa é escolher outro arquivo — e a dropzone é
 * onde isso se faz. Trocá-la por um aviso mais um botão põe um clique entre ela e a única
 * coisa que precisa fazer, e o arquivo que ela já tem à mão espera esse clique à toa.
 *
 * As demais falhas ficam como estavam: rede fora e leitor de PDF que não subiu pedem
 * "tente de novo", não "escolha outro" — para essas, o botão é o controle certo.
 *
 * Cota entra aqui pelo mesmo motivo de sempre, e é a única em tom de atenção: nada
 * quebrou e o arquivo estava certo, só não há chamada disponível agora.
 */
const MANTEM_A_DROPZONE = new Set([
  "quota-exceeded",
  "not-a-resume",
  "unsupported-format",
  "file-too-large",
]);

const LIMITE_EM_MB = String(Math.round(MAX_FILE_BYTES / (1024 * 1024)));

/**
 * O texto que a pessoa lê para uma recusa da importação.
 *
 * Vem do dicionário, pelo CÓDIGO. A mensagem que a rota manda junto é escrita no servidor
 * e sempre em português: com a interface em inglês, ela aparecia em português no meio de
 * tudo o mais traduzido. Ela fica como último recurso, para um código que a tela ainda
 * não conheça — melhor um texto no idioma errado que nenhum texto.
 */
function mensagemDaRecusa(t: Translations, code: string, doServidor?: string): string {
  const texto = (t.importErrors as Record<string, string | undefined>)[code];
  if (texto === undefined) return doServidor ?? t.failure.importFailed;
  return texto.replace("{limit}", LIMITE_EM_MB);
}

type Props = {
  fileName: string | null;
  /**
   * O relatório vai junto: é dele que saem os períodos que a etapa 02 pede para
   * completar. Descartá-lo aqui deixava a seção de datas invisível.
   */
  onImported: (resume: Resume, fileName: string, report: ImportReport | null) => void;
};

export function ImportStep({ fileName, onImported }: Props) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [nomeEmProgresso, setNomeEmProgresso] = useState<string | null>(null);
  const [progresso, acoes] = useProgress(IMPORT_STAGES);
  /** A recusa que aparece SOB a dropzone, sem tirá-la da tela. */
  const [aviso, setAviso] = useState<{ atencao: boolean; texto: string } | null>(null);
  const [sobre, setSobre] = useState(false);

  async function importar(arquivo: File) {
    setNomeEmProgresso(arquivo.name);
    setAviso(null);
    acoes.start();

    try {
      const form = new FormData();
      form.append("file", arquivo);

      const resposta = await fetch("/api/resume-import", { method: "POST", body: form });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        const code = String(corpo?.error?.code ?? "");
        const texto =
          code === "quota-exceeded"
            ? t.failure.quota
            : mensagemDaRecusa(t, code, corpo?.error?.message);

        if (MANTEM_A_DROPZONE.has(code)) {
          setAviso({ atencao: code === "quota-exceeded", texto });
          acoes.reset();
          return;
        }
        acoes.fail(texto);
        return;
      }

      acoes.finish();
      onImported(
        deserializeResume(corpo.resume),
        arquivo.name,
        (corpo.report as ImportReport | undefined) ?? null,
      );
    } catch {
      // Linguagem do usuário, não o texto que o navegador dá para uma falha de rede.
      acoes.fail(t.failure.importFailed);
    }
  }

  const emProgresso = progresso.mode === "running";
  const comErro = progresso.mode === "error";

  return (
    <div className={styles.stepColumn}>
      <p className={styles.kicker}>{t.step1.kicker}</p>
      <h2 className={styles.title}>{t.step1.title}</h2>
      <p className={styles.subtitle}>{t.step1.subtitle}</p>

      {emProgresso && nomeEmProgresso !== null ? (
        <ImportProgress fileName={nomeEmProgresso} state={progresso} />
      ) : comErro ? (
        <div className={styles.stepNotice}>
          <FailureNotice>{progresso.error}</FailureNotice>
          <Button variant="secondary" onClick={() => acoes.reset()}>
            {t.step1.tryAgain}
          </Button>
        </div>
      ) : (
        <div
          className={sobre ? styles.dropzoneOver : styles.dropzone}
          onDragOver={(event) => {
            event.preventDefault();
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={(event) => {
            event.preventDefault();
            setSobre(false);
            const arquivo = event.dataTransfer.files[0];
            if (arquivo) void importar(arquivo);
          }}
        >
          <FileArrowUp size={34} className={styles.dropIcon} aria-hidden />
          <p className={styles.dropText}>{t.step1.drop}</p>
          <p className={styles.dropOr}>{t.step1.or}</p>
          <button
            type="button"
            className={styles.dropButton}
            onClick={() => input.current?.click()}
          >
            {t.step1.choose}
          </button>

          <input
            ref={input}
            type="file"
            accept=".docx,.pdf"
            className={styles.fileInput}
            aria-label={t.step1.choose}
            onChange={(event) => {
              const arquivo = event.target.files?.[0];
              if (arquivo) void importar(arquivo);
            }}
          />
        </div>
      )}

      {aviso !== null ? (
        <div className={styles.stepNotice}>
          {aviso.atencao ? (
            <WarningNotice>{aviso.texto}</WarningNotice>
          ) : (
            <FailureNotice>{aviso.texto}</FailureNotice>
          )}
        </div>
      ) : null}

      {fileName !== null && !emProgresso ? (
        <p className={styles.imported}>
          <CheckCircle size={18} className={styles.checkIcon} aria-hidden />
          <strong>{t.step1.imported}</strong> {fileName}
        </p>
      ) : null}
    </div>
  );
}
