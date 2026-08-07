import type { Resume } from "@/lib/resume/schema";
import { extractNumbers, normalizeNumber } from "@/lib/suggestions/numbers";

/**
 * Verificação da tradução.
 *
 * Na importação, `verify.ts` compara o texto devolvido com o extraído: ali qualquer
 * diferença é reescrita. Aqui o texto **deve** diferir — é uma tradução —, então essa
 * trava não serve. O que sobra, e é bastante:
 *
 * - **estrutura**: mesmos ids, mesmas contagens, mesma ordem;
 * - **números**: o mesmo conjunto em cada trecho.
 *
 * O segundo é o que impede a tradução de virar reescrita silenciosa. Um "77%" que volta
 * "70%" é um dado falso no currículo de alguém, e nenhuma confiança no modelo substitui
 * a conferência.
 */

export class TranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationError";
  }
}

/** Um trecho traduzido e o seu original, para conferir os números. */
export type TranslatedSpan = {
  /** Onde o trecho está, em linguagem de erro: "bullet de job-kobo-lead". */
  label: string;
  before: string;
  after: string;
};

function numerosDe(texto: string): string[] {
  return extractNumbers(texto).map(normalizeNumber).filter(Boolean).sort();
}

/**
 * Os números do trecho traduzido são os mesmos do original.
 *
 * A comparação é por multiconjunto ordenado: "de 34% para 82%" traduzido precisa manter
 * os dois, e manter a quantidade — um "82" que aparece duas vezes não pode virar uma.
 */
export function assertNumbersPreserved(spans: readonly TranslatedSpan[]): void {
  for (const span of spans) {
    const antes = numerosDe(span.before);
    const depois = numerosDe(span.after);

    if (antes.length !== depois.length || antes.some((n, i) => n !== depois[i])) {
      throw new TranslationError(
        `A tradução alterou os números em ${span.label}: ${antes.join(", ") || "(nenhum)"} → ${depois.join(", ") || "(nenhum)"}. Nenhum currículo traduzido foi produzido.`,
      );
    }
  }
}

/** Ids esperados de cada lista, na ordem em que o currículo os tem. */
export type ResumeShape = {
  jobs: string[];
  bullets: Record<string, string[]>;
  education: string[];
};

export function shapeOf(resume: Resume): ResumeShape {
  return {
    jobs: resume.jobs.map((job) => job.id as string),
    bullets: Object.fromEntries(
      resume.jobs.map((job) => [
        job.id as string,
        job.bullets.map((bullet) => bullet.id as string),
      ]),
    ),
    education: resume.education.map((item) => item.id as string),
  };
}

function mesmaLista(esperada: readonly string[], recebida: readonly string[]): boolean {
  return (
    esperada.length === recebida.length && esperada.every((id, i) => id === recebida[i])
  );
}

/**
 * A tradução preserva a estrutura: mesmos ids, mesmas contagens, mesma ordem.
 *
 * Item faltando, sobrando ou desconhecido derruba a tradução inteira — meio currículo
 * traduzido é pior que nenhum, porque o defeito passa despercebido no arquivo baixado.
 */
export function assertShapePreserved(esperada: ResumeShape, recebida: ResumeShape): void {
  if (!mesmaLista(esperada.jobs, recebida.jobs)) {
    throw new TranslationError(
      `A tradução não devolveu as mesmas experiências: esperadas ${esperada.jobs.length}, recebidas ${recebida.jobs.length}, na mesma ordem e com os mesmos ids.`,
    );
  }

  if (!mesmaLista(esperada.education, recebida.education)) {
    throw new TranslationError(
      `A tradução não devolveu as mesmas formações: esperadas ${esperada.education.length}, recebidas ${recebida.education.length}.`,
    );
  }

  for (const jobId of esperada.jobs) {
    if (!mesmaLista(esperada.bullets[jobId] ?? [], recebida.bullets[jobId] ?? [])) {
      throw new TranslationError(
        `A tradução não devolveu os mesmos bullets da experiência "${jobId}".`,
      );
    }
  }
}
