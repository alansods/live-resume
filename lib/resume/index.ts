/**
 * Superfície pública do modelo de currículo.
 *
 * O que NÃO está aqui é tão importante quanto o que está: não há `applyPatch`,
 * `applyOrder`, desfazer, reverter, restaurar valor anterior nem comparar currículo
 * de origem com final. A revisão não edita o currículo — ela marca sugestões —, e a
 * única transformação é `generateFinal`.
 */

export { ItemIdSchema, asItemId, newItemId, type ItemId } from "./ids";

export {
  OriginSchema,
  TextValueSchema,
  imported,
  isUnconfirmedProposal,
  proposed,
  typed,
  type Origin,
  type TextValue,
} from "./origin";

export {
  OpenEndSchema,
  PartialDateSchema,
  PeriodEndSchema,
  PeriodSchema,
  PeriodStartSchema,
  YearMonthSchema,
  comparePeriodStart,
  completePeriod,
  formatPeriod,
  isOpenEnd,
  isYearMonth,
  parsePeriod,
  periodsOverlap,
  type Comparison,
  type OpenEnd,
  type PartialDate,
  type Period,
  type PeriodEnd,
  type PeriodStart,
  type YearMonth,
} from "./period";

export {
  BulletSchema,
  EducationSchema,
  HeaderSchema,
  JobSchema,
  ResumeSchema,
  type Bullet,
  type Education,
  type Header,
  type Job,
  type Resume,
} from "./schema";

export {
  PathError,
  allPaths,
  educationPeriodPath,
  jobBulletPath,
  jobPeriodPath,
  parsePath,
  pathOf,
  resolvePath,
  skillsPath,
  summaryPath,
  type ParsedPath,
  type ResolvedSlice,
  type ResumePath,
} from "./paths";

export {
  GenerationError,
  generateFinal,
  unconfirmedProposals,
  type Patch,
  type ResumeOrder,
} from "./generate";

export { chronologicalOrder } from "./chronological";

export { SerializationError, deserializeResume, serializeResume } from "./serialize";
