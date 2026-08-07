import { AiError, MENSAGEM_DA_FALHA, type AiFailureReason } from "./errors";
import { ProviderError, classifyFailure, isTemporary } from "./providers/errors";
import { aiLog } from "./providers/log";
import { createProviderChain } from "./providers/registry";
import type {
  AiProvider,
  AiResponse,
  ChatMessage,
  GenerationOptions,
} from "./providers/types";

/**
 * A porta única para o modelo.
 *
 * Percorre a cadeia de provedores até um responder. O que sai daqui é uma resposta ou
 * um `AiError` do vocabulário do projeto — nunca o erro de um provedor, nunca o nome de
 * quem falhou. Quem chama não sabe, e não precisa saber, qual IA atendeu.
 */

type Tentativa = { provider: string; kind: string };

const MOTIVO_POR_FALHA: Record<string, AiFailureReason> = {
  quota: "quota-exceeded",
  unavailable: "call-failed",
  unauthorized: "missing-credentials",
  "invalid-request": "call-failed",
  "invalid-response": "invalid-response",
};

/**
 * O motivo público quando **todos** falharam.
 *
 * Cota estourada é a única falha que muda o conselho na tela: rede que caiu se resolve
 * tentando de novo; limite diário, não. Se ela apareceu em qualquer ponto da cadeia,
 * é ela que a pessoa precisa ouvir — as outras viram "indisponível".
 */
function motivoFinal(tentativas: Tentativa[]): AiFailureReason {
  if (tentativas.length === 0) return "missing-credentials";
  if (tentativas.every((t) => t.kind === "sem-chave")) return "missing-credentials";
  if (tentativas.some((t) => t.kind === "quota")) return "quota-exceeded";
  return "call-failed";
}

export type AiService = {
  generate(messages: ChatMessage[], options?: GenerationOptions): Promise<AiResponse>;
};

/**
 * Constrói o serviço sobre uma cadeia de provedores.
 *
 * A cadeia é injetável — é assim que os testes exercitam o fallback sem rede, e é
 * assim que se troca a ordem sem tocar em nada que chame `generate`.
 */
export function createAiService(
  providers: AiProvider[] = createProviderChain(),
): AiService {
  return {
    async generate(messages, options = {}) {
      const tentativas: Tentativa[] = [];

      for (const [indice, provider] of providers.entries()) {
        if (!provider.isConfigured()) {
          aiLog.ignorado(provider.name);
          tentativas.push({ provider: provider.name, kind: "sem-chave" });
          continue;
        }

        try {
          const resposta = await provider.generate(messages, options);
          aiLog.sucesso(resposta.provider, resposta.model);
          return resposta;
        } catch (error) {
          const { kind, status } =
            error instanceof ProviderError
              ? { kind: error.kind, status: error.detail?.status }
              : classifyFailure(error);

          // O detalhe bruto fica aqui, onde a falha aconteceu, e só aqui. Não há
          // conteúdo de currículo nele: é a resposta de erro do serviço.
          console.warn("ai: provedor falhou", {
            provider: provider.name,
            kind,
            status,
            detail: (error as Error | null)?.message,
          });

          if (!isTemporary(kind)) {
            // Falha definitiva interrompe a cadeia. Pedido malformado, schema inválido
            // ou chave recusada não melhoram no próximo provedor: insistir só gastaria
            // a cota de todos e esconderia o defeito atrás de uma mensagem genérica.
            aiLog.interrompido(provider.name, kind, (error as Error | null)?.message);
            const motivo = MOTIVO_POR_FALHA[kind] ?? "call-failed";
            throw new AiError(motivo, MENSAGEM_DA_FALHA[motivo], error);
          }

          tentativas.push({ provider: provider.name, kind });
          const proximo = providers[indice + 1];
          if (proximo) aiLog.tentandoProximo(provider.name, kind, proximo.name);
        }
      }

      aiLog.esgotado(tentativas.map((t) => `${t.provider} (${t.kind})`));
      const motivo = motivoFinal(tentativas);
      throw new AiError(motivo, MENSAGEM_DA_FALHA[motivo]);
    },
  };
}

/**
 * A instância que o projeto usa.
 *
 * A cadeia é montada a cada chamada, de propósito: as variáveis de ambiente são lidas
 * na hora, então mudar chave ou ordem vale na requisição seguinte, sem reiniciar nada —
 * e o custo de montar a lista é desprezível perto de uma ida ao modelo.
 */
export const aiService: AiService = {
  generate: (messages, options) => createAiService().generate(messages, options),
};
