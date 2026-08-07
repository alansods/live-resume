import { z } from "zod";
import {
  assertNumbersPreserved,
  assertShapePreserved,
  shapeOf,
  TranslationError,
  type TranslatedSpan,
} from "@/lib/export/translation";
import type { Locale } from "@/lib/i18n/dictionary";
import { proposed, type TextValue } from "@/lib/resume/origin";
import type { Resume } from "@/lib/resume/schema";
import { createAiClient, type AiClient } from "./client";

/**
 * Tradução do conteúdo do currículo para o idioma de saída.
 *
 * É o único momento em que o currículo do usuário muda de idioma — em tela, nunca: o
 * toggle da top bar traduz só a interface.
 *
 * Dois cuidados moldam o módulo:
 *
 * 1. **Nome próprio não se traduz.** "Fintech Kobo" virando "Kobo Fintech Company"
 *    estraga a busca do recrutador. Empresa, instituição, nome e contato nem aparecem
 *    no schema da resposta: o currículo traduzido é montado campo a campo a partir do
 *    original, então não existe caminho pelo qual eles mudem.
 * 2. **Tradução não é reescrita.** Como o texto deve mudar, a trava não pode ser
 *    textual: é de estrutura e de números. Ver `lib/export/translation.ts`.
 *
 * Falha aqui é erro, e não recurso: um arquivo marcado como "English" que sai em
 * português é pior que arquivo nenhum.
 */

const IDIOMAS: Record<Locale, string> = {
  pt: "português do Brasil",
  en: "inglês",
};

function system(target: Locale): string {
  return `Você traduz o conteúdo de um currículo para ${IDIOMAS[target]}.

Traduza apenas o que for pedido no formato de resposta: cargo do cabeçalho, resumo, cargo
de cada experiência, bullets, curso de cada formação e habilidades.

Regras invioláveis:
- NÃO traduza nome de pessoa, contato, nome de empresa nem nome de instituição de ensino.
  Eles não estão no formato de resposta justamente por isso.
- PRESERVE todos os números exatamente como estão: percentuais, valores, quantidades,
  tamanhos de equipe. Um número que muda na tradução vira dado falso no currículo.
- NÃO acrescente, remova ou junte itens. Cada id recebido volta exatamente uma vez.
- NÃO melhore, resuma nem reescreva o texto. Traduzir é dizer o mesmo em outro idioma.
- Use o vocabulário profissional corrente do idioma de destino para cargos e áreas.
- Informe em "language" o idioma em que o currículo ESTÁ, não o de destino: "pt" para
  português, "en" para inglês.`;
}

const responseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    language: { type: "string", enum: ["pt", "en"] },
    headerRole: { type: "string" },
    summary: { type: "string" },
    skills: { type: "string" },
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          role: { type: "string" },
          bullets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
              },
              required: ["id", "text"],
            },
          },
        },
        required: ["id", "role", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          course: { type: "string" },
        },
        required: ["id", "course"],
      },
    },
  },
  required: ["language", "headerRole", "jobs", "education"],
};

/**
 * O que a IA devolve. Note o que **não** está aqui: nome, contato, empresa e
 * instituição. O que não existe no schema não tem como ser traduzido por engano.
 */
