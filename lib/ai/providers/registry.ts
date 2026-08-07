import { createCerebrasProvider } from "./cerebras";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import { aiLog } from "./log";
import type { AiProvider } from "./types";

/**
 * O catálogo de provedores e a ordem em que são tentados.
 *
 * É o único lugar que sabe que Groq, Cerebras e Gemini existem. Acrescentar um
 * provedor é: criar o arquivo, implementar `AiProvider`, registrar aqui. Nada mais no
 * projeto muda — nem o serviço, nem as rotas, nem `lib/`.
 *
 * Não há `if` de provedor em lugar nenhum: a cadeia é uma lista, e o serviço a percorre.
 */

type Fabrica = () => AiProvider;

export const CATALOGO: Record<string, Fabrica> = {
  gemini: createGeminiProvider,
  groq: createGroqProvider,
  cerebras: createCerebrasProvider,
};

/**
 * A ordem padrão, da esquerda para a direita.
 *
 * Gemini na frente porque é o provedor com o qual as instruções do projeto foram
 * escritas e verificadas; Groq e Cerebras entram quando ele não puder responder.
 * Mudar a prioridade é reordenar esta lista — ou definir `AI_PROVIDERS`, sem deploy.
 */
export const ORDEM_PADRAO = ["gemini", "groq", "cerebras"] as const;

/**
 * `AI_PROVIDERS=none` desliga a IA por inteiro — cadeia vazia, falha por configuração
 * ausente. Serve para subir o app sem nenhuma chave e para os testes provarem que a
 * suíte não alcança API nenhuma, sem precisar conhecer os nomes dos provedores.
 */
const NENHUM = "none";

function lerOrdem(): string[] {
  const bruto = process.env.AI_PROVIDERS;
  if (!bruto || bruto.trim().length === 0) return [...ORDEM_PADRAO];
  if (bruto.trim().toLowerCase() === NENHUM) return [];
  return bruto
    .split(",")
    .map((nome) => nome.trim().toLowerCase())
    .filter((nome) => nome.length > 0);
}

/**
 * Monta a cadeia na ordem de prioridade.
 *
 * Nome desconhecido é ignorado com aviso, e não derruba a aplicação: um erro de
 * digitação em variável de ambiente não deve tirar o produto do ar — mas também não
 * pode sumir calado, senão a cadeia encolhe sem ninguém notar.
 */
export function createProviderChain(ordem: readonly string[] = lerOrdem()): AiProvider[] {
  const cadeia: AiProvider[] = [];
  for (const nome of ordem) {
    const fabrica = CATALOGO[nome];
    if (!fabrica) {
      aiLog.aviso(
        `provedor desconhecido em AI_PROVIDERS: "${nome}" (conhecidos: ${Object.keys(CATALOGO).join(", ")})`,
      );
      continue;
    }
    cadeia.push(fabrica());
  }
  return cadeia;
}
