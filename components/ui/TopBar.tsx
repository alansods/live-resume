"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { locales as idiomasDaInterface } from "@/lib/i18n/dictionary";
import styles from "./TopBar.module.css";

/**
 * A top bar do produto — uma só, na home e no aplicativo.
 *
 * O handoff diz que a barra do app é "idêntica à home", e ela era: duas implementações
 * parecidas que já tinham divergido no toggle. Um componente compartilhado é o que torna
 * a igualdade verificável em vez de combinada.
 *
 * O caminho de volta é opcional: a home não oferece um caminho para si mesma. Ele é um
 * `Link`, e não um botão, para funcionar com clique do meio e nova aba.
 *
 * A pontuação de ATS também é opcional, e por isso mora aqui: ela é do currículo, não da
 * revisão. Ficava dentro do painel de sugestões, onde só existia enquanto a etapa 03
 * estava aberta — e é justamente ao avançar para a exportação que saber a nota importa.
 * Na barra ela é a mesma nota, visível o tempo todo depois que há o que pontuar.
 */

type Props = {
  backHref?: string;
  /** A nota de ATS do conjunto marcado, ou `null` quando ainda não há o que pontuar. */
  atsScore?: number | null;
};

/** Dez barras; a barra i acende quando a nota alcançou o décimo que ela representa. */
const BARRAS = 10;

export function TopBar({ backHref, atsScore = null }: Props) {
  const { t, locale, setLocale } = useLocale();

  return (
    <header className={styles.topBar}>
      <span className={styles.brand}>{t.shell.brand}</span>

      {backHref !== undefined ? (
        <>
          <span className={styles.divider} />
          {/*
            O texto é o mesmo do "Voltar" da navegação de etapa, como no protótipo; o
            rótulo acessível é que separa os dois, porque os destinos são diferentes.
          */}
          <Link
            href={backHref}
            className={styles.back}
            aria-label={t.shell.backHomeLabel}
          >
            <ArrowLeft size={13} aria-hidden />
            {t.shell.back}
          </Link>
        </>
      ) : null}

      {/*
        Um grupo só à direita: é ele que carrega o `margin-left: auto`. Com a margem no
        toggle, o chip era empurrado para junto da marca em vez de ficar ao lado dele.
      */}
      <div className={styles.trailing}>
        {atsScore !== null ? (
          <div
            className={styles.ats}
            role="meter"
            aria-label={t.score.label}
            aria-valuenow={atsScore}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className={styles.atsLabel}>{t.score.short}</span>
            <span className={styles.atsValue}>{atsScore}</span>
            <span className={styles.atsOutOf}>{t.score.outOf}</span>
            {/* As barras repetem a nota que já está escrita ao lado — não se anunciam. */}
            <span className={styles.atsBars} aria-hidden>
              {Array.from({ length: BARRAS }, (_, i) => (
                <span
                  key={i}
                  className={
                    atsScore >= ((i + 1) * 100) / BARRAS
                      ? styles.atsBarOn
                      : styles.atsBarOff
                  }
                />
              ))}
            </span>
          </div>
        ) : null}

        <div className={styles.langToggle} role="group" aria-label={t.shell.brand}>
          {idiomasDaInterface.map((idioma) => (
            <button
              key={idioma}
              type="button"
              className={locale === idioma ? styles.langOn : styles.lang}
              aria-pressed={locale === idioma}
              onClick={() => setLocale(idioma)}
            >
              {idioma === "pt" ? "PT-BR" : "EN"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
