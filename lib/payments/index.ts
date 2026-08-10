/**
 * A superfície pública de `lib/payments/`.
 *
 * Fora daqui, nenhum arquivo do projeto importa o SDK do Stripe nem sabe o formato do
 * token de sessão paga — só que ele existe, que expira e que autoriza uma importação.
 */

export {
  signToken,
  verifyToken,
  TOKEN_VALIDADE_MS,
  type PaidSessionToken,
} from "./token";
export { isConsumed, markConsumed, resetConsumedNonces } from "./consumed-nonces";
export { priceForLocale, type Price, type PriceLocale } from "./pricing";
export { stripeClient, resetStripeClient } from "./stripe-client";
