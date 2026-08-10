import { NextResponse } from "next/server";
import { signToken, stripeClient } from "@/lib/payments";

/**
 * Onde o navegador chega depois do Checkout (via `success_url`).
 *
 * Confirma o pagamento consultando a Checkout Session direto na API do Stripe — mesma
 * fronteira de confiança de um webhook (chave do servidor), só que síncrona e alcançável
 * por um redirecionamento de navegador, que um webhook não é. O nonce do token é o próprio
 * id da Checkout Session: confirmar a mesma sessão duas vezes reemite o mesmo token, em
 * vez de fabricar um novo a cada retorno.
 */

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const destino = new URL("/app", url.origin);

  if (!sessionId) {
    destino.searchParams.set("payment_error", "1");
    return NextResponse.redirect(destino);
  }

  try {
    const stripe = await stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      destino.searchParams.set("payment_error", "1");
      return NextResponse.redirect(destino);
    }

    const token = signToken(sessionId);
    destino.searchParams.set("paid_session", token);
    return NextResponse.redirect(destino);
  } catch (error) {
    console.error("payments/confirm: falha ao confirmar sessão", {
      name: (error as Error).name,
    });
    destino.searchParams.set("payment_error", "1");
    return NextResponse.redirect(destino);
  }
}
