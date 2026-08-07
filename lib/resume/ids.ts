import { z } from "zod";

/**
 * Identidade de item do currículo.
 *
 * A âncora entre sugestão e trecho é o id, não a posição: a IA define a ordem do
 * conteúdo na geração, e um path por índice apontaria para o trecho errado assim que
 * a lista mudasse. Por isso o id é opaco — nada (ordem, tipo, origem) pode ser
 * derivado do seu valor.
 */
export type ItemId = string & { readonly __brand: "ResumeItemId" };

/**
 * O ponto separa os segmentos de um path (`jobs.<jobId>.bullets.<bulletId>`), então
 * um id que contivesse ponto tornaria o path ambíguo.
 */
const FORBIDDEN_IN_ID = /\./;

export const ItemIdSchema = z
  .string()
  .min(1)
  .refine((raw) => !FORBIDDEN_IN_ID.test(raw), {
    message: "Id de item não pode conter ponto: o ponto separa segmentos de path.",
  })
  .transform((raw) => raw as ItemId);

/** Gera um id novo. Nunca reaproveita o id de um item removido. */
export function newItemId(): ItemId {
  return crypto.randomUUID() as ItemId;
}

/**
 * Converte uma string já existente em id — para fixtures e para conteúdo que chega
 * serializado, onde o id foi gerado antes.
 */
export function asItemId(raw: string): ItemId {
  if (raw.length === 0) {
    throw new Error("Id de item não pode ser vazio.");
  }
  if (FORBIDDEN_IN_ID.test(raw)) {
    throw new Error(
      `Id de item não pode conter ponto: "${raw}". O ponto separa segmentos de path.`,
    );
  }
  return raw as ItemId;
}
