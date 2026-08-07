import type { StructuredResume } from "@/lib/ai/structure";
import { newItemId } from "@/lib/resume/ids";
import { imported } from "@/lib/resume/origin";
import { parsePeriod } from "@/lib/resume/period";
import { ResumeSchema, type Resume } from "@/lib/resume/schema";

/**
 * Da resposta da IA para o modelo canônico.
 *
 * A IA devolve só texto. Ids, origem e normalização de período são aplicados aqui,
 * pelo código: são exatamente as três coisas que o modelo não pode escolher. Todo
 * trecho nasce com origem "importado" — o que a IA fez foi organizar conteúdo do
 * usuário, não propor nada.
 */
export function buildResume(structured: StructuredResume): Resume {
  const resume: Resume = {
    header: {
      name: structured.header.name,
      role: structured.header.role,
      contact: structured.header.contact,
    },
    summary:
      structured.summary === null ? null : { text: structured.summary, origin: imported },
    jobs: structured.jobs.map((job) => ({
      id: newItemId(),
      company: job.company,
      role: job.role,
      period: parsePeriod(job.period, imported),
      bullets: job.bullets.map((bullet) => ({
        id: newItemId(),
        value: { text: bullet, origin: imported },
      })),
    })),
    education: structured.education.map((item) => ({
      id: newItemId(),
      course: item.course,
      school: item.school,
      period: parsePeriod(item.period, imported),
    })),
    skills:
      structured.skills === null ? null : { text: structured.skills, origin: imported },
  };

  // O currículo produzido tem de valer pelas regras de `resume-model`, não só pelas
  // desta change.
  return ResumeSchema.parse(resume);
}
