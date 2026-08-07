/**
 * Classificação de falha de provedor — o que decide se a cadeia continua ou para.
 *
 * A pergunta é sempre a mesma: **tentar o próximo adiantaria?** Se o provedor está
 * ocupado, sem cota ou fora do ar, adianta. Se o pedido está errado, não adianta: o
 * próximo vai recusar igual, e teríamos gastado a cota de todos para chegar ao mesmo
 * lugar — mais devagar e escondendo o defeito real.
 */

export type ProviderFailureKind =
  /** 429, cota, limite por minuto. Passageiro por definição. */
  | "quota"
  /** 5xx, timeout, conexão. O serviço não está atendendo agora. */
  | "unavailable"
  /** 400/404/422: o pedido está errado. Nosso defeito, não do provedor. */
  | "invalid-request"
  /** 401/403: chave inválida ou sem permissão. Configuração, não indisponibilidade. */
  | "unauthorized"
  /** Respondeu, mas não com o que serve (vazio, texto truncado). */
  | "invalid-response";

/** Falha de um provedor específico, já classificada. Nunca sai da camada de IA. */
export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly kind: ProviderFailureKind,
    message: string,
    readonly detail?: { status?: number; cause?: unknown },
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Só estas duas fazem a cadeia seguir para o próximo provedor. */
export function isTemporary(kind: ProviderFailureKind): boolean {
  return kind === "quota" || kind === "unavailable";
}

const CODIGOS_DE_REDE = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

const PADRAO_DE_COTA =
  /rate.?limit|too many requests|quota|resource.?exhausted|capacity exceeded/i;

const PADRAO_DE_INDISPONIBILIDADE =
  /timeout|timed out|service unavailable|overloaded|temporarily|try again|aborted/i;

function lerNumero(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : undefined;
}

/**
 * Traduz o erro de um SDK qualquer no nosso vocabulário.
 *
 * Feito por _duck typing_ e não por `instanceof`: importar as classes de erro do
 * `openai` ou do `@google/genai` aqui traria os SDKs para dentro do módulo — e o
 * import dinâmico nos provedores existe justamente para que eles nunca entrem no
 * bundle nem sejam carregados sem necessidade.
 *
 * A ordem é status → código de rede → nome → mensagem, do sinal mais confiável para o
 * menos. Texto de mensagem é o último recurso: é a única pista quando o SDK embrulha o
 * erro e some com o status.
 */
export function classifyFailure(error: unknown): {
  kind: ProviderFailureKind;
  status?: number;
} {
  const bruto = error as
    | {
        status?: unknown;
        statusCode?: unknown;
        code?: unknown;
        name?: unknown;
        message?: unknown;
        response?: { status?: unknown };
      }
    | null
    | undefined;

  const status =
    lerNumero(bruto?.status) ??
    lerNumero(bruto?.statusCode) ??
    lerNumero(bruto?.response?.status);

  if (status !== undefined) {
    if (status === 429) return { kind: "quota", status };
    if (status === 408) return { kind: "unavailable", status };
    if (status >= 500) return { kind: "unavailable", status };
    if (status === 401 || status === 403) return { kind: "unauthorized", status };
    if (status >= 400) return { kind: "invalid-request", status };
  }

  const codigo = typeof bruto?.code === "string" ? bruto.code : undefined;
  if (codigo && CODIGOS_DE_REDE.has(codigo)) return { kind: "unavailable", status };

  const nome = typeof bruto?.name === "string" ? bruto.name : "";
  if (nome === "AbortError" || nome.startsWith("APIConnection")) {
    return { kind: "unavailable", status };
  }

  const mensagem = typeof bruto?.message === "string" ? bruto.message : "";
  if (PADRAO_DE_COTA.test(mensagem)) return { kind: "quota", status };
  if (PADRAO_DE_INDISPONIBILIDADE.test(mensagem)) {
    return { kind: "unavailable", status };
  }

  // Erro que não soubemos ler: tratamos como indisponibilidade e tentamos o próximo.
  //
  // A escolha é assimétrica de propósito. Errar para "temporário" custa uma tentativa
  // extra num provedor que provavelmente responde; errar para "definitivo" derruba o
  // pedido inteiro por um erro que talvez fosse só uma conexão caída. Defeito nosso de
  // verdade — pedido malformado — chega aqui com status 400 e é pego lá em cima.
  return { kind: "unavailable", status };
}
