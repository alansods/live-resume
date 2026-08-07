"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Resume } from "@/lib/resume/schema";
import type { Suggestion } from "@/lib/suggestions/model";
import { ResumePaper } from "./ResumePaper";
import { SuggestionCard } from "./SuggestionCard";
import {
  dismiss,
  focus,
  initialReviewState,
  itemsByPath,
  pendingCount,
  selectAll,
  setFilter,
  toggleSelected,
  visibleItems,
  type ReviewFilter,
} from "./state";
import shell from "@/components/shell/Shell.module.css";
import styles from "./Review.module.css";

/**
 * Etapa 03 — Revisar.
 *
 * Currículo à esquerda, sugestões à direita. O currículo é o importado, e continua
 * sendo até a geração: o que o usuário faz aqui é montar um conjunto, não editar um
 * documento.
 *
 * Recebe tudo por props e não busca nada — quem orquestra as chamadas é a página, e
 * depois o shell. É o mesmo desenho da etapa 02, que permitiu encaixá-la sem tocar no
 * componente.
 */

const FILTROS: ReviewFilter[] = ["all", "metric", "dates", "ats"];

type Props = {
  resume: Resume;
  suggestions: Suggestion[];
  /** `suggestions-dates` indicou que houve mês inferido pelo app. */
  requiresDateNotice?: boolean;
  /** O conjunto marcado, sempre que ele muda — é o que a exportação recebe. */
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
};

export function SuggestionReview({
  resume,
  suggestions,
  requiresDateNotice = false,
  onSelectionChange,
}: Props) {
  const { t } = useLocale();
  const [state, setState] = useState(initialReviewState);

  const atualizar = (proximo: typeof state) => {
    setState(proximo);
    if (proximo.selected !== state.selected) onSelectionChange?.(proximo.selected);
  };

  const visiveis = useMemo(() => visibleItems(state, suggestions), [state, suggestions]);
  const marks = useMemo(() => itemsByPath(state, suggestions), [state, suggestions]);
  const pendentes = pendingCount(state, suggestions);
  const naTela = suggestions.filter((s) => !state.dismissed.has(s.id)).length;

  return (
    <div className={shell.stepColumn}>
      <p className={styles.kicker}>{t.step3.kicker}</p>
      <h1 className={styles.title}>{t.step3.title}</h1>
      <p className={styles.subtitle}>{t.step3.subtitle}</p>

      {requiresDateNotice ? (
        <aside className={styles.notice}>
          <strong>{t.dateNotice.title}</strong>
          <span>{t.dateNotice.body}</span>
        </aside>
      ) : null}

      <div className={styles.grid}>
        <ResumePaper
          resume={resume}
          marks={marks}
          onFocus={(id) => {
            atualizar(focus(state, id));
            document
              .getElementById(`sug-${id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        <section className={styles.panel} aria-label={t.review.panelTitle}>
          <header className={styles.panelHead}>
            <h2 className={styles.panelTitle}>{t.review.panelTitle}</h2>
            <p className={styles.panelNote}>{t.review.panelNote}</p>

            <div className={styles.panelMeta}>
              <span className={styles.pending}>
                {pendentes} {pendentes === 1 ? t.review.pendingOne : t.review.pendingMany}
              </span>
              <button
                type="button"
                className={styles.selectAll}
                onClick={() => atualizar(selectAll(state, suggestions))}
              >
                {t.review.selectAll}
              </button>
            </div>

            {/*
              A nota de ATS saiu daqui para o chip da top bar. Ela é do currículo, não da
              revisão: dentro do painel ela sumia ao trocar de etapa, justamente quando
              saber a nota importa. O que fica no painel é o que só existe aqui — a
              contagem de pendências e os filtros.
            */}
            {pendentes === 0 ? <p className={styles.scoreNote}>{t.score.done}</p> : null}

            <div className={styles.filters} role="group" aria-label={t.filters.all}>
              {FILTROS.map((filtro) => (
                <button
                  key={filtro}
                  type="button"
                  className={state.filter === filtro ? styles.filterOn : styles.filter}
                  aria-pressed={state.filter === filtro}
                  onClick={() => atualizar(setFilter(state, filtro))}
                >
                  {t.filters[filtro === "all" ? "all" : filtro]}
                </button>
              ))}
            </div>
          </header>

          {visiveis.length === 0 ? (
            <p className={styles.empty}>
              {naTela === 0 ? t.review.empty : t.review.emptyFilter}
            </p>
          ) : (
            <div className={styles.cards}>
              {visiveis.map((item) => (
                <SuggestionCard
                  key={item.suggestion.id}
                  item={item}
                  focused={state.focused === item.suggestion.id}
                  onToggle={(id) => atualizar(toggleSelected(state, id))}
                  onDismiss={(id) => atualizar(dismiss(state, id))}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
