import type { ItemId } from "./ids";
import { proposed, type TextValue } from "./origin";
import { parsePeriod, type Period } from "./period";
import {
  parsePath,
  pathOf,
  PathError,
  resolvePath,
  type ResumePath,
  jobBulletPath,
  jobPeriodPath,
  educationPeriodPath,
  summaryPath,
  skillsPath,
} from "./paths";
import type { Resume } from "./schema";

/**
 * Geração do currículo final.
 *
 * É a única transformação do modelo. Durante a revisão nada é aplicado: a sugestão é
 * item de checklist, e o preview mostra o currículo importado como veio. Aqui, de uma
 * vez só, entram os patches que o usuário marcou e a ordem que a IA definiu.
 *
 * Não existe aplicação incremental nem reversão — as primitivas abaixo são internas
 * de propósito, e o índice público do módulo não as exporta.
 */

/** Uma substituição marcada pelo usuário. `text` é o que a sugestão propôs. */
export type Patch = {
  path: ResumePath | string;
  text: string;
};

/**
 * A ordem que a IA definiu, como permutação de ids. Lista omitida conserva a ordem
 * de origem.
 */
export type ResumeOrder = {
  jobs?: readonly ItemId[];
  /** Ordem dos bullets, por id de experiência. */
  bullets?: Readonly<Record<string, readonly ItemId[]>>;
  education?: readonly ItemId[];
};

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}

// ── Primitivas internas ─────────────────────────────────────────────────────────

/** Substitui um trecho, reconstruindo só o caminho até ele. Nunca muta a entrada. */
function applyPatch(resume: Resume, patch: Patch): Resume {
  const parsed = parsePath(String(patch.path));
  const origin = proposed(true);

  const text = (): TextValue => ({ text: patch.text, origin });
  const period = (): Period => parsePeriod(patch.text, origin);

  switch (parsed.kind) {
    case "summary":
      return { ...resume, summary: text() };
    case "skills":
      return { ...resume, skills: text() };
    case "jobPeriod":
      return {
        ...resume,
        jobs: resume.jobs.map((job) =>
          job.id === parsed.jobId ? { ...job, period: period() } : job,
        ),
      };
    case "jobBullet":
      return {
        ...resume,
        jobs: resume.jobs.map((job) =>
          job.id === parsed.jobId
            ? {
                ...job,
                bullets: job.bullets.map((bullet) =>
                  bullet.id === parsed.bulletId ? { ...bullet, value: text() } : bullet,
                ),
              }
            : job,
        ),
      };
    case "educationPeriod":
      return {
        ...resume,
        education: resume.education.map((education) =>
          education.id === parsed.educationId
            ? { ...education, period: period() }
            : education,
        ),
      };
  }
}

/**
 * Reordena uma lista a partir da permutação completa de ids. Permutação parcial,
 * repetida ou com id desconhecido é recusada inteira: uma resposta truncada da IA
 * falha aqui, em vez de reordenar meio currículo em silêncio.
 */
function applyOrder<T extends { id: ItemId }>(
  items: readonly T[],
  order: readonly ItemId[] | undefined,
  label: string,
): T[] {
  if (order === undefined) return [...items];

  const byId = new Map(items.map((item) => [item.id as string, item]));
  const seen = new Set<string>();

  const reordenados = order.map((id) => {
    const item = byId.get(id as string);
    if (!item) {
      throw new GenerationError(
        `Ordem de ${label} cita um id que não existe no currículo: "${id}".`,
      );
    }
    if (seen.has(id as string)) {
      throw new GenerationError(`Ordem de ${label} repete o id "${id}".`);
    }
    seen.add(id as string);
    return item;
  });

  if (reordenados.length !== items.length) {
    const faltando = items
      .filter((item) => !seen.has(item.id as string))
      .map((item) => item.id);
    throw new GenerationError(
      `Ordem de ${label} está incompleta: falta ${faltando.map((id) => `"${id}"`).join(", ")}. A permutação precisa citar todos os itens.`,
    );
  }

  return reordenados;
}