const RawTranslationSchema = z.strictObject({
  language: z.enum(["pt", "en"]),
  headerRole: z.string(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  jobs: z.array(
    z.strictObject({
      id: z.string(),
      role: z.string(),
      bullets: z.array(z.strictObject({ id: z.string(), text: z.string() })),
    }),
  ),
  education: z.array(z.strictObject({ id: z.string(), course: z.string() })),
});

type RawTranslation = z.infer<typeof RawTranslationSchema>;

/** O currículo como o modelo o recebe: só os campos traduzíveis, com os seus ids. */
export function renderTranslatable(resume: Resume): string {
  const linhas = [`cargo | ${resume.header.role}`];

  if (resume.summary !== null) linhas.push(`resumo | ${resume.summary.text}`);
  if (resume.skills !== null) linhas.push(`habilidades | ${resume.skills.text}`);

  for (const job of resume.jobs) {
    linhas.push(`experiência ${job.id} | cargo: ${job.role}`);
    for (const bullet of job.bullets) {
      linhas.push(`  bullet ${bullet.id} | ${bullet.value.text}`);
    }
  }
  for (const item of resume.education) {
    linhas.push(`formação ${item.id} | curso: ${item.course}`);
  }

  return linhas.join("\n");
}

/**
 * Texto de máquina que o usuário pediu. A marcação do idioma na etapa 04 é a
 * confirmação — o mesmo papel que o checkbox cumpre para o texto de uma sugestão.
 */
function traduzido(text: string): TextValue {
  return { text, origin: proposed(true) };
}

/** Monta o currículo traduzido a partir do original, campo a campo. */
function montar(resume: Resume, raw: RawTranslation): Resume {
  const jobsPorId = new Map(raw.jobs.map((job) => [job.id, job]));
  const educacaoPorId = new Map(raw.education.map((item) => [item.id, item]));

  return {
    // Nome e contato vêm da entrada, sempre.
    header: { ...resume.header, role: raw.headerRole },
    summary: resume.summary === null ? null : traduzido(raw.summary ?? ""),
    jobs: resume.jobs.map((job) => {
      const traduzida = jobsPorId.get(job.id as string);
      const bulletsPorId = new Map(
        (traduzida?.bullets ?? []).map((bullet) => [bullet.id, bullet.text]),
      );
      return {
        ...job,
        // Empresa e período: da entrada.
        role: traduzida?.role ?? job.role,
        bullets: job.bullets.map((bullet) => ({
          ...bullet,
          value: traduzido(bulletsPorId.get(bullet.id as string) ?? bullet.value.text),
        })),
      };
    }),
    education: resume.education.map((item) => ({
      ...item,
      // Instituição e período: da entrada.
      course: educacaoPorId.get(item.id as string)?.course ?? item.course,
    })),
    skills: resume.skills === null ? null : traduzido(raw.skills ?? ""),
  };
}

/** Os pares original/traduzido que a verificação de números confere. */
function spans(resume: Resume, raw: RawTranslation): TranslatedSpan[] {
  const pares: TranslatedSpan[] = [
    { label: "cargo do cabeçalho", before: resume.header.role, after: raw.headerRole },
  ];

  if (resume.summary !== null) {
    pares.push({
      label: "resumo",
      before: resume.summary.text,
      after: raw.summary ?? "",
    });
  }
  if (resume.skills !== null) {
    pares.push({
      label: "habilidades",
      before: resume.skills.text,
      after: raw.skills ?? "",
    });
  }

  for (const job of raw.jobs) {
    const original = resume.jobs.find((candidato) => (candidato.id as string) === job.id);
    if (!original) continue;

    pares.push({
      label: `cargo de "${job.id}"`,
      before: original.role,
      after: job.role,
    });
    for (const bullet of job.bullets) {
      const bulletOriginal = original.bullets.find(
        (candidato) => (candidato.id as string) === bullet.id,
      );
      if (!bulletOriginal) continue;
      pares.push({
        label: `bullet "${bullet.id}"`,
        before: bulletOriginal.value.text,
        after: bullet.text,
      });
    }
  }

  for (const item of raw.education) {
    const original = resume.education.find(
      (candidato) => (candidato.id as string) === item.id,
    );
    if (!original) continue;
    pares.push({
      label: `curso de "${item.id}"`,
      before: original.course,
      after: item.course,
    });
  }

  return pares;
}

export type TranslateResumeOptions = {
  client?: AiClient;
  model?: string;
};

export async function translateResume(
  resume: Resume,
  target: Locale,
  options: TranslateResumeOptions = {},
): Promise<Resume> {
  const client = options.client ?? createAiClient();

  const raw = await client.generateStructured({
    system: system(target),
    prompt: `Currículo a traduzir, um trecho por linha:\n\n${renderTranslatable(resume)}`,
    responseSchema,
    validate: RawTranslationSchema,
    model: options.model,
  });

  // Já está no idioma pedido: entrega o original e joga a resposta fora sem ler. O caso
  // "português pedido em português" não pode voltar levemente reescrito.
  if (raw.language === target) return resume;

  assertShapePreserved(shapeOf(resume), {
    jobs: raw.jobs.map((job) => job.id),
    bullets: Object.fromEntries(
      raw.jobs.map((job) => [job.id, job.bullets.map((bullet) => bullet.id)]),
    ),
    education: raw.education.map((item) => item.id),
  });

  assertNumbersPreserved(spans(resume, raw));

  return montar(resume, raw);
}

export { TranslationError };
