import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/payments";

/**
 * Registro assinado dos eventos de pagamento — não é quem entrega o token ao navegador
 * (isso é `app/api/payments/confirm`). Existe para reconciliação do lado do servidor: um
 * evento aqui prova que o Stripe reconhece o pagamento, independente do que o navegador
 * do cliente fez ou deixou de fazer.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("payments/webhook: STRIPE_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "not-configured" }, { status: 500 });
  }

  const assinatura = request.headers.get("stripe-signature");
  const corpo = await request.text();

  if (!assinatura) {
    return NextResponse.json({ error: "missing-signature" }, { status: 400 });
  }

  try {
    const stripe = await stripeClient();
    const evento = stripe.webhooks.constructEvent(corpo, assinatura, segredo);

    if (evento.type === "checkout.session.completed") {
      const session = evento.data.object as { id: string; payment_status: string };
      console.info("payments/webhook: pagamento confirmado", {
        sessionId: session.id,
        status: session.payment_status,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.warn("payments/webhook: assinatura inválida", {
      name: (error as Error).name,
    });
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }
}