function reorderResume(resume: Resume, order: ResumeOrder | undefined): Resume {
  if (order === undefined) return resume;

  const jobs = applyOrder(resume.jobs, order.jobs, "experiências").map((job) => {
    const bulletOrder = order.bullets?.[job.id as string];
    return {
      ...job,
      bullets: applyOrder(job.bullets, bulletOrder, `bullets de "${job.id}"`),
    };
  });

  const desconhecidos = Object.keys(order.bullets ?? {}).filter(
    (jobId) => !resume.jobs.some((job) => (job.id as string) === jobId),
  );
  if (desconhecidos.length > 0) {
    throw new GenerationError(
      `Ordem de bullets cita experiência que não existe no currículo: ${desconhecidos
        .map((id) => `"${id}"`)
        .join(", ")}.`,
    );
  }

  return {
    ...resume,
    jobs,
    education: applyOrder(resume.education, order.education, "formações"),
  };
}

// ── Superfície pública ──────────────────────────────────────────────────────────

/**
 * Produz o currículo final a partir do currículo de origem, do conjunto de patches
 * que o usuário marcou e da ordem definida pela IA.
 *
 * O conjunto é conjunto, não sequência: dois patches no mesmo trecho são recusados em
 * vez de o último vencer, para que o resultado não dependa da ordem em que a interface
 * iterou os checkboxes.
 *
 * O conteúdo do patch não é julgado. Uma sugestão de melhoria pode propor texto que a
 * IA escreveu, inclusive uma métrica ausente do currículo importado — é isso que a
 * torna uma sugestão. O que a regra garante é o outro lado: sem marcação, nada
 * substitui o original.
 */
export function generateFinal(
  resume: Resume,
  patches: readonly Patch[],
  order?: ResumeOrder,
): Resume {
  assertPatchesAreApplicable(resume, patches);

  const comPatches = patches.reduce(
    (parcial, patch) => applyPatch(parcial, patch),
    resume,
  );

  return reorderResume(comPatches, order);
}

/**
 * Valida o conjunto inteiro antes de aplicar qualquer coisa: ou o currículo final sai
 * completo, ou não sai nenhum — nunca um parcialmente aplicado.
 */
function assertPatchesAreApplicable(resume: Resume, patches: readonly Patch[]): void {
  const vistos = new Map<string, number>();

  for (const patch of patches) {
    const address = String(patch.path);

    try {
      // Resolver aqui garante que a forma é válida e que o id existe.
      resolvePath(resume, address);
    } catch (error) {
      if (error instanceof PathError) {
        throw new GenerationError(
          `Patch não pode ser aplicado: ${error.message} Nenhum currículo final foi produzido.`,
        );
      }
      throw error;
    }

    // Normaliza pelo path canônico: dois textos diferentes para o mesmo trecho são
    // o mesmo conflito, mesmo escritos de formas distintas.
    const canonical = pathOf(parsePath(address));
    vistos.set(canonical, (vistos.get(canonical) ?? 0) + 1);
  }

  const conflitos = [...vistos.entries()]
    .filter(([, quantidade]) => quantidade > 1)
    .map(([path]) => path);

  if (conflitos.length > 0) {
    throw new GenerationError(
      `Dois patches endereçam o mesmo trecho: ${conflitos
        .map((path) => `"${path}"`)
        .join(", ")}. O conjunto precisa de no máximo uma proposta por trecho.`,
    );
  }
}

/**
 * Trechos que a IA propôs e o usuário ainda não confirmou. A geração sempre marca o
 * que aplica como confirmado, então isto só aparece em conteúdo que chegou de fora
 * já nesse estado.
 */
export function unconfirmedProposals(
  resume: Resume,
): { path: ResumePath; value: TextValue | Period }[] {
  const pendentes: { path: ResumePath; value: TextValue | Period }[] = [];

  const consider = (path: ResumePath, value: TextValue | Period) => {
    if (value.origin.kind === "proposed" && !value.origin.confirmed) {
      pendentes.push({ path, value });
    }
  };

  if (resume.summary !== null) consider(summaryPath(), resume.summary);
  for (const job of resume.jobs) {
    consider(jobPeriodPath(job.id), job.period);
    for (const bullet of job.bullets) {
      consider(jobBulletPath(job.id, bullet.id), bullet.value);
    }
  }
  for (const education of resume.education) {
    consider(educationPeriodPath(education.id), education.period);
  }
  if (resume.skills !== null) consider(skillsPath(), resume.skills);

  return pendentes;
}
