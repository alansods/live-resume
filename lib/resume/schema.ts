import { z } from "zod";
import { ItemIdSchema } from "./ids";
import { PeriodSchema } from "./period";
import { TextValueSchema } from "./origin";

/**
 * Modelo canônico do currículo.
 *
 * Monolíngue por decisão de produto: o currículo existe no idioma do usuário. O
 * toggle da top bar traduz só a interface, e a tradução do conteúdo acontece
 * exclusivamente na exportação. Nenhum campo aceita par de idiomas — os objetos são
 * estritos, então `{ pt, en }` no lugar de um texto é erro de validação.
 */

/** Cabeçalho: nenhuma sugestão o endereça, então é texto simples. */
export const HeaderSchema = z.strictObject({
  name: z.string().min(1),
  role: z.string(),
  contact: z.string(),
});

export const BulletSchema = z.strictObject({
  id: ItemIdSchema,
  value: TextValueSchema,
});

export const JobSchema = z.strictObject({
  id: ItemIdSchema,
  company: z.string().min(1),
  role: z.string().min(1),
  period: PeriodSchema,
  bullets: z.array(BulletSchema),
});

export const EducationSchema = z.strictObject({
  id: ItemIdSchema,
  course: z.string().min(1),
  school: z.string().min(1),
  period: PeriodSchema,
});

const ResumeShapeSchema = z.strictObject({
  header: HeaderSchema,
  /** Seções opcionais: um currículo sem resumo ou sem habilidades é válido. */
  summary: TextValueSchema.nullable(),
  jobs: z.array(JobSchema),
  education: z.array(EducationSchema),
  /**
   * Habilidades são uma linha só — é assim que saem no documento ATS-safe, e é a
   * granularidade que o path `skills` endereça.
   */
  skills: TextValueSchema.nullable(),
});

/**
 * Ids são únicos dentro do currículo inteiro, não por lista: o path carrega só o id,
 * então um id repetido entre uma experiência e um bullet tornaria a resolução
 * ambígua.
 */
export const ResumeSchema = ResumeShapeSchema.superRefine((resume, ctx) => {
  const seen = new Set<string>();

  const visit = (id: string, path: (string | number)[]) => {
    if (seen.has(id)) {
      ctx.addIssue({
        code: "custom",
        message: `Id repetido no currículo: "${id}". Cada item precisa de um id próprio.`,
        path,
      });
    }
    seen.add(id);
  };

  resume.jobs.forEach((job, jobIndex) => {
    visit(job.id, ["jobs", jobIndex, "id"]);
    job.bullets.forEach((bullet, bulletIndex) => {
      visit(bullet.id, ["jobs", jobIndex, "bullets", bulletIndex, "id"]);
    });
  });
  resume.education.forEach((education, index) => {
    visit(education.id, ["education", index, "id"]);
  });
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Header = z.infer<typeof HeaderSchema>;
export type Job = z.infer<typeof JobSchema>;
export type Bullet = z.infer<typeof BulletSchema>;
export type Education = z.infer<typeof EducationSchema>;
