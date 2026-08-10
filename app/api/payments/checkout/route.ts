import { NextResponse } from "next/server";
import { priceForLocale, stripeClient } from "@/lib/payments";

/**
 * Cria a Checkout Session (pagamento único, hospedada pelo Stripe).
 *
 * Preço pelo idioma da interface, não por geolocalização — o corpo manda o `locale` que
 * o toggle da top bar já guarda no cliente. `origin` vem do próprio pedido, para o
 * `success_url`/`cancel_url` apontarem de volta para a etapa 01 do mesmo host que chamou.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  let locale = "en";
  try {
    const corpo = await request.json();
    if (corpo?.locale === "pt") locale = "pt";
  } catch {
    // Corpo ausente ou ilegível: segue com o padrão em inglês.
  }

  const origem = new URL(request.url).origin;
  const price = priceForLocale(locale);

  try {
    const stripe = await stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: price.currency,
            unit_amount: price.amount,
            product_data: { name: "Currículo Vivo — importação" },
          },
        },
      ],
      success_url: `${origem}/api/payments/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origem}/app?payment_canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json(
        {
          error: {
            code: "checkout-session-failed",
            message: "Não foi possível criar a sessão de pagamento.",
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("payments/checkout: falha ao criar sessão", {
      name: (error as Error).name,
    });
    return NextResponse.json(
      {
        error: {
          code: "checkout-session-failed",
          message: "Não foi possível criar a sessão de pagamento.",
        },
      },
      { status: 502 },
    );
  }
}
