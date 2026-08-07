/**
 * O erro que a camada de IA deixa escapar para o resto do projeto.
 *
 * É deliberadamente pobre em detalhe: quem chama sabe **que tipo** de falha aconteceu,
 * nunca qual provedor falhou nem o que a API respondeu. O detalhe bruto morre no
 * provedor, no `console.warn` do servidor.
 *
 * Os quatro motivos são o vocabulário que as rotas em `app/api/` traduzem em status
 * HTTP. Acrescentar um motivo obriga a atualizar as quatro rotas —
 * por isso o conjunto é fechado e pequeno.
 */

export type AiFailureReason =
  "missing-credentials" | "call-failed" | "invalid-response" | "quota-exceeded";

export class AiError extends Error {
  constructor(
    readonly reason: AiFailureReason,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/**
 * O que a pessoa lê. O detalhe da API não entra aqui — vai para o registro do servidor.
 *
 * A regressão que motivou isto: a mensagem era montada com o `message` do SDK, que é o
 * corpo inteiro da resposta do provedor. O JSON de erro atravessava a rota e aparecia
 * na etapa 01.
 */
export const MENSAGEM_DA_FALHA: Record<AiFailureReason, string> = {
  "missing-credentials":
    "Nenhum provedor de IA está configurado. Defina a chave de pelo menos um deles.",
  // Sem nome de provedor: para quem está na tela, "o Groq caiu" não é informação útil,
  // e dizê-lo entregaria uma escolha de infraestrutura que é nossa, não dela.
  "call-failed": "Nenhum provedor de IA disponível no momento. Tente novamente.",
  "invalid-response": "O modelo devolveu uma resposta que não pôde ser lida.",
  "quota-exceeded": "O limite de uso gratuito acabou. Tente novamente mais tarde.",
};
