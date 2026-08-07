import { jobBulletPath } from "@/lib/resume/paths";
import type { Resume } from "@/lib/resume/schema";
import { RawSuggestionsSchema, type RawSuggestion } from "@/lib/suggestions/model";
import { validateSuggestions, type ValidateOptions } from "@/lib/suggestions/validate";
import type { Suggestion } from "@/lib/suggestions/model";
import { createAiClient, type AiClient } from "./client";

/**
 * Sugestões de métrica ausente e de verbo genérico.
 *
 * Detectar "bullet sem resultado mensurável" e "verbo que descreve cargo" fica com a
 * IA, não com regex: a variedade de como as pessoas escrevem currículo é grande
 * demais para uma lista de padrões. O código valida a forma, ancora ao trecho e
 * sinaliza os números que não consegue apoiar.
 */

const SYSTEM = `Você revisa bullets de currículo e propõe reescritas melhores.

Dois problemas interessam:
1. MÉTRICA AUSENTE — o bullet descreve uma atividade sem resultado mensurável.
   Proponha a mesma entrega com resultado, escala ou prazo.
2. VERBO GENÉRICO — o bullet começa por construções como "responsável por",
   "participei de", "trabalhei com", "atuei em". Elas descrevem cargo, não entrega.
   Proponha começando por verbo de ação.

Regras:
- Escreva no mesmo idioma do currículo.
- Preserve o sentido: a proposta trata da MESMA entrega, sem trocar a atividade.
- Prefira números que já apareçam no currículo. Quando precisar propor um número que
  não está lá, use um valor plausível e escreva-o precedido de "~", que é a marca de
  aproximação: "reduzi a fila de tickets em ~20%". Ele será marcado para o usuário
  confirmar. Números que já constam do currículo vão sem "~".
- Uma proposta por bullet, no máximo. Não proponha nada para bullets que já trazem
  resultado mensurável e começam por verbo de ação.
- Use exatamente o path informado para cada bullet.
- A justificativa explica por que a mudança ajuda, em uma ou duas frases.`;

const responseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          kind: { type: "string", enum: ["metric", "verb"] },
          title: { type: "string" },
          after: { type: "string" },
          why: { type: "string" },
        },
        required: ["path", "kind", "title", "after", "why"],
      },
    },
  },
  required: ["suggestions"],
};

/** Os bullets do currículo, cada um com o path que a IA deve devolver. */
export function renderBullets(resume: Resume): string {
  return resume.jobs
    .flatMap((job) =>
      job.bullets.map(
        (bullet) =>
          `${jobBulletPath(job.id, bullet.id)} | ${job.company} · ${job.role} | ${bullet.value.text}`,
      ),
    )
    .join("\n");
}

export type SuggestMetricsOptions = ValidateOptions & {
  client?: AiClient;
  model?: string;
};

export async function suggestMetrics(
  resume: Resume,
  options: SuggestMetricsOptions = {},
): Promise<Suggestion[]> {
  const bullets = renderBullets(resume);
  // Sem bullet não há o que sugerir — e uma chamada para descobrir isso é
  // desperdício previsível de dinheiro e latência.
  if (bullets.length === 0) return [];

  const client = options.client ?? createAiClient();

  const resposta = await client.generateStructured({
    system: SYSTEM,
    prompt: `Bullets do currículo, um por linha, no formato "path | onde | texto":\n\n${bullets}`,
    responseSchema,
    validate: RawSuggestionsSchema,
    model: options.model,
  });

  return validateSuggestions(resume, resposta.suggestions as RawSuggestion[], options);
}
