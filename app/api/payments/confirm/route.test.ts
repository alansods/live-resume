import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as payments from "@/lib/payments";
import { GET } from "./route";

function fakeStripe(paymentStatus: string) {
  return {
    checkout: {
      sessions: {
        retrieve: vi
          .fn()
          .mockResolvedValue({ id: "cs_test_1", payment_status: paymentStatus }),
      },
    },
  } as unknown as Awaited<ReturnType<typeof payments.stripeClient>>;
}

describe("GET /api/payments/confirm", () => {
  const original = process.env.PAYMENT_TOKEN_SECRET;

  beforeEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = "segredo-de-teste";
  });

  afterEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = original;
    vi.restoreAllMocks();
  });

  test("Retorno com pagamento confirmado emite token válido", async () => {
    vi.spyOn(payments, "stripeClient").mockResolvedValue(fakeStripe("paid"));

    const resposta = await GET(
      new Request("http://localhost/api/payments/confirm?session_id=cs_test_1"),
    );

    expect(resposta.status).toBe(307);
    const local = new URL(resposta.headers.get("location")!);
    expect(local.pathname).toBe("/app");
    expect(local.searchParams.get("paid_session")).not.toBeNull();
  });

  test("Retorno com pagamento não confirmado não emite token", async () => {
    vi.spyOn(payments, "stripeClient").mockResolvedValue(fakeStripe("unpaid"));

    const resposta = await GET(
      new Request("http://localhost/api/payments/confirm?session_id=cs_test_1"),
    );

    const local = new URL(resposta.headers.get("location")!);
    expect(local.searchParams.get("paid_session")).toBeNull();
    expect(local.searchParams.get("payment_error")).toBe("1");
  });

  test("sem session_id redireciona com erro", async () => {
    const resposta = await GET(new Request("http://localhost/api/payments/confirm"));
    const local = new URL(resposta.headers.get("location")!);
    expect(local.searchParams.get("payment_error")).toBe("1");
  });

  test("confirmar a mesma sessão duas vezes emite tokens com o mesmo nonce", async () => {
    vi.spyOn(payments, "stripeClient").mockResolvedValue(fakeStripe("paid"));

    const r1 = await GET(
      new Request("http://localhost/api/payments/confirm?session_id=cs_test_1"),
    );
    const r2 = await GET(
      new Request("http://localhost/api/payments/confirm?session_id=cs_test_1"),
    );

    const t1 = new URL(r1.headers.get("location")!).searchParams.get("paid_session")!;
    const t2 = new URL(r2.headers.get("location")!).searchParams.get("paid_session")!;
    expect(payments.verifyToken(t1)?.nonce).toBe("cs_test_1");
    expect(payments.verifyToken(t2)?.nonce).toBe("cs_test_1");
  });
});
