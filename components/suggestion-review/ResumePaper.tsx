"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { formatPeriodForLocale } from "@/lib/export/dates";
import { sectionTitle } from "@/lib/export/sections";
import {
  jobBulletPath,
  jobPeriodPath,
  educationPeriodPath,
  skillsPath,
  summaryPath,
} from "@/lib/resume/paths";
import type { Period } from "@/lib/resume/period";
import type { Resume } from "@/lib/resume/schema";
import type { ReviewItem } from "./state";
import styles from "./Review.module.css";

/**
 * O papel do currículo.
 *
 * Ele recebe o currículo **importado** e nada mais — nem as marcações, nem o texto
 * proposto. É a garantia estrutural da regra: um componente que não conhece o texto
 * proposto não tem como exibi-lo por engano, e marcar não pode mudar o que aparece aqui.
 *
 * A única coisa que as sugestões trazem para cá é o marcador: número e âncora.
 */

type Props = {
  resume: Resume;
  /** Por path — a âncora entre currículo, marcador e cartão. */
  marks: Map<string, ReviewItem>;
  onFocus: (id: string) => void;
};

function Marker({ item, onFocus }: { item: ReviewItem; onFocus: (id: string) => void }) {
  const { t } = useLocale();
  const [aberto, setAberto] = useState(false);
  // O lado é medido, não adivinhado: um marcador no fim da linha cortaria o resumo.
  const [aDireita, setADireita] = useState(false);

  const tipo = item.suggestion.kind === "verb" ? "metric" : item.suggestion.kind;

  return (
    <span
      className={styles.markWrap}
      onMouseEnter={(event) => {
        const caixa = event.currentTarget.getBoundingClientRect();
        setADireita(caixa.left + 300 > window.innerWidth);
        setAberto(true);
      }}
      onMouseLeave={() => setAberto(false)}
    >
      <button
        type="button"
        className={styles.mark}
        aria-label={`${t.review.suggestion} ${item.number}`}
        onClick={() => onFocus(item.suggestion.id)}
      >
        {item.number}
      </button>

      {aberto ? (
        <span className={aDireita ? styles.tooltipRight : styles.tooltip} role="tooltip">
          <span className={styles.tooltipKind}>
            {t.filters[tipo]} · {t.review.suggestion} {item.number}
          </span>
          <span className={styles.tooltipTitle}>{item.suggestion.title}</span>
          <span className={styles.tooltipAfter}>{item.suggestion.after}</span>
          <button
            type="button"
            className={styles.tooltipButton}
            onClick={() => onFocus(item.suggestion.id)}
          >
            {t.review.details}
          </button>
        </span>
      ) : null}
    </span>
  );
}

export function ResumePaper({ resume, marks, onFocus }: Props) {
  const { locale } = useLocale();

  const marcador = (path: string) => {
    const item = marks.get(path);
    return item ? <Marker item={item} onFocus={onFocus} /> : null;
  };

  const titulo = (key: Parameters<typeof sectionTitle>[0]) => (
    <h3 className={styles.paperSection}>{sectionTitle(key, locale)}</h3>
  );

  /**
   * Período completo é data e cabe na coluna estreita ao lado do título. Período
   * incompleto **não é data**: é o texto do arquivo, e no currículo real ele veio como um
   * parágrafo inteiro ("Em andamento, previsão de conclusão: …"). Na coluna da data ele
   * espremia o título em linhas de duas palavras e transbordava do papel — então ele vai
   * para uma linha própria, quebrando como o texto que é.
   *
   * O marcador acompanha o texto nos dois casos: é o que ancora a sugestão de data.
   */
  const periodo = (period: Period, path: string) => {
    if (!period.complete) return null;
    return (
      <span className={styles.paperPeriod}>
        {formatPeriodForLocale(period, locale)}
        {marcador(path)}
      </span>
    );
  };

  const periodoEmTexto = (period: Period, path: string) => {
    if (period.complete) return null;
    return (
      <p className={styles.paperRawPeriod}>
        {formatPeriodForLocale(period, locale)}
        {marcador(path)}
      </p>
    );
  };

  return (
    <article className={styles.paper} aria-label={resume.header.name}>
      <h2 className={styles.paperName}>{resume.header.name}</h2>
      {resume.header.role ? (
        <p className={styles.paperRole}>{resume.header.role}</p>
      ) : null}
      {resume.header.contact ? (
        <p className={styles.paperContact}>{resume.header.contact}</p>
      ) : null}

      {resume.summary !== null ? (
        <>
          {titulo("summary")}
          <p className={styles.paperText}>
            {resume.summary.text}
            {marcador(summaryPath())}
          </p>
        </>
      ) : null}

      {resume.jobs.length > 0 ? (
        <>
          {titulo("experience")}
          {resume.jobs.map((job) => (
            <div key={job.id} className={styles.paperItem}>
              <div className={styles.paperItemHead}>
                <span className={styles.paperItemTitle}>
                  {job.role} — {job.company}
                </span>
                {periodo(job.period, jobPeriodPath(job.id))}
              </div>
              {periodoEmTexto(job.period, jobPeriodPath(job.id))}
              <ul className={styles.paperBullets}>
                {job.bullets.map((bullet) => (
                  <li key={bullet.id}>
                    {bullet.value.text}
                    {marcador(jobBulletPath(job.id, bullet.id))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      ) : null}

      {resume.education.length > 0 ? (
        <>
          {titulo("education")}
          {resume.education.map((item) => (
            <div key={item.id} className={styles.paperItem}>
              <div className={styles.paperItemHead}>
                <span className={styles.paperItemTitle}>
                  {item.course} — {item.school}
                </span>
                {periodo(item.period, educationPeriodPath(item.id))}
              </div>
              {periodoEmTexto(item.period, educationPeriodPath(item.id))}
            </div>
          ))}
        </>
      ) : null}

      {resume.skills !== null ? (
        <>
          {titulo("skills")}
          <p className={styles.paperText}>
            {resume.skills.text}
            {marcador(skillsPath())}
          </p>
        </>
      ) : null}
    </article>
  );
}
