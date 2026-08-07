import {
  educationPeriodPath,
  jobBulletPath,
  jobPeriodPath,
  type ResumePath,
} from "@/lib/resume/paths";
import { periodsOverlap } from "@/lib/resume/period";
import type { Resume } from "@/lib/resume/schema";
import type { Block } from "./blocks";
import { referenceText } from "./verify";

/**
 * Relatório de importação.
 *
 * Parsing de currículo erra — e a única coisa pior que errar é errar em silêncio. O
 * relatório existe para o usuário perceber ainda na etapa 01 que uma experiência
 * inteira se perdeu, ou que uma data ficou pela metade.
 *
 * Ele é **descritivo**: conta o que houve, nunca propõe correção nem altera o
 * currículo. Propor é papel das sugestões.
 */

export type PeriodOverlap = {
  a: ResumePath;
  b: ResumePath;
};

export type ImportReport = {
  counts: {
    jobs: number;
    education: number;
    bullets: number;
  };
  /** Bullets sem nenhum número no texto — o material das sugestões de métrica. */
  bulletsWithoutNumber: ResumePath[];
  /** Períodos que ficaram sem mês, para o usuário completar. */
  incompletePeriods: ResumePath[];
  /** Pares de experiências cujos períodos se sobrepõem. */
  overlappingPeriods: PeriodOverlap[];
  /** Texto extraído que não foi parar em nenhum campo do currículo. */
  unusedText: string[];
};

const TEM_NUMERO = /\d/;

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildReport(resume: Resume, blocks: Block[]): ImportReport {
  const bulletsWithoutNumber: ResumePath[] = [];
  const incompletePeriods: ResumePath[] = [];
  let bullets = 0;

  for (const job of resume.jobs) {
    if (!job.period.complete) incompletePeriods.push(jobPeriodPath(job.id));
    for (const bullet of job.bullets) {
      bullets += 1;
      if (!TEM_NUMERO.test(bullet.value.text)) {
        bulletsWithoutNumber.push(jobBulletPath(job.id, bullet.id));
      }
    }
  }

  for (const education of resume.education) {
    if (!education.period.complete) {
      incompletePeriods.push(educationPeriodPath(education.id));
    }
  }

  const overlappingPeriods: PeriodOverlap[] = [];
  for (let i = 0; i < resume.jobs.length; i += 1) {
    for (let j = i + 1; j < resume.jobs.length; j += 1) {
      const resultado = periodsOverlap(resume.jobs[i].period, resume.jobs[j].period);
      // Período incompleto não é comparado com um mês assumido: ele já está na lista
      // de incompletos, e é lá que o usuário resolve.
      if (resultado.comparable && resultado.value) {
        overlappingPeriods.push({
          a: jobPeriodPath(resume.jobs[i].id),
          b: jobPeriodPath(resume.jobs[j].id),
        });
      }
    }
  }

  return {
    counts: {
      jobs: resume.jobs.length,
      education: resume.education.length,
      bullets,
    },
    bulletsWithoutNumber,
    incompletePeriods,
    overlappingPeriods,
    unusedText: findUnusedText(resume, blocks),
  };
}

/**
 * Blocos extraídos que não aparecem no currículo produzido.
 *
 * Títulos de seção caem aqui de propósito: eles são estrutura, não conteúdo, e o
 * currículo canônico não os guarda. A tela da etapa 01 decide como apresentar isso —
 * aqui o compromisso é não esconder nada.
 */
function findUnusedText(resume: Resume, blocks: Block[]): string[] {
  // Uma linha do arquivo costuma virar mais de um campo: "Tech Lead — Fintech Kobo" é
  // um bloco só e vira cargo e empresa. Por isso a pergunta não é "este bloco aparece
  // inteiro no currículo?", e sim "sobra alguma coisa depois de tirar dele tudo que
  // foi aproveitado?".
  const campos = [
    resume.header.name,
    resume.header.role,
    resume.header.contact,
    resume.summary?.text ?? "",
    resume.skills?.text ?? "",
    ...resume.jobs.flatMap((job) => [
      job.company,
      job.role,
      job.period.raw,
      ...job.bullets.map((bullet) => bullet.value.text),
    ]),
    ...resume.education.flatMap((item) => [item.course, item.school, item.period.raw]),
  ]
    .map(normalizar)
    .filter((campo) => campo.length > 0)
    // Do mais longo para o mais curto: senão "kobo" consome parte de "fintech kobo".
    .sort((a, b) => b.length - a.length);

  /** Separadores que sobram entre dois campos e não são conteúdo perdido. */
  const RESIDUO = /[\s—–\-·|,;:()[\]]+/g;

  return blocks
    .map((block) => block.text)
    .filter((texto) => {
      let restante = normalizar(texto);
      if (restante.length === 0) return false;

      for (const campo of campos) {
        if (restante.length === 0) break;
        restante = restante.split(campo).join(" ");
      }

      return restante.replace(RESIDUO, "").length > 0;
    });
}

/** Referência do texto extraído, para quem precisar auditar o relatório. */
export { referenceText };
