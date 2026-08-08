/**
 * Fonte legível das fixtures binárias.
 *
 * DOCX e PDF não se revisam em diff. O conteúdo mora aqui, em texto, e
 * `scripts/build-fixtures.mjs` gera os arquivos a partir dele — assim a fixture é
 * reproduzível e a mudança aparece na revisão.
 *
 * O currículo é o mesmo de `fixtures/resumes.ts`, com os defeitos que o handoff usa
 * como exemplo: bullet sem número, escopo sem escala, verbo genérico, períodos
 * sobrepostos, data em formato solto e habilidades em texto corrido.
 */

export const header = {
  name: "Marina Alencar",
  role: "Engenheira de Software",
  /**
   * Cada linha numa entrada própria — no DOCX elas viram um parágrafo só com soft
   * breaks (Shift+Enter), que é exatamente o caso que o parsing precisa reproduzir.
   */
  contact: ["marina.alencar@email.com", "(11) 98888-1234", "São Paulo, SP"],
};

export const summary =
  "Engenheira back-end com experiência em plataformas de pagamento, liderando squads e cuidando de performance.";

export const jobs = [
  {
    company: "Fintech Kobo",
    role: "Tech Lead",
    period: "01/2025 – atual",
    bullets: [
      "Liderei a migração da plataforma de pagamentos.",
      "Conduzi rituais de squad e mentoria de pessoas engenheiras.",
    ],
  },
  {
    company: "Fintech Kobo",
    role: "Engenheira de Software Sênior",
    period: "03/2022 – 12/2024",
    bullets: [
      "Reescrevi o serviço de antifraude.",
      "Reduzi o custo de infraestrutura em R$ 1,2M/ano com rightsizing e cache de consultas.",
    ],
  },
  {
    company: "Banco Órion",
    role: "Engenheira de Software Pleno",
    // Sobrepõe o período anterior em 10 meses.
    period: "01/2020 – 12/2022",
    bullets: [
      "Integrei o core bancário a três parceiros de pagamento.",
      "Participei da melhoria da qualidade do código.",
    ],
  },
  {
    company: "Agência Vetor",
    role: "Desenvolvedora Júnior",
    // Só anos: fica incompleto, e o usuário completa.
    period: "2018 - 2019",
    bullets: ["Desenvolvi sites institucionais para clientes de varejo."],
  },
];

export const education = [
  {
    course: "Pós-graduação em Engenharia de Dados",
    school: "Insper",
    period: "02/2025 – 06/2026",
  },
  {
    course: "Bacharelado em Ciência da Computação",
    school: "Universidade Federal do ABC",
    period: "02/2015 – 12/2019",
  },
];

export const skills = "Go, Python, AWS, Kubernetes, PostgreSQL, Kafka, Terraform";

export const sectionTitles = {
  summary: "Resumo",
  experience: "Experiência profissional",
  education: "Formação",
  skills: "Habilidades",
};

/** Títulos em inglês, para a fixture que exercita o dicionário bilíngue. */
export const sectionTitlesEn = {
  summary: "Summary",
  experience: "Professional Experience",
  education: "Education",
  skills: "Skills",
};
