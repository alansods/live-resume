import { asItemId, type ItemId } from "@/lib/resume/ids";
import { typed } from "@/lib/resume/origin";
import { completePeriod, parsePeriod, type Period } from "@/lib/resume/period";
import {
  EducationSchema,
  JobSchema,
  type Bullet,
  type Education,
  type Job,
  type Resume,
} from "@/lib/resume/schema";
import type { ExperienceItem, IntakeContent } from "./content";

/**
 * Fusão do que foi digitado na etapa 02 com o currículo importado.
 *
 * Produz o **currículo em trabalho**: o importado mais o que o usuário escreveu, cada
 * trecho novo com origem `typed`. É função pura e é sempre refeita a partir do
 * importado — nunca do resultado anterior —, e é isso que torna verdadeiro, por
 * construção, que voltar à etapa 02 e editar recompõe em vez de acumular.
 *
 * Nenhum trecho importado é tocado. A IA não participa: aqui só entra conteúdo do
 * usuário.
 */

export type MergeResult = {
  resume: Resume;
  /**
   * O que o usuário escreveu e não virou item do currículo — porque faltava o
   * essencial (uma experiência sem empresa não é uma experiência). Não se perde: vai
   * às sugestões como material do usuário, para conferir os números que a IA propõe.
   */
  leftovers: string[];
};

/** Cada linha não vazia da caixa de entregas vira um bullet. */
function linhasDe(texto: string): string[] {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

/**
 * Id de bullet derivado do id da experiência.
 *
 * As entregas são uma caixa de texto livre: as linhas nascem e morrem a cada tecla, e
 * não há onde guardar um id por linha. Derivar mantém o id estável entre duas fusões do
 * mesmo texto, que é o que as sugestões precisam. O preço é que inserir uma linha no
 * meio desloca os ids das seguintes — só perceptível se o usuário reescrever as
 * entregas depois de já ter sugestões, e nesse caso a sugestão antiga é descartada por
 * não resolver mais.
 */
function bulletId(jobId: ItemId, indice: number): ItemId {
  return asItemId(`${jobId}-b${indice}`);
}

/**
 * Período de um item digitado.
 *
 * Mesmo caminho da importação (`parsePeriod`), sem paralelo: o que o usuário escreve num
 * campo de data é lido pela mesma regra que lê o que veio do arquivo. Fim em andamento
 * é fim em aberto, e não uma data ausente.
 */
function periodoDe(inicio: string, fim: string, ongoing: boolean): Period {
  const raw = ongoing ? inicio.trim() : `${inicio.trim()} – ${fim.trim()}`;
  const lido = parsePeriod(raw, typed);
  return ongoing ? completePeriod(lido, { end: { open: true } }) : lido;
}

/** Os textos que o usuário escreveu num item, para o caso de ele não virar item. */
function textosDe(valores: string[]): string[] {
  return valores.map((valor) => valor.trim()).filter((valor) => valor.length > 0);
}

function formacoesDe(content: IntakeContent): {
  itens: Education[];
  leftovers: string[];
} {
  const itens: Education[] = [];
  const leftovers: string[] = [];

  for (const item of content.education) {
    const candidato = {
      id: item.id,
      course: item.course.trim(),
      school: item.school.trim(),
      period: periodoDe(item.start, item.finish, false),
    };

    const validado = EducationSchema.safeParse(candidato);
    if (validado.success) itens.push(validado.data);
    else leftovers.push(...textosDe([item.course, item.school, item.start, item.finish]));
  }

  return { itens, leftovers };
}

function bulletsDe(item: ExperienceItem): Bullet[] {
  return linhasDe(item.delivered).map((linha, indice) => ({
    id: bulletId(item.id, indice),
    value: { text: linha, origin: typed },
  }));
}

function experienciasDe(content: IntakeContent): {
  itens: Job[];
  leftovers: string[];
} {
  const itens: Job[] = [];
  const leftovers: string[] = [];

  for (const item of content.experience) {
    const candidato = {
      id: item.id,
      company: item.company.trim(),
      role: item.role.trim(),
      period: periodoDe(item.start, item.end, item.ongoing),
      bullets: bulletsDe(item),
    };

    const validado = JobSchema.safeParse(candidato);
    if (validado.success) itens.push(validado.data);
    else {
      leftovers.push(
        ...textosDe([item.company, item.role, item.start, item.end]),
        ...linhasDe(item.delivered),
      );
    }
  }

  return { itens, leftovers };
}

/**
 * Habilidades são uma linha só no modelo — é assim que saem no documento ATS-safe.
 *
 * As digitadas são acrescentadas ao que veio do arquivo, e a linha passa a ter origem
 * `typed`: ela deixou de ser exatamente o que foi importado. Repetição não é removida:
 * comparar texto livre para decidir se duas habilidades são a mesma é o tipo de
 * heurística que este projeto não coloca disputando com a IA.
 */
function habilidadesDe(resume: Resume, content: IntakeContent): Resume["skills"] {
  const novas = content.skills
    .map((item) => item.name.trim())
    .filter((nome) => nome.length > 0);

  if (novas.length === 0) return resume.skills;

  const existente = resume.skills?.text.trim() ?? "";
  const texto =
    existente.length > 0 ? `${existente}, ${novas.join(", ")}` : novas.join(", ");

  return { text: texto, origin: typed };
}

export function mergeIntake(imported: Resume, content: IntakeContent): MergeResult {
  const formacoes = formacoesDe(content);
  const experiencias = experienciasDe(content);

  return {
    resume: {
      ...imported,
      jobs: [...imported.jobs, ...experiencias.itens],
      education: [...imported.education, ...formacoes.itens],
      skills: habilidadesDe(imported, content),
    },
    leftovers: [...formacoes.leftovers, ...experiencias.leftovers],
  };
}
