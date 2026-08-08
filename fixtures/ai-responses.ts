import type { Resume } from "@/lib/resume/schema";
import type { StructuredResume } from "@/lib/ai/structure";

/**
 * Respostas gravadas da IA, no formato que o modelo devolve.
 *
 * Elas são o que a suíte usa no lugar da API real. O conteúdo é o mesmo currículo das
 * outras fixtures, então o texto bate com o que a extração produz — que é justamente
 * o que a verificação anti-reescrita exige.
 */

export const respostaDoCurriculoCompleto: StructuredResume = {
  documentKind: "resume",
  header: {
    name: "Marina Alencar",
    role: "Engenheira de Software",
    contact: [
      "marina.alencar@email.com",
      "(11) 98888-1234",
      "São Paulo, SP",
    ],
  },
  summary:
    "Engenheira back-end com experiência em plataformas de pagamento, liderando squads e cuidando de performance.",
  jobs: [
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
      period: "01/2020 – 12/2022",
      bullets: [
        "Integrei o core bancário a três parceiros de pagamento.",
        "Participei da melhoria da qualidade do código.",
      ],
    },
    {
      company: "Agência Vetor",
      role: "Desenvolvedora Júnior",
      period: "2018 - 2019",
      bullets: ["Desenvolvi sites institucionais para clientes de varejo."],
    },
  ],
  education: [
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
  ],
  skills: "Go, Python, AWS, Kubernetes, PostgreSQL, Kafka, Terraform",
};

/**
 * A mesma resposta para o currículo de duas colunas: a IA remontou a ordem de leitura,
 * juntando os bullets da coluna da direita às experiências certas e as habilidades da
 * coluna da esquerda ao seu campo.
 *
 * O PDF de duas colunas quebra as linhas mais cedo, então o texto extraído vem
 * partido — e a resposta reflete isso, porque cada pedaço precisa existir literalmente
 * no extraído.
 */
export const respostaDoCurriculoEmDuasColunas: StructuredResume = {
  documentKind: "resume",
  header: {
    name: "Marina Alencar",
    role: "",
    contact: [
      "marina.alencar@email.com",
      "(11) 98888-1234",
      "São Paulo, SP",
    ],
  },
  summary: null,
  jobs: [
    {
      company: "Fintech Kobo",
      role: "Tech Lead",
      period: "01/2025 – atual",
      bullets: ["Liderei a migração da plataforma de", "pagamentos."],
    },
  ],
  education: [
    {
      course: "Pós-graduação em Engenharia de Dados",
      school: "Insper",
      period: "02/2025 – 06/2026",
    },
  ],
  skills: "Go, Python, AWS, Kubernetes, PostgreSQL,",
};

/** Uma proposta que reescreve em vez de distribuir — a verificação precisa recusar. */
export const respostaComTextoInventado: StructuredResume = {
  ...respostaDoCurriculoCompleto,
  jobs: respostaDoCurriculoCompleto.jobs.map((job, indice) =>
    indice === 0
      ? {
          ...job,
          bullets: [
            "Liderei a migração da plataforma de pagamentos, reduzindo a latência p95 em 77%.",
            ...job.bullets.slice(1),
          ],
        }
      : job,
  ),
};

/**
 * O veredito de que o documento não é um currículo.
 *
 * Os demais campos vêm vazios, como o prompt manda: não há currículo de onde tirá-los, e
 * preencher com o que estivesse por perto é exatamente o que se quer evitar.
 */
export const respostaDeDocumentoQueNaoECurriculo: StructuredResume = {
  documentKind: "not-a-resume",
  header: { name: "", role: "", contact: [] },
  summary: null,
  jobs: [],
  education: [],
  skills: null,
};

/** Mesmo sentido, palavras diferentes: também é reescrita. */
export const respostaReformulada: StructuredResume = {
  ...respostaDoCurriculoCompleto,
  summary: "Engenheira back-end especializada em plataformas de pagamento e performance.",
};

/**
 * Ordem devolvida pela IA na organização do currículo final.
 *
 * É montada a partir do currículo porque os ids são opacos e gerados — a fixture não
 * pode escrevê-los. A ordem escolhida é a curadoria plausível: cronológica inversa nas
 * experiências e nas formações, e o bullet mais forte de cada experiência na frente.
 */
export function ordemDaIa(resume: Resume) {
  return {
    jobs: resume.jobs.map((job) => job.id as string),
    bullets: resume.jobs
      .filter((job) => job.bullets.length > 1)
      .map((job) => ({
        jobId: job.id as string,
        bulletIds: [...job.bullets].reverse().map((bullet) => bullet.id as string),
      })),
    education: resume.education.map((item) => item.id as string),
  };
}

/**
 * Tradução gravada do currículo importado, de português para inglês.
 *
 * Montada a partir do currículo porque os ids são opacos. Os números atravessam
 * inalterados de propósito: é o que a verificação exige, e uma fixture que os alterasse
 * estaria testando o caminho de erro sem dizer.
 */
export function traducaoParaIngles(resume: Resume) {
  const emIngles: Record<string, string> = {
    "Liderei a migração da plataforma de pagamentos.":
      "Led the payments platform migration.",
    "Conduzi rituais de squad e mentoria de pessoas engenheiras.":
      "Ran squad ceremonies and mentored engineers.",
  };

  return {
    language: "pt" as const,
    headerRole: "Software Engineer",
    summary:
      "Backend engineer experienced in payment platforms, leading squads and owning performance.",
    skills: resume.skills?.text ?? "",
    jobs: resume.jobs.map((job) => ({
      id: job.id as string,
      role: job.role === "Tech Lead" ? "Tech Lead" : `${job.role} (EN)`,
      bullets: job.bullets.map((bullet) => ({
        id: bullet.id as string,
        text: emIngles[bullet.value.text] ?? `${bullet.value.text} (EN)`,
      })),
    })),
    education: resume.education.map((item) => ({
      id: item.id as string,
      course: `${item.course} (EN)`,
    })),
  };
}
