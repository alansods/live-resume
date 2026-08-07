import { asItemId } from "@/lib/resume/ids";
import { imported, type TextValue } from "@/lib/resume/origin";
import { parsePeriod, type Period } from "@/lib/resume/period";
import type { Resume } from "@/lib/resume/schema";

/**
 * Currículos de teste.
 *
 * Os ids são fixos e falantes de propósito: em produção eles são opacos, mas numa
 * fixture um `job-kobo-lead` mantém teste e mensagem de erro legíveis. O que a
 * fixture não pode fazer é depender do formato do id — nenhum código lê significado
 * dele.
 */

function text(value: string): TextValue {
  return { text: value, origin: imported };
}

/** O período vem do mesmo parser que a importação usa — fixture não duplica regra. */
function period(raw: string): Period {
  return parsePeriod(raw, imported);
}

/**
 * Currículo importado, com os defeitos que a etapa 3 do handoff usa como exemplo:
 * bullet sem número, escopo sem escala, verbo genérico, períodos sobrepostos em 10
 * meses, data em formato solto e habilidades em texto corrido.
 */
export const importedResume: Resume = {
  header: {
    name: "Marina Alencar",
    role: "Engenheira de Software",
    contact: "marina.alencar@email.com · (11) 98888-1234 · São Paulo, SP",
  },
  summary: text(
    "Engenheira back-end com experiência em plataformas de pagamento, liderando squads e cuidando de performance.",
  ),
  jobs: [
    {
      id: asItemId("job-kobo-lead"),
      company: "Fintech Kobo",
      role: "Tech Lead",
      period: period("01/2025 – atual"),
      bullets: [
        // Sem resultado mensurável.
        {
          id: asItemId("bullet-kobo-lead-1"),
          value: text("Liderei a migração da plataforma de pagamentos."),
        },
        {
          id: asItemId("bullet-kobo-lead-2"),
          value: text("Conduzi rituais de squad e mentoria de pessoas engenheiras."),
        },
      ],
    },
    {
      id: asItemId("job-kobo-senior"),
      company: "Fintech Kobo",
      role: "Engenheira de Software Sênior",
      period: period("03/2022 – 12/2024"),
      bullets: [
        // Escopo sem escala.
        {
          id: asItemId("bullet-kobo-senior-1"),
          value: text("Reescrevi o serviço de antifraude."),
        },
        {
          id: asItemId("bullet-kobo-senior-2"),
          value: text(
            "Reduzi o custo de infraestrutura em R$ 1,2M/ano com rightsizing e cache de consultas.",
          ),
        },
      ],
    },
    {
      id: asItemId("job-orion"),
      company: "Banco Órion",
      role: "Engenheira de Software Pleno",
      // Sobrepõe o período anterior em 10 meses.
      period: period("01/2020 – 12/2022"),
      bullets: [
        {
          id: asItemId("bullet-orion-1"),
          value: text("Integrei o core bancário a três parceiros de pagamento."),
        },
        // Verbo genérico, sem impacto.
        {
          id: asItemId("bullet-orion-2"),
          value: text("Participei da melhoria da qualidade do código."),
        },
      ],
    },
    {
      id: asItemId("job-vetor"),
      company: "Agência Vetor",
      role: "Desenvolvedora Júnior",
      // Formato solto: só anos, sem mês — fica incompleto, e o usuário completa.
      period: period("2018 - 2019"),
      bullets: [
        {
          id: asItemId("bullet-vetor-1"),
          value: text("Desenvolvi sites institucionais para clientes de varejo."),
        },
      ],
    },
  ],
  education: [
    {
      id: asItemId("edu-insper"),
      course: "Pós-graduação em Engenharia de Dados",
      school: "Insper",
      period: period("02/2025 – 06/2026"),
    },
    {
      id: asItemId("edu-ufabc"),
      course: "Bacharelado em Ciência da Computação",
      school: "Universidade Federal do ABC",
      period: period("02/2015 – 12/2019"),
    },
  ],
  // Texto corrido, como o documento ATS-safe exige.
  skills: text("Go, Python, AWS, Kubernetes, PostgreSQL, Kafka, Terraform"),
};

/**
 * Currículo com os dois defeitos de ATS: resumo feito de adjetivos de personalidade e
 * habilidades com símbolo de nível. Fora da área de tecnologia de propósito — a
 * detecção não pode depender de reconhecer stack.
 */
export const nonIndexableResume: Resume = {
  header: {
    name: "Rui Barbosa Nogueira",
    role: "Enfermeiro",
    contact: "rui.nogueira@email.com · (21) 97777-4321 · Niterói, RJ",
  },
  summary: text(
    "Profissional proativo, dinâmico e apaixonado por desafios, sempre em busca de novos aprendizados e de um ambiente que valorize o trabalho em equipe.",
  ),
  jobs: [
    {
      id: asItemId("job-hospital-santa-clara"),
      company: "Hospital Santa Clara",
      role: "Enfermeiro Assistencial",
      period: period("03/2019 – atual"),
      bullets: [
        {
          id: asItemId("bullet-santa-clara-1"),
          value: text("Atendi pacientes na unidade de terapia intensiva adulto."),
        },
      ],
    },
  ],
  education: [
    {
      id: asItemId("edu-uff"),
      course: "Bacharelado em Enfermagem",
      school: "Universidade Federal Fluminense",
      period: period("02/2013 – 12/2017"),
    },
  ],
  // Símbolo de nível, percentual e rótulo de proficiência no mesmo trecho.
  skills: text(
    "Emergência ★★★★☆ · UTI ★★★★★ · Excel — nível avançado (80%) · Inglês ★★★☆☆",
  ),
};

/** Só o obrigatório: sem resumo, sem formação e sem habilidades. */
export const minimalResume: Resume = {
  header: { name: "Joana Ribeiro", role: "", contact: "" },
  summary: null,
  jobs: [
    {
      id: asItemId("job-unico"),
      company: "Cooperativa Sul",
      role: "Analista Administrativa",
      period: period("05/2021 – atual"),
      bullets: [],
    },
  ],
  education: [],
  skills: null,
};
