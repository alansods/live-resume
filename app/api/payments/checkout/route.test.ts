import { afterEach, describe, expect, test, vi } from "vitest";
import * as payments from "@/lib/payments";
import { POST } from "./route";

function fakeStripe(url: string | null) {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url }),
      },
    },
  } as unknown as Awaited<ReturnType<typeof payments.stripeClient>>;
}

describe("POST /api/payments/checkout", () => {
  afterEach(() => vi.restoreAllMocks());

  test("Sessão em reais para interface em português", async () => {
    const stripe = fakeStripe("https://checkout.stripe.com/session-1");
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    const resposta = await POST(
      new Request("http://localhost/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "pt" }),
      }),
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.url).toBe("https://checkout.stripe.com/session-1");

    const chamada = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(chamada.line_items[0].price_data.currency).toBe("brl");
    expect(chamada.line_items[0].price_data.unit_amount).toBe(200);
    expect(chamada.mode).toBe("payment");
  });

  test("Sessão em dólares para interface em inglês", async () => {
    const stripe = fakeStripe("https://checkout.stripe.com/session-2");
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    await POST(
      new Request("http://localhost/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      }),
    );

    const chamada = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(chamada.line_items[0].price_data.currency).toBe("usd");
    expect(chamada.line_items[0].price_data.unit_amount).toBe(40);
  });

  test("sem locale no corpo, usa o padrão em inglês", async () => {
    const stripe = fakeStripe("https://checkout.stripe.com/session-3");
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    await POST(new Request("http://localhost/api/payments/checkout", { method: "POST" }));

    const chamada = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(chamada.line_items[0].price_data.currency).toBe("usd");
  });

  test("Pagamento é único, não recorrente", async () => {
    const stripe = fakeStripe("https://checkout.stripe.com/session-4");
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    await POST(
      new Request("http://localhost/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "pt" }),
      }),
    );

    const chamada = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(chamada.mode).toBe("payment");
    expect(chamada).not.toHaveProperty("subscription_data");
  });

  test("falha ao criar sessão responde 502", async () => {
    const stripe = {
      checkout: { sessions: { create: vi.fn().mockRejectedValue(new Error("boom")) } },
    } as unknown as Awaited<ReturnType<typeof payments.stripeClient>>;
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    const resposta = await POST(
      new Request("http://localhost/api/payments/checkout", { method: "POST" }),
    );

    expect(resposta.status).toBe(502);
  });
});
