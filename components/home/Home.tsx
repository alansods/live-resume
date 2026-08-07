"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";
import { useT } from "@/lib/i18n/context";
import styles from "./Home.module.css";

/**
 * Página inicial.
 *
 * A porta de entrada do produto: o que ele faz, em quanto tempo, e o caminho para o
 * fluxo. Sem estado além do idioma e sem chamada de rede — o CTA é um link, não um
 * botão com navegação programática, para funcionar com clique do meio, nova aba e sem
 * JavaScript.
 *
 * Os textos dos cards descrevem o que o app faz HOJE, e não o que o protótipo prometia:
 * quem estrutura o currículo é a IA (não um parser com heurística), e a revisão MARCA
 * sugestões em vez de aceitá-las.
 */

/**
 * Quebra o texto do lead nos trechos marcados com `*`, para destacá-los em roxo.
 *
 * O marcador vem do dicionário porque o que se destaca é diferente em cada idioma. A
 * captura no grupo faz `split` devolver os separadores junto: os índices ímpares são
 * exatamente os trechos marcados.
 */
function destacar(texto: string) {
  return texto.split(/\*([^*]+)\*/g).map((trecho, i) =>
    i % 2 === 1 ? (
      <em key={i} className={styles.leadEm}>
        {trecho}
      </em>
    ) : (
      trecho
    ),
  );
}

export function Home() {
  const t = useT();

  const etapas = [
    { n: "01", title: t.home.step1Title, body: t.home.step1Body },
    { n: "02", title: t.home.step2Title, body: t.home.step2Body },
    { n: "03", title: t.home.step3Title, body: t.home.step3Body },
    { n: "04", title: t.home.step4Title, body: t.home.step4Body },
  ];

  return (
    <>
      <TopBar />

      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.headline}>{t.home.headline}</h1>
            <p className={styles.lead}>{destacar(t.home.lead)}</p>
            <Link href="/app" className={styles.cta}>
              {t.home.cta}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>

          <aside className={styles.aside}>
            <div className={styles.tags}>
              <span className="tag tag-accent">{t.home.tagLangs}</span>
              <span className="tag tag-neutral">{t.home.tagFormats}</span>
              <span className="tag tag-outline">{t.home.tagAts}</span>
            </div>
            <p className={styles.batchNote}>{t.home.batchNote}</p>
          </aside>
        </section>

        <section>
          <h2 className={styles.flowLabel}>{t.home.flowLabel}</h2>
          <div className={styles.flow}>
            {etapas.map((etapa) => (
              <article key={etapa.n} className={`card elev-sm ${styles.card}`}>
                <span className="card-kicker">{etapa.n}</span>
                <span className="card-title">{etapa.title}</span>
                <p className="card-body">{etapa.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
