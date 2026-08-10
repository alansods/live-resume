import type Stripe from "stripe";

/**
 * O único lugar do projeto que importa o SDK do Stripe.
 *
 * Mirror do isolamento de `lib/ai/providers`: nada fora daqui sabe que existe um SDK,
 * só a superfície de `lib/payments/index.ts`. Importação dinâmica para o SDK não entrar
 * no bundle do cliente, mesmo que algum dia um arquivo cliente importe `lib/payments`
 * por engano.
 */

let cliente: Stripe | null = null;

export async function stripeClient(): Promise<Stripe> {
  if (cliente) return cliente;

  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) {
    throw new Error("STRIPE_SECRET_KEY não está configurado.");
  }

  const { default: StripeSdk } = await import("stripe");
  cliente = new StripeSdk(chave);
  return cliente;
}

/** Só para teste: força uma nova instância na próxima chamada. */
export function resetStripeClient(): void {
  cliente = null;
}
