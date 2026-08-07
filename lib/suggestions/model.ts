import { z } from "zod";

/**
 * Modelo de sugestão.
 *
 * É a forma que o cartão da etapa 03 exibe, e o contrato que as três changes de
 * sugestão compartilham — o tipo é um campo, não uma estrutura separada.
 *
 * Uma sugestão é **proposta**, nunca edição: ela não altera o currículo. Quem aplica
 * é a geração, e só o que o usuário marcar no checklist.
 */

export const suggestionKinds = ["metric", "verb", "dates", "ats"] as const;
export type SuggestionKind = (typeof suggestionKinds)[number];

/**
 * A ação vai como identificador, não como rótulo: o texto ("Aplicar", "Corrigir
 * data", "Normalizar", "Reescrever", "Converter em texto") é interface, e interface
 * vem do i18n na tela.
 */
export const suggestionActions = [
  "apply",
  "fixDate",
  "normalize",
  "rewrite",
  "toText",
] as const;
export type SuggestionAction = (typeof suggestionActions)[number];

export const SuggestionSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(suggestionKinds),
  /** Path do trecho, no formato de `resume-model`. */
  path: z.string().min(1),
  /** Onde a sugestão incide, em linguagem de usuário: "Fintech Kobo · Tech Lead". */
  where: z.string(),
  title: z.string().min(1),
  /** O texto como está no currículo agora. */
  before: z.string(),
  /** O texto que a IA propõe no lugar. */
  after: z.string().min(1),
  why: z.string().min(1),
  action: z.enum(suggestionActions),
  /**
   * Números do texto proposto que não aparecem no material do usuário.
   *
   * A IA pode propor número novo — é o que faz dela uma sugestão de melhoria. O que
   * não pode é o número passar por fato sem o usuário perceber: o que está aqui é o
   * que a etapa 03 pede para confirmar.
   */
  unsupportedNumbers: z.array(z.string()),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

/** O que a IA devolve. Id, texto atual, local e sinalização são nossos. */
export const RawSuggestionSchema = z.strictObject({
  path: z.string().min(1),
  kind: z.enum(["metric", "verb"]),
  title: z.string().min(1),
  after: z.string().min(1),
  why: z.string().min(1),
});

export type RawSuggestion = z.infer<typeof RawSuggestionSchema>;

export const RawSuggestionsSchema = z.strictObject({
  suggestions: z.array(RawSuggestionSchema),
});

/**
 * O que a IA devolve nas sugestões de ATS.
 *
 * Só dois trechos são endereçáveis aqui: o resumo e as habilidades. O `path` continua
 * string livre mesmo assim — restringi-lo no schema faria uma proposta mal ancorada
 * derrubar o lote inteiro, quando o certo é descartar só ela, como nas métricas.
 */
export const RawAtsSuggestionSchema = z.strictObject({
  path: z.string().min(1),
  title: z.string().min(1),
  after: z.string().min(1),
  why: z.string().min(1),
});

export type RawAtsSuggestion = z.infer<typeof RawAtsSuggestionSchema>;

export const RawAtsSuggestionsSchema = z.strictObject({
  suggestions: z.array(RawAtsSuggestionSchema),
});
