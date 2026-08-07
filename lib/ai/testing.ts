import { AiError, type AiClient, type StructuredRequest } from "./client";
import { MENSAGEM_DA_FALHA } from "./errors";
import { ProviderError, type ProviderFailureKind } from "./providers/errors";
import type { AiProvider, ChatMessage } from "./providers/types";

/**
 * Clientes de IA para teste.
 *
 * Nenhum teste da suíte chama a API real: a fronteira do modelo é substituída por
 * respostas gravadas. Isso mantém os testes determinísticos, rápidos e sem custo — e,
 * mais importante, mantém honesto o que estamos de fato testando, que é o nosso
 * tratamento da resposta, não a qualidade do modelo.
 */

/** Devolve sempre a mesma resposta, e registra o que foi pedido. */
export function recordedClient(resposta: unknown): AiClient & {
  calls: StructuredRequest<unknown>[];
} {
  const calls: StructuredRequest<unknown>[] = [];

  return {
    calls,
    async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
      calls.push(request as StructuredRequest<unknown>);

      const resultado = request.validate.safeParse(resposta);
      if (!resultado.success) {
        const campos = resultado.error.issues
          .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
          .join("; ");
        throw new AiError(
          "invalid-response",
          `A resposta do modelo não corresponde ao formato esperado. ${campos}`,
        );
      }
      return resultado.data;
    },
  };
}

/**
 * Devolve uma resposta diferente a cada chamada, e registra o que foi pedido.
 *
 * Existe para exercitar a repetição da estruturação: a primeira resposta é recusada
 * pela trava, a segunda passa. A variação do modelo acontece do outro lado da fronteira
 * e não pode ser reproduzida em teste — o que se testa aqui é o **contrato** da
 * repetição, não a probabilidade dela ser necessária.
 */
export function sequencedClient(respostas: readonly unknown[]): AiClient & {
  calls: StructuredRequest<unknown>[];
} {
  const calls: StructuredRequest<unknown>[] = [];

  return {
    calls,
    async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
      calls.push(request as StructuredRequest<unknown>);

      // Depois da última, repete a última: assim um teste de "duas recusas" não precisa
      // declarar a mesma resposta ruim duas vezes.
      const resposta = respostas[Math.min(calls.length - 1, respostas.length - 1)];
      const resultado = request.validate.safeParse(resposta);
      if (!resultado.success) {
        throw new AiError(
          "invalid-response",
          `Resposta ${calls.length} não corresponde ao esquema esperado.`,
        );
      }
      return resultado.data as T;
    },
  };
}

/** Falha como a API falharia, para exercitar o tratamento de erro. */
export function failingClient(
  reason: "call-failed" | "missing-credentials" | "quota-exceeded",
): AiClient {
  return {
    async generateStructured() {
      throw new AiError(reason, MENSAGEM_DA_FALHA[reason]);
    },
  };
}

/**
 * Um provedor de mentira, para exercitar a cadeia de fallback sem rede.
 *
 * `resultado` diz o que ele faz quando chamado: devolver texto, ou falhar com um tipo
 * de falha. `isConfigured` falso simula provedor sem chave — que a cadeia pula em vez
 * de tentar.
 */
export function fakeProvider(
  name: string,
  resultado: { text: string } | { falha: ProviderFailureKind; message?: string },
  opcoes: { configurado?: boolean } = {},
): AiProvider & { calls: ChatMessage[][] } {
  const calls: ChatMessage[][] = [];

  return {
    name,
    calls,
    isConfigured: () => opcoes.configurado ?? true,
    async generate(messages) {
      calls.push(messages);
      if ("falha" in resultado) {
        throw new ProviderError(
          name,
          resultado.falha,
          resultado.message ?? `${name} falhou (${resultado.falha}).`,
        );
      }
      return { text: resultado.text, provider: name, model: `${name}-model` };
    },
  };
}

/** Explode se for chamado — para provar que um caminho de erro não chega à IA. */
export function neverCalledClient(): AiClient {
  return {
    async generateStructured() {
      throw new Error("A IA não deveria ter sido chamada neste caminho.");
    },
  };
}
