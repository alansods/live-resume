import { TOKEN_VALIDADE_MS } from "./token";

/**
 * Controle de uso único do token de sessão paga.
 *
 * Em memória do processo, de propósito — o projeto não tem banco de dados, e o gasto
 * exposto por um double-spend nesta janela é o preço de uma chamada de IA (R$2), menor
 * do que o custo de acrescentar infraestrutura persistente para uma trava desse porte.
 * Documentado em `design.md` (Risks / Trade-offs) da change `payments-checkout`.
 */

type Registro = { expiraEm: number };

const consumidos = new Map<string, Registro>();

function limpar(agora: number): void {
  for (const [nonce, registro] of consumidos) {
    if (registro.expiraEm <= agora) consumidos.delete(nonce);
  }
}

export function isConsumed(nonce: string, now = Date.now()): boolean {
  limpar(now);
  const registro = consumidos.get(nonce);
  return registro !== undefined && registro.expiraEm > now;
}

export function markConsumed(nonce: string, now = Date.now()): void {
  limpar(now);
  consumidos.set(nonce, { expiraEm: now + TOKEN_VALIDADE_MS });
}

/** Só para teste: esvazia o registro entre casos. */
export function resetConsumedNonces(): void {
  consumidos.clear();
}
