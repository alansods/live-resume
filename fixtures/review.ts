import { importedResume } from "./resumes";
import {
  educationPeriodPath,
  jobBulletPath,
  jobPeriodPath,
  skillsPath,
  summaryPath,
} from "@/lib/resume/paths";
import type { Suggestion } from "@/lib/suggestions/model";

/**
 * Conjunto de sugestões para a etapa 03.
 *
 * Cobre os quatro tipos e os quatro tipos de âncora — resumo, bullet, período e
 * habilidades —, que é o que a tela precisa saber desenhar. Os paths são montados a
 * partir dos ids do currículo, como nas demais fixtures.
 */

const kobo = importedResume.jobs[0];
const orion = importedResume.jobs[2];
const vetor = importedResume.jobs[3];

export const revisaoDeExemplo: Suggestion[] = [
  {
    id: "sug-metrica-1",
    kind: "metric",
    path: jobBulletPath(kobo.id, kobo.bullets[0].id),
    where: "Fintech Kobo · Tech Lead",
    title: "Bullet sem resultado mensurável",
    before: kobo.bullets[0].value.text,
    after:
      "Liderei a migração da plataforma de pagamentos, reduzindo a latência p95 em 77% e mantendo zero incidente no fechamento mensal.",
    why: "Recrutador e ATS pontuam o resultado, não o esforço. Confirme os números antes de aceitar.",
    action: "apply",
    unsupportedNumbers: ["77"],
  },
  {
    id: "sug-verbo-1",
    kind: "verb",
    path: jobBulletPath(orion.id, orion.bullets[1].id),
    where: "Banco Órion · Engenheira de Software Pleno",
    title: "Verbo genérico, sem impacto",
    before: orion.bullets[1].value.text,
    after:
      "Elevei a cobertura de testes de 34% para 82%, reduzindo incidentes em produção.",
    why: '"Participei" descreve presença, não entrega. A frase passa a carregar ação e ganho.',
    action: "apply",
    unsupportedNumbers: ["34", "82"],
  },
  {
    id: "sug-data-1",
    kind: "dates",
    path: jobPeriodPath(orion.id),
    where: "Banco Órion ⇄ Fintech Kobo",
    title: "Períodos sobrepostos em 10 meses",
    before: orion.period.raw,
    after: "01/2020 – 02/2022",
    why: "Você entrou na Kobo em 03/2022, mas o Banco Órion está até 12/2022. Se não foi trabalho paralelo, a saída provável é 02/2022.",
    action: "fixDate",
    unsupportedNumbers: [],
  },
  {
    id: "sug-data-2",
    kind: "dates",
    path: jobPeriodPath(vetor.id),
    where: "Agência Vetor",
    title: "Período sem mês",
    before: vetor.period.raw,
    after: "01/2018 – 12/2019",
    why: "O arquivo trazia só os anos. Completamos com um mês plausível — confira antes de exportar.",
    action: "fixDate",
    unsupportedNumbers: [],
  },
  {
    id: "sug-data-3",
    kind: "dates",
    path: educationPeriodPath(importedResume.education[0].id),
    where: "Insper",
    title: "Formação em curso sem mês de início",
    before: importedResume.education[0].period.raw,
    after: "02/2025 – 06/2026",
    why: "Período completo em mm/aaaa é o que o parser lê corretamente.",
    action: "fixDate",
    unsupportedNumbers: [],
  },
  {
    id: "sug-ats-1",
    kind: "ats",
    path: summaryPath(),
    where: "",
    title: "Resumo sem palavra-chave da área",
    before: importedResume.summary!.text,
    after:
      "Engenheira back-end com 8 anos em plataformas de pagamento de alto volume (Go, Python, AWS). Reduzi latência p95 em 77% liderando squads de 4 a 7 pessoas.",
    why: "O resumo passa a carregar stack, escala e resultado — os termos pelos quais alguém procura.",
    action: "rewrite",
    unsupportedNumbers: ["8", "77", "4", "7"],
  },
  {
    id: "sug-ats-2",
    kind: "ats",
    path: skillsPath(),
    where: "",
    title: "Habilidades podem ser agrupadas",
    before: importedResume.skills!.text,
    after:
      "Go, Python, Java · PostgreSQL, Redis, Kafka · AWS (ECS, Lambda, RDS), Terraform, Docker, Kubernetes",
    why: "Agrupar por domínio mantém a lista indexável e mais legível para quem lê rápido.",
    action: "toText",
    unsupportedNumbers: [],
  },
];
