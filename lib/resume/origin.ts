import { z } from "zod";

/**
 * Origem de um trecho do currículo.
 *
 * Existe para tornar verificável a regra de produto: texto gerado pela IA nunca
 * substitui o original por conta própria. A IA pode inventar conteúdo *dentro da
 * sugestão* — é o que a torna uma sugestão de melhoria —, mas ele só entra no
 * currículo através de um patch que o usuário marcou, e aí fica registrado como
 * proposto e confirmado.
 *
 * É metadado interno: nunca vira conteúdo do currículo nem é renderizado.
 */
export const OriginSchema = z.discriminatedUnion("kind", [
  /** Veio do arquivo que o usuário importou. */
  z.strictObject({ kind: z.literal("imported") }),
  /** O usuário digitou na etapa 2. */
  z.strictObject({ kind: z.literal("typed") }),
  /**
   * A IA propôs. `confirmed` é obrigatório justamente para que não exista proposta
   * sem uma resposta explícita sobre a marcação do usuário.
   */
  z.strictObject({ kind: z.literal("proposed"), confirmed: z.boolean() }),
]);

export type Origin = z.infer<typeof OriginSchema>;

export const imported: Origin = { kind: "imported" };
export const typed: Origin = { kind: "typed" };
export function proposed(confirmed: boolean): Origin {
  return { kind: "proposed", confirmed };
}

/** Um trecho: o texto e de onde ele veio. Sem valor anterior, sem marca de alteração. */
export const TextValueSchema = z.strictObject({
  text: z.string(),
  origin: OriginSchema,
});

export type TextValue = z.infer<typeof TextValueSchema>;

/** Conteúdo de máquina ainda não confirmado pelo usuário. */
export function isUnconfirmedProposal(origin: Origin): boolean {
  return origin.kind === "proposed" && !origin.confirmed;
}
