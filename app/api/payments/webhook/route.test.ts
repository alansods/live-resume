import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as payments from "@/lib/payments";
import { POST } from "./route";

describe("POST /api/payments/webhook", () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_teste";
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = original;
    vi.restoreAllMocks();
  });

  test("assinatura válida é aceita", async () => {
    const stripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "checkout.session.completed",
          data: { object: { id: "cs_test_1", payment_status: "paid" } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof payments.stripeClient>>;
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    const resposta = await POST(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "stripe-signature": "assinatura-valida" },
        body: "{}",
      }),
    );

    expect(resposta.status).toBe(200);
  });

  test("Nenhum dado de pagador em log do produto", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const stripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_2",
              payment_status: "paid",
              customer_details: { email: "pagador@example.com", name: "Fulano" },
            },
          },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof payments.stripeClient>>;
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    await POST(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "stripe-signature": "assinatura-valida" },
        body: "{}",
      }),
    );

    const registrado = JSON.stringify(info.mock.calls);
    expect(registrado).not.toContain("pagador@example.com");
    expect(registrado).not.toContain("Fulano");
    info.mockRestore();
  });

  test("assinatura ausente é recusada", async () => {
    const resposta = await POST(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(resposta.status).toBe(400);
  });

  test("Webhook com assinatura inválida é recusado", async () => {
    const stripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error("assinatura inválida");
        }),
      },
    } as unknown as Awaited<ReturnType<typeof payments.stripeClient>>;
    vi.spyOn(payments, "stripeClient").mockResolvedValue(stripe);

    const resposta = await POST(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "stripe-signature": "assinatura-invalida" },
        body: "{}",
      }),
    );

    expect(resposta.status).toBe(400);
  });

  test("sem STRIPE_WEBHOOK_SECRET, responde 500", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const resposta = await POST(
      new Request("http://localhost/api/payments/webhook", {
        method: "POST",
        headers: { "stripe-signature": "qualquer" },
        body: "{}",
      }),
    );

    expect(resposta.status).toBe(500);
  });
});
