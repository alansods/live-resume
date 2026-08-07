"use client";

import { Checkbox } from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";
import type { ReviewItem } from "./state";
import styles from "./Review.module.css";

/**
 * O cartão de sugestão.
 *
 * Uma caixa de marcação, não um botão de aplicar: marcar diz "quero isto no currículo
 * final", e nada acontece com o currículo agora. O protótipo tem "Aplicar"/"Desfazer" —
 * são de um desenho anterior às regras de produto, e a divergência está registrada na
 * proposta desta change.
 *
 * O texto atual riscado aparece **aqui**, nunca no papel do currículo: é o que permite
 * decidir sem transformar o preview num diff.
 */

type Props = {
  item: ReviewItem;
  focused: boolean;
  onToggle: (id: string) => void;
  onDismiss: (id: string) => void;
};

export function SuggestionCard({ item, focused, onToggle, onDismiss }: Props) {
  const { t } = useLocale();
  const { suggestion, number, selected } = item;
  const tipo = suggestion.kind === "verb" ? "metric" : suggestion.kind;

  return (
    <article
      id={`sug-${suggestion.id}`}
      className={`${styles.card} ${focused ? styles.cardFocused : ""}`}
      aria-labelledby={`sug-title-${suggestion.id}`}
    >
      <header className={styles.cardHead}>
        <span className={styles.badge}>{number}</span>
        <span className={styles.tag}>{t.filters[tipo]}</span>
        {suggestion.where ? (
          <span className={styles.where}>{suggestion.where}</span>
        ) : null}
      </header>

      <h4 id={`sug-title-${suggestion.id}`} className={styles.cardTitle}>
        {suggestion.title}
      </h4>

      {suggestion.before ? (
        <p className={styles.before}>
          <span className={styles.label}>{t.review.current}</span>
          <span className={styles.beforeText}>{suggestion.before}</span>
        </p>
      ) : null}

      <p className={styles.after}>
        <span className={styles.label}>{t.review.proposed}</span>
        <span className={styles.afterText}>{suggestion.after}</span>
      </p>

      <p className={styles.why}>{suggestion.why}</p>

      {suggestion.unsupportedNumbers.length > 0 ? (
        <p className={styles.unsupported}>
          {t.review.unsupported} ({suggestion.unsupportedNumbers.join(", ")})
        </p>
      ) : null}

      <footer className={styles.cardActions}>
        <Checkbox
          className={styles.check}
          label={selected ? t.review.selected : t.review.select}
          checked={selected}
          onChange={() => onToggle(suggestion.id)}
        />

        <button
          type="button"
          className={styles.dismiss}
          onClick={() => onDismiss(suggestion.id)}
        >
          {t.review.dismiss}
        </button>
      </footer>
    </article>
  );
}
