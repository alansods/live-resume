import { newItemId } from "@/lib/resume/ids";
import { parsePath, pathOf, resolvePath } from "@/lib/resume/paths";
import type { Resume } from "@/lib/resume/schema";
import { markEstimates, unsupportedNumbers } from "./numbers";
import { hasProficiencyIndicator } from "./proficiency";
import type { RawAtsSuggestion, RawSuggestion, Suggestion } from "./model";

/**
 * Do que a IA devolveu para o que a etapa 03 pode exibir.
 *
 * Sugestão inválida é **descartada**, não é erro: ao contrário da importação — onde
 * uma resposta ruim corromperia o documento do usuário —, aqui ela só custa uma
 * sugestão a menos numa lista de sugestões. Derrubar tudo por uma proposta malformada
 * seria pior para quem usa.
 */

/** Construções que descrevem cargo em vez de entrega. */
const VERBOS_GENERICOS = [
  "responsavel por",
  "responsavel pela",
  "participei",
  "participacao",
  "trabalhei com",
  "trabalhei em",
  "atuei em",
  "atuei como",
  "auxiliei",
  "colaborei",
  "ajudei",
  "envolvido em",
  "responsible for",
  "worked on",
  "worked with",
  "helped",
  "participated",
  "involved in",
];

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function startsWithGenericVerb(texto: string): boolean {
  const normalizado = semAcento(texto);
  return VERBOS_GENERICOS.some((verbo) => normalizado.startsWith(verbo));
}

const TEM_NUMERO = /\d/;

/** Todo o texto que o usuário escreveu ou importou, para conferir os números. */
export function userMaterial(resume: Resume, extra: string[] = []): string {
  return [
    resume.header.name,
    resume.header.role,
    ...resume.header.contact,
    resume.summary?.text ?? "",
    resume.skills?.text ?? "",
    ...resume.jobs.flatMap((job) => [
      job.company,
      job.role,
      job.period.raw,
      ...job.bullets.map((bullet) => bullet.value.text),
    ]),
    ...resume.education.flatMap((item) => [item.course, item.school, item.period.raw]),
    ...extra,
  ].join(" ");
}

/** Onde a sugestão incide, em linguagem de usuário. */
function localDe(resume: Resume, jobId: string): string {
  const job = resume.jobs.find((candidato) => candidato.id === jobId);
  if (!job) return "";
  return job.role ? `${job.company} · ${job.role}` : job.company;
}

export type ValidateOptions = {
  /** Texto adicional do usuário — os itens digitados na etapa 02. */
  extraUserText?: string[];
  /** Injetável para teste: por padrão, id opaco novo. */
  makeId?: () => string;
};

export function validateSuggestions(
  resume: Resume,
  raw: RawSuggestion[],
  options: ValidateOptions = {},
): Suggestion[] {
  const material = userMaterial(resume, options.extraUserText);
  const makeId = options.makeId ?? (() => newItemId() as string);

  const porPath = new Map<string, Suggestion>();

  for (const proposta of raw) {
    let parsed;
    try {
      parsed = parsePath(proposta.path);
    } catch {
      // Forma fora das endereçáveis do modelo.
      continue;
    }

    // Métrica e verbo incidem sobre bullets. Período e seção são de outras changes.
    if (parsed.kind !== "jobBullet") continue;

    let before: string;
    try {
      const trecho = resolvePath(resume, proposta.path);
      if (trecho.kind !== "text") continue;
      before = trecho.value.text;
    } catch {
      // Id que não existe no currículo.
      continue;
    }

    // Bullet que já traz número não precisa de sugestão de métrica ausente.
    if (proposta.kind === "metric" && TEM_NUMERO.test(before)) continue;
    /*
     * E bullet que já começa por verbo de ação não tem o defeito que a sugestão de verbo
     * alega. É a trava simétrica à de métrica, e faltava: o prompt pede que a IA se cale
     * nesses casos, mas a nota desconta 3 pontos por sugestão pendente, então uma
     * proposta gratuita rebaixava um bullet que estava bom.
     */
    if (proposta.kind === "verb" && !startsWithGenericVerb(before)) continue;
    // Proposta de verbo que continua genérica não resolve nada.
    if (proposta.kind === "verb" && startsWithGenericVerb(proposta.after)) continue;
    // Proposta idêntica ao atual não é proposta.
    if (proposta.after.trim() === before.trim()) continue;

    const canonical = String(pathOf(parsed));
    // Primeira vence: a geração recusa dois patches no mesmo trecho, então o conflito
    // é resolvido aqui, na origem.
    if (porPath.has(canonical)) continue;

    porPath.set(canonical, {
      id: makeId(),
      kind: proposta.kind,
      path: canonical,
      where: localDe(resume, parsed.jobId),
      title: proposta.title,
      before,
      // O texto entregue já traz o til nos números que o material não sustenta: é ele
      // que a revisão exibe e que a exportação leva para o arquivo.
      after: markEstimates(proposta.after, material),
      why: proposta.why,
      action: "apply",
      unsupportedNumbers: unsupportedNumbers(proposta.after, material),
    });
  }

  return [...porPath.values()];
}

/**
 * Ancoragem das sugestões de ATS.
 *
 * Mesma política das demais — path que não resolve é descartado, uma sugestão por
 * trecho —, com dois destinos possíveis: o resumo e as habilidades. Bullet e período
 * são de outras changes, e uma sugestão de ATS que caia neles é proposta fora do lugar.
 */
export function validateAtsSuggestions(
  resume: Resume,
  raw: RawAtsSuggestion[],
  options: ValidateOptions = {},
): Suggestion[] {
  const material = userMaterial(resume, options.extraUserText);
  const makeId = options.makeId ?? (() => newItemId() as string);

  const porPath = new Map<string, Suggestion>();

  for (const proposta of raw) {
    let parsed;
    try {
      parsed = parsePath(proposta.path);
    } catch {
      continue;
    }

    if (parsed.kind !== "summary" && parsed.kind !== "skills") continue;

    let before: string;
    try {
      const trecho = resolvePath(resume, proposta.path);
      if (trecho.kind !== "text") continue;
      before = trecho.value.text;
    } catch {
      // Seção que o currículo não tem: não se propõe resumo para quem não tem resumo.
      continue;
    }

    /*
     * Habilidades sem indicador de nível não têm o defeito que a sugestão alega.
     *
     * O resumo não tem trava equivalente de propósito: "carrega palavra-chave?" é
     * julgamento de linguagem, varia por profissão, e é justamente o que o projeto
     * delega ao modelo. Indicador de nível não — é formatação, e formatação se verifica.
     */
    if (parsed.kind === "skills" && !hasProficiencyIndicator(before)) continue;

    if (proposta.after.trim() === before.trim()) continue;

    const canonical = String(pathOf(parsed));
    if (porPath.has(canonical)) continue;

    porPath.set(canonical, {
      id: makeId(),
      kind: "ats",
      path: canonical,
      // Vazio de propósito: "Resumo" e "Habilidades" são rótulos de interface, e
      // interface vem do i18n. A tela deriva o rótulo do path; nas sugestões de
      // bullet, `where` traz dado do currículo (empresa e cargo), que é outra coisa.
      where: "",
      title: proposta.title,
      before,
      after: markEstimates(proposta.after, material),
      why: proposta.why,
      action: parsed.kind === "summary" ? "rewrite" : "toText",
      unsupportedNumbers: unsupportedNumbers(proposta.after, material),
    });
  }

  return [...porPath.values()];
}
