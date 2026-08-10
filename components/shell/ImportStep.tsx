"use client";

import { CheckCircle, FileArrowUp, X } from "@phosphor-icons/react";
import { Button, Card } from "@/components/ui";
import { FailureNotice, WarningNotice } from "@/components/ui/Notice";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
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
 */
const MANTEM_A_DROPZONE = new Set([
  "quota-exceeded",
  "not-a-resume",
  "unsupported-format",
  "file-too-large",
  "rewrite-detected",
]);

/**
 * Recusas em tom de atenção (âmbar), não de falha.
 *
 * Cota: nada quebrou e o arquivo estava certo, só não há chamada disponível agora.
 * Não-currículo: nada quebrou — o arquivo foi lido, só não é um currículo, e a pessoa
 * escolheu o documento errado. Reescrita: o arquivo foi lido, a IA só não conseguiu
 * copiá-lo sem alterar o texto — reenviar tem chance real. As demais recusas ficam no
 * tom de falha (accent).
 */
const TOM_DE_ATENCAO = new Set(["quota-exceeded", "not-a-resume", "rewrite-detected"]);

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

type StatusPagamento = "idle" | "redirecting" | "canceled" | "error";

/**
 * O que a URL de retorno do Checkout diz, sem tocar nela.
 *
 * `URLSearchParams`, não `new URL()`: código de teste em outro lugar do shell substitui
 * o `URL` global por um objeto sem construtor, para simular
 * `createObjectURL`/`revokeObjectURL` — `new URL()` quebraria nesses testes.
 *
 * `typeof window === "undefined"` cobre a renderização no servidor, que não tem URL de
 * navegador nenhuma para ler.
 */
function retornoDoCheckout(): { token: string | null; status: StatusPagamento } {
  if (typeof window === "undefined") return { token: null, status: "idle" };

  const params = new URLSearchParams(window.location.search);
  const recebido = params.get("paid_session");
  if (recebido) return { token: recebido, status: "idle" };
  if (params.get("payment_canceled")) return { token: null, status: "canceled" };
  if (params.get("payment_error")) return { token: null, status: "error" };
  return { token: null, status: "idle" };
}

/** Apaga o retorno do Checkout da barra de endereço, depois de já ter sido lido. */
function limparRetornoDoCheckout(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  if (
    !params.has("paid_session") &&
    !params.has("payment_canceled") &&
    !params.has("payment_error")
  ) {
    return;
  }

  params.delete("paid_session");
  params.delete("payment_canceled");
  params.delete("payment_error");
  const resto = params.toString();
  const novaHref =
    window.location.pathname + (resto ? `?${resto}` : "") + window.location.hash;
  window.history.replaceState({}, "", novaHref);
}

type Props = {
  fileName: string | null;
  /**
   * O relatório vai junto: é dele que saem os períodos que a etapa 02 pede para
   * completar. Descartá-lo aqui deixava a seção de datas invisível.
   */
  onImported: (resume: Resume, fileName: string, report: ImportReport | null) => void;
  /** Limpar o arquivo importado e voltar à dropzone para subir outro. */
  onClear: () => void;
};

export function ImportStep({ fileName, onImported, onClear }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [nomeEmProgresso, setNomeEmProgresso] = useState<string | null>(null);
  const [progresso, acoes] = useProgress(IMPORT_STAGES);
  /** A recusa que aparece SOB a dropzone, sem tirá-la da tela. */
  const [aviso, setAviso] = useState<{ atencao: boolean; texto: string } | null>(null);
  const [sobre, setSobre] = useState(false);

  /**
   * Token de sessão paga. Vive só em memória do componente — nunca em `localStorage`
   * nem em cookie. Recarregar a página perde o token, exatamente como perde o resto
   * do estado da sessão.
   *
   * Começa `null`/"idle" nos dois lados (servidor e cliente) de propósito: o servidor
   * não tem `window` para ler a URL de retorno do Checkout, então só o efeito abaixo —
   * que roda só no cliente, depois da primeira renderização — pode ler o valor real.
   * Ler a URL direto na inicialização do estado (fora de efeito) renderizava o
   * servidor sempre bloqueado e o cliente, quando havia `paid_session` na URL, já
   * liberado — a divergência que o React reporta como "hydration mismatch".
   */
  const [tokenPago, setTokenPago] = useState<string | null>(null);
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>("idle");

  useEffect(() => {
    // Lê algo que só existe no navegador (URL de retorno do Checkout) — setState
    // aqui dentro é o único jeito de fazer isso sem divergir do HTML do servidor.
    const retorno = retornoDoCheckout();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (retorno.token) setTokenPago(retorno.token);
    else if (retorno.status !== "idle") setStatusPagamento(retorno.status);
    limparRetornoDoCheckout();
  }, []);

  async function pagar() {
    setStatusPagamento("redirecting");
    try {
      const resposta = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok || !corpo.url) {
        setStatusPagamento("error");
        return;
      }
      window.location.href = corpo.url;
    } catch {
      setStatusPagamento("error");
    }
  }

  async function importar(arquivo: File) {
    if (!tokenPago) return;

    setNomeEmProgresso(arquivo.name);
    setAviso(null);
    acoes.start();

    try {
      const form = new FormData();
      form.append("file", arquivo);

      const resposta = await fetch("/api/resume-import", {
        method: "POST",
        headers: { "x-paid-session": tokenPago },
        body: form,
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        const code = String(corpo?.error?.code ?? "");

        // Token expirou ou já foi usado entre a confirmação e o envio do arquivo — a
        // pessoa precisa pagar de novo, não tentar o mesmo arquivo outra vez.
        if (code === "payment-required") {
          setTokenPago(null);
          acoes.reset();
          return;
        }

        const texto =
          code === "quota-exceeded"
            ? t.failure.quota
            : mensagemDaRecusa(t, code, corpo?.error?.message);

        if (MANTEM_A_DROPZONE.has(code)) {
          setAviso({ atencao: TOM_DE_ATENCAO.has(code), texto });
          acoes.reset();
          return;
        }
        acoes.fail(texto);
        return;
      }

      acoes.finish();
      setTokenPago(null);
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
      ) : fileName !== null ? (
        <div className={styles.importedCard}>
          <CheckCircle size={28} className={styles.importedIcon} aria-hidden />
          <div className={styles.importedInfo}>
            <strong className={styles.importedTitle}>{t.step1.imported}</strong>
            <span className={styles.importedFile}>{fileName}</span>
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={onClear}
            aria-label={t.step1.removeFile}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : tokenPago === null ? (
        <>
          <Card className={styles.paymentCard}>
            <strong className={styles.importedTitle}>{t.payment.title}</strong>
            <p className={styles.dropText}>{t.payment.body}</p>
            <Button
              onClick={() => void pagar()}
              disabled={statusPagamento === "redirecting"}
            >
              {statusPagamento === "redirecting" ? t.payment.redirecting : t.payment.cta}
            </Button>
          </Card>

          {statusPagamento === "canceled" || statusPagamento === "error" ? (
            <div className={styles.stepNotice}>
              {statusPagamento === "canceled" ? (
                <WarningNotice>{t.payment.canceled}</WarningNotice>
              ) : (
                <FailureNotice>{t.payment.error}</FailureNotice>
              )}
            </div>
          ) : null}
        </>
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
    </div>
  );
}
