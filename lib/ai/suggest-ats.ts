import { skillsPath, summaryPath } from "@/lib/resume/paths";
import type { Resume } from "@/lib/resume/schema";
import {
  RawAtsSuggestionsSchema,
  type RawAtsSuggestion,
  type Suggestion,
} from "@/lib/suggestions/model";
import { validateAtsSuggestions, type ValidateOptions } from "@/lib/suggestions/validate";
import { createAiClient, type AiClient } from "./client";

/**
 * Sugestões de legibilidade por sistema de recrutamento.
 *
 * Duas, e só duas: o resumo que não carrega termo pelo qual alguém procura e as
 * habilidades escritas em marcação que o parser descarta. São os dois trechos que as
 * sugestões de métrica (bullets) e de data (períodos) não tocam.
 *
 * A detecção fica com a IA pelo mesmo motivo das métricas: "este resumo carrega
 * palavra-chave?" é julgamento sobre linguagem, e o resumo de um enfermeiro, de um
 * advogado e de um soldador não têm forma em comum. Qualquer lista de adjetivos
 * proibidos seria uma lista de currículos de tecnologia.
 *
 * O que a IA NÃO faz aqui é formatação: coluna única, tabela, fonte e data já são
 * garantidas pela geração, para todo currículo, marcado ou não.
 */

const SYSTEM = `Você revisa currículos para que sejam lidos corretamente por sistemas de recrutamento (ATS).

Dois problemas interessam, e nenhum outro:
1. RESUMO SEM PALAVRA-CHAVE (path "summary") — o resumo descreve a pessoa por traços de
   personalidade ("proativo", "dinâmico", "apaixonado por desafios") em vez de área de
   atuação, ferramentas, escala e resultado. Adjetivo de personalidade não é indexado.
   Proponha um resumo que carregue os termos pelos quais alguém procuraria esse
   profissional.
2. HABILIDADES NÃO INDEXÁVEIS (path "skills") — as habilidades vêm com indicador de
   nível: barra, símbolo repetido (★★★☆☆), percentual ("80%") ou rótulo de proficiência
   ("nível avançado"). O indicador some no parser e ocupa linha. Proponha as mesmas
   competências como lista corrida separada por vírgula.

Regras:
- Escreva no mesmo idioma do currículo.
- No máximo uma sugestão para "summary" e uma para "skills". Use exatamente esses paths.
- Não proponha nada para um trecho que já está bom: resumo que já nomeia área,
  ferramenta e resultado, ou habilidades que já são lista corrida sem indicador de nível.
- Ao converter habilidades, PRESERVE todas as competências listadas. O que sai é só o
  indicador de nível, nunca a competência. Não acrescente número nenhum.
- No resumo, prefira números que já apareçam no currículo. Quando propuser um número que
  não está lá, use um valor plausível — ele será marcado para o usuário confirmar.
- NÃO sugira nada sobre formatação do documento — coluna, tabela, fonte, formato de data,
  cabeçalho, tipo de arquivo. Isso é resolvido na geração e não é assunto seu.
- NÃO sugira nada para bullets de experiência nem para períodos.
- A justificativa explica por que a mudança ajuda a ser lido por máquina, em uma ou duas
  frases.`;

const responseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string", enum: ["summary", "skills"] },
          title: { type: "string" },
          after: { type: "string" },
          why: { type: "string" },
        },
        required: ["path", "title", "after", "why"],
      },
    },
  },
  required: ["suggestions"],
};

/** Os trechos que interessam, cada um com o path que a IA deve devolver. */
export function renderSections(resume: Resume): string {
  const linhas: string[] = [];
  if (resume.summary !== null) {
    linhas.push(`${summaryPath()} | Resumo | ${resume.summary.text}`);
  }
  if (resume.skills !== null) {
    linhas.push(`${skillsPath()} | Habilidades | ${resume.skills.text}`);
  }
  return linhas.join("\n");
}

export type SuggestAtsOptions = ValidateOptions & {
  client?: AiClient;
  model?: string;
};

export async function suggestAts(
  resume: Resume,
  options: SuggestAtsOptions = {},
): Promise<Suggestion[]> {
  const secoes = renderSections(resume);
  // Currículo sem resumo e sem habilidades não tem trecho endereçável aqui — e uma
  // chamada para descobrir isso é desperdício previsível de dinheiro e latência.
  if (secoes.length === 0) return [];

  const client = options.client ?? createAiClient();

  const resposta = await client.generateStructured({
    system: SYSTEM,
    prompt: `Trechos do currículo, um por linha, no formato "path | seção | texto":\n\n${secoes}`,
    responseSchema,
    validate: RawAtsSuggestionsSchema,
    model: options.model,
  });

  return validateAtsSuggestions(
    resume,
    resposta.suggestions as RawAtsSuggestion[],
    options,
  );
}
