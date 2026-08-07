/**
 * O contrato que todo provedor de IA cumpre.
 *
 * É a peça central da camada: o `AiService` só conhece esta interface, e por isso
 * trocar de provedor, mudar a ordem ou acrescentar um novo não toca em nenhuma regra
 * de negócio. O vocabulário é o de chat porque é o menor denominador comum entre
 * Gemini, Groq, Cerebras e qualquer serviço compatível com a OpenAI — não porque o
 * projeto converse com o modelo: aqui toda ida ao modelo é uma pergunta só, com
 * resposta em JSON.
 */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type GenerationOptions = {
  /**
   * Formato esperado da resposta, em JSON Schema. Presente, o provedor é obrigado a
   * devolver JSON nesse formato — cada um a seu modo (o Gemini tem campo próprio, os
   * compatíveis com a OpenAI usam `response_format`).
   *
   * O dialeto aceito aqui é o do JSON Schema comum, com `nullable: true` permitido;
   * cada provedor adapta para o que sua API exige.
   */
  responseSchema?: Record<string, unknown>;
  /** Nome do schema. Alguns provedores exigem um; serve só de rótulo. */
  schemaName?: string;
  /**
   * Sobrescreve o modelo do provedor que atender.
   *
   * Existe para experimento e teste. Em produção o modelo vem da configuração de cada
   * provedor, porque numa cadeia não se sabe de antemão quem vai responder — e o nome
   * do modelo do Groq não significa nada para o Gemini.
   */
  model?: string;
  /** Padrão 0: a saída precisa ser reprodutível, não criativa. */
  temperature?: number;
};

export type AiResponse = {
  /** O texto cru devolvido pelo modelo. Interpretá-lo é responsabilidade de quem pediu. */
  text: string;
  /** Quem respondeu e com qual modelo. Para registro e diagnóstico, nunca para a tela. */
  provider: string;
  model: string;
};

export interface AiProvider {
  /** Nome legível, usado nos registros. */
  readonly name: string;
  /**
   * Há credencial para tentar?
   *
   * Separado de `generate` de propósito: um provedor sem chave não é uma falha, é uma
   * peça que não está montada. O serviço o pula em silêncio em vez de queimar uma
   * tentativa e um erro para descobrir o óbvio.
   */
  isConfigured(): boolean;
  generate(messages: ChatMessage[], options?: GenerationOptions): Promise<AiResponse>;
}
