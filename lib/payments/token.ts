import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * O token de sessão paga: prova que um pagamento aconteceu, sem banco de dados.
 *
 * Formato: `<payload-base64url>.<assinatura-base64url>`. O payload traz só o instante
 * de emissão e um nonce aleatório — nada de dado de pagador. A validade inteira depende
 * da assinatura (HMAC com `PAYMENT_TOKEN_SECRET`) e do relógio: não há linha para
 * consultar, e por isso não há nada para persistir.
 *
 * Uso único é responsabilidade de quem verifica (`lib/payments/consumed-nonces.ts`),
 * não deste módulo: assinar e verificar aqui são funções puras.
 */

const VALIDADE_MS = 30 * 60 * 1000;

export type PaidSessionToken = {
  /** Instante de emissão, em milissegundos desde a época. */
  issuedAt: number;
  /** Identifica o token para o controle de uso único. */
  nonce: string;
};

function segredo(): string {
  const valor = process.env.PAYMENT_TOKEN_SECRET;
  if (!valor) {
    throw new Error("PAYMENT_TOKEN_SECRET não está configurado.");
  }
  return valor;
}

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function assinar(payload: string): string {
  return base64url(createHmac("sha256", segredo()).update(payload).digest());
}

export function signToken(nonce: string, issuedAt = Date.now()): string {
  const payload: PaidSessionToken = { issuedAt, nonce };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  return `${payloadB64}.${assinar(payloadB64)}`;
}

/**
 * Verifica assinatura e validade. Não confere uso único — isso é
 * `lib/payments/consumed-nonces.ts`, chamado depois desta função pela rota.
 */
export function verifyToken(token: string, now = Date.now()): PaidSessionToken | null {
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [payloadB64, assinatura] = partes;

  const esperada = assinar(payloadB64);
  const bufA = Buffer.from(assinatura);
  const bufB = Buffer.from(esperada);
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) return null;

  let payload: PaidSessionToken;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.issuedAt !== "number" || typeof payload.nonce !== "string")
    return null;
  if (now - payload.issuedAt > VALIDADE_MS || now < payload.issuedAt) return null;

  return payload;
}

export const TOKEN_VALIDADE_MS = VALIDADE_MS;
