import { asItemId, type ItemId } from "./ids";
import type { TextValue } from "./origin";
import type { Period } from "./period";
import type { Resume } from "./schema";

/**
 * Endereço de um trecho do currículo.
 *
 * O path é construído a partir de ids, não de posições: a IA define a ordem do
 * conteúdo na geração, e um path por índice passaria a apontar para outro trecho
 * assim que a lista mudasse. A string é a forma de transporte — é o que cada
 * sugestão carrega e o que a etapa 3 usa como âncora.
 *
 * Formas endereçáveis:
 *   summary
 *   skills
 *   jobs.<jobId>.period
 *   jobs.<jobId>.bullets.<bulletId>
 *   education.<educationId>.period
 */
export type ResumePath = string & { readonly __brand: "ResumePath" };

export type ParsedPath =
  | { kind: "summary" }
  | { kind: "skills" }
  | { kind: "jobPeriod"; jobId: ItemId }
  | { kind: "jobBullet"; jobId: ItemId; bulletId: ItemId }
  | { kind: "educationPeriod"; educationId: ItemId };

/** Falha de endereçamento. Sempre nomeia o path — nunca degrada em `undefined`. */
export class PathError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "PathError";
  }
}

// ── Construtores ────────────────────────────────────────────────────────────────
// Nenhum chamador monta path concatenando string: o formato mora aqui e só aqui.

export const summaryPath = (): ResumePath => "summary" as ResumePath;

export const skillsPath = (): ResumePath => "skills" as ResumePath;

export const jobPeriodPath = (jobId: ItemId): ResumePath =>
  `jobs.${jobId}.period` as ResumePath;

export const jobBulletPath = (jobId: ItemId, bulletId: ItemId): ResumePath =>
  `jobs.${jobId}.bullets.${bulletId}` as ResumePath;

export const educationPeriodPath = (educationId: ItemId): ResumePath =>
  `education.${educationId}.period` as ResumePath;

/** O path de um trecho já parseado — usado para devolver o endereço junto do valor. */
export function pathOf(parsed: ParsedPath): ResumePath {
  switch (parsed.kind) {
    case "summary":
      return summaryPath();
    case "skills":
      return skillsPath();
    case "jobPeriod":
      return jobPeriodPath(parsed.jobId);
    case "jobBullet":
      return jobBulletPath(parsed.jobId, parsed.bulletId);
    case "educationPeriod":
      return educationPeriodPath(parsed.educationId);
  }
}

// ── Parse ───────────────────────────────────────────────────────────────────────

function malformed(raw: string): never {
  throw new PathError(
    raw,
    `Path fora das formas endereçáveis do currículo: "${raw}". Esperado summary, skills, jobs.<jobId>.period, jobs.<jobId>.bullets.<bulletId> ou education.<educationId>.period.`,
  );
}

/**
 * Transforma a string na forma tipada correspondente. Forma desconhecida é erro, não
 * um path que "quase" funciona.
 */
export function parsePath(raw: string): ParsedPath {
  const segments = raw.split(".");

  if (segments.length === 1) {
    if (segments[0] === "summary") return { kind: "summary" };
    if (segments[0] === "skills") return { kind: "skills" };
    malformed(raw);
  }

  if (segments[0] === "jobs") {
    const [, jobId, section, bulletId] = segments;
    if (!jobId) malformed(raw);

    if (segments.length === 3 && section === "period") {
      return { kind: "jobPeriod", jobId: asItemId(jobId) };
    }
    if (segments.length === 4 && section === "bullets" && bulletId) {
      return {
        kind: "jobBullet",
        jobId: asItemId(jobId),
        bulletId: asItemId(bulletId),
      };
    }
    malformed(raw);
  }

  if (segments[0] === "education") {
    const [, educationId, section] = segments;
    if (segments.length === 3 && section === "period" && educationId) {
      return { kind: "educationPeriod", educationId: asItemId(educationId) };
    }
    malformed(raw);
  }

  malformed(raw);
}

// ── Resolução ───────────────────────────────────────────────────────────────────

/**
 * Um trecho resolvido. Os dois tipos existem porque nem todo trecho endereçável é
 * texto: períodos são estruturados, e quem os consome precisa saber disso.
 */
export type ResolvedSlice =
  | { kind: "text"; path: ResumePath; value: TextValue }
  | { kind: "period"; path: ResumePath; value: Period };

function notFound(raw: string, detail: string): never {
  throw new PathError(raw, `Path não resolve no currículo: "${raw}". ${detail}`);
}

/** Resolve o path contra o currículo. Id inexistente é erro, nunca valor vazio. */
export function resolvePath(resume: Resume, path: string): ResolvedSlice {
  const parsed = parsePath(path);
  const address = pathOf(parsed);

  switch (parsed.kind) {
    case "summary": {
      if (resume.summary === null) notFound(path, "O currículo não tem resumo.");
      return { kind: "text", path: address, value: resume.summary };
    }
    case "skills": {
      if (resume.skills === null) notFound(path, "O currículo não tem habilidades.");
      return { kind: "text", path: address, value: resume.skills };
    }
    case "jobPeriod": {
      const job = resume.jobs.find((candidate) => candidate.id === parsed.jobId);
      if (!job) notFound(path, `Não existe experiência com id "${parsed.jobId}".`);
      return { kind: "period", path: address, value: job.period };
    }
    case "jobBullet": {
      const job = resume.jobs.find((candidate) => candidate.id === parsed.jobId);
      if (!job) notFound(path, `Não existe experiência com id "${parsed.jobId}".`);
      const bullet = job.bullets.find((candidate) => candidate.id === parsed.bulletId);
      if (!bullet) {
        notFound(
          path,
          `A experiência "${parsed.jobId}" não tem bullet com id "${parsed.bulletId}".`,
        );
      }
      return { kind: "text", path: address, value: bullet.value };
    }
    case "educationPeriod": {
      const education = resume.education.find(
        (candidate) => candidate.id === parsed.educationId,
      );
      if (!education) {
        notFound(path, `Não existe formação com id "${parsed.educationId}".`);
      }
      return { kind: "period", path: address, value: education.period };
    }
  }
}

/** Todos os paths endereçáveis de um currículo, na ordem em que ele está. */
export function allPaths(resume: Resume): ResumePath[] {
  const paths: ResumePath[] = [];
  if (resume.summary !== null) paths.push(summaryPath());
  for (const job of resume.jobs) {
    paths.push(jobPeriodPath(job.id));
    for (const bullet of job.bullets) paths.push(jobBulletPath(job.id, bullet.id));
  }
  for (const education of resume.education) {
    paths.push(educationPeriodPath(education.id));
  }
  if (resume.skills !== null) paths.push(skillsPath());
  return paths;
}
