import type { RawAtsSuggestion, RawSuggestion } from "@/lib/suggestions/model";

/**
 * Respostas gravadas da IA para as sugestões.
 *
 * Os paths são preenchidos em tempo de teste, a partir dos ids do currículo — ids são
 * opacos e gerados, então não dá para escrevê-los aqui.
 */

export type RawSuggestionTemplate = Omit<RawSuggestion, "path">;

/** Bullet sem resultado mensurável. */
export const metricaAusente: RawSuggestionTemplate = {
  kind: "metric",
  title: "Bullet sem resultado mensurável",
  after:
    "Liderei a migração da plataforma de pagamentos, reduzindo a latência p95 em 77% e mantendo zero incidente no fechamento mensal.",
  why: "Recrutador e ATS pontuam o resultado, não o esforço. Confirme os números antes de aceitar.",
};

/** Verbo que descreve cargo, não entrega. */
export const verboGenerico: RawSuggestionTemplate = {
  kind: "verb",
  title: "Verbo genérico, sem impacto",
  after:
    "Elevei a cobertura de testes de 34% para 82%, reduzindo incidentes em produção.",
  why: '"Participei" descreve presença, não entrega. A frase passa a carregar ação e ganho.',
};

/** Proposta que continua começando por construção genérica: precisa ser descartada. */
export const verboAindaGenerico: RawSuggestionTemplate = {
  kind: "verb",
  title: "Verbo genérico, sem impacto",
  after: "Trabalhei com a melhoria da qualidade do código do time.",
  why: "Deveria começar por verbo de ação.",
};

/** Proposta sem número nenhum. */
export const semNumeros: RawSuggestionTemplate = {
  kind: "verb",
  title: "Verbo genérico, sem impacto",
  after: "Padronizei a revisão de código do time e documentei o processo.",
  why: "Troca presença por entrega concreta.",
};

/** Proposta que só usa números já presentes no currículo. */
export const comNumeroDoUsuario: RawSuggestionTemplate = {
  kind: "metric",
  title: "Escopo sem escala",
  after:
    "Reescrevi o serviço de antifraude, sustentando o corte de R$ 1,2M/ano em infraestrutura.",
  why: "Aproveita o número que já constava do currículo.",
};

// ── Sugestões de ATS ────────────────────────────────────────────────────────────
// Elas carregam o path: "summary" e "skills" são fixos, não dependem de id gerado.

/** Resumo de adjetivos de personalidade, reescrito com área, escala e resultado. */
export const resumoSemPalavraChave: RawAtsSuggestion = {
  path: "summary",
  title: "Resumo sem palavra-chave da área",
  after:
    "Enfermeiro com 8 anos em terapia intensiva adulto, atuando em emergência e cuidados críticos. Coordeno equipes de plantão e protocolos de segurança do paciente.",
  why: "Adjetivos de personalidade não são indexados. O resumo passa a carregar a área, a especialidade e a escala pelas quais alguém procura.",
};

/** Habilidades com símbolo de nível, convertidas em lista corrida. */
export const habilidadesNaoIndexaveis: RawAtsSuggestion = {
  path: "skills",
  title: "Indicadores de nível não são lidos",
  after: "Emergência, UTI, Excel, Inglês",
  why: "Símbolos de nível somem no parser e ocupam linha. A lista separada por vírgula é indexada inteira.",
};

/** Proposta de ATS ancorada num bullet: fora do escopo, precisa ser descartada. */
export const atsForaDeEscopo: Omit<RawAtsSuggestion, "path"> = {
  title: "Bullet sem palavra-chave",
  after: "Atendi 40 pacientes por plantão na UTI adulto.",
  why: "Bullet é assunto das sugestões de métrica, não das de ATS.",
};
