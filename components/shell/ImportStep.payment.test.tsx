// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/context";
import { ImportStep } from "./ImportStep";

afterEach(cleanup);

function montar() {
  return render(
    <LocaleProvider initialLocale="pt">
      <ImportStep fileName={null} onImported={() => {}} onClear={() => {}} />
    </LocaleProvider>,
  );
}

describe("Gate de pagamento na etapa 01", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ url: "https://checkout.stripe.com/session-teste" }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("Sem pagamento, a dropzone não aceita arquivo", () => {
    montar();
    expect(screen.queryByLabelText("Selecionar arquivo")).toBeNull();
  });

  test("Chamada de pagamento aparece antes da dropzone", () => {
    montar();
    expect(screen.getByRole("button", { name: "Liberar o envio" })).toBeTruthy();
    expect(screen.queryByLabelText("Selecionar arquivo")).toBeNull();
  });

  test("Retorno do Checkout libera a dropzone", () => {
    window.history.pushState({}, "", "/?paid_session=token-de-teste");
    montar();
    expect(screen.getByLabelText("Selecionar arquivo")).toBeTruthy();
  });

  test("Checkout cancelado mantém a etapa 01 sem dropzone liberada", () => {
    window.history.pushState({}, "", "/?payment_canceled=1");
    montar();
    expect(screen.queryByLabelText("Selecionar arquivo")).toBeNull();
    expect(screen.getByRole("button", { name: "Liberar o envio" })).toBeTruthy();
  });

  test("Recarregar a página perde o token", () => {
    window.history.pushState({}, "", "/?paid_session=token-de-teste");
    const primeira = montar();
    expect(screen.getByLabelText("Selecionar arquivo")).toBeTruthy();

    // O efeito de montagem já removeu `paid_session` da URL (`history.replaceState`) —
    // uma nova montagem no mesmo lugar de "recarregar a página" não encontra token.
    primeira.unmount();
    montar();
    expect(screen.queryByLabelText("Selecionar arquivo")).toBeNull();
    expect(screen.getByRole("button", { name: "Liberar o envio" })).toBeTruthy();
  });

  test("O token não aparece em armazenamento do navegador", () => {
    window.history.pushState({}, "", "/?paid_session=token-de-teste");
    montar();
    expect(screen.getByLabelText("Selecionar arquivo")).toBeTruthy();

    for (let i = 0; i < localStorage.length; i += 1) {
      const chave = localStorage.key(i)!;
      expect(localStorage.getItem(chave)).not.toContain("token-de-teste");
    }
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const chave = sessionStorage.key(i)!;
      expect(sessionStorage.getItem(chave)).not.toContain("token-de-teste");
    }
    expect(document.cookie).not.toContain("token-de-teste");
  });

  test("Nenhuma ação de reembolso na interface", () => {
    montar();
    expect(screen.queryByText(/reembolso/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /reembolso|refund/i })).toBeNull();
  });

  test("Pagamento confirmado mostra toast de sucesso", () => {
    window.history.pushState({}, "", "/?paid_session=token-de-teste");
    montar();
    expect(screen.getByRole("status").textContent).toMatch(/pagamento confirmado/i);
  });

  test("Pagamento cancelado mostra toast de atenção", () => {
    window.history.pushState({}, "", "/?payment_canceled=1");
    montar();
    expect(screen.getByRole("status").textContent).toMatch(/pagamento cancelado/i);
  });

  test("Falha ao confirmar pagamento mostra toast de falha", () => {
    window.history.pushState({}, "", "/?payment_error=1");
    montar();
    expect(screen.getByRole("status").textContent).toMatch(
      /não foi possível confirmar o pagamento/i,
    );
  });

  test("Falha ao iniciar o pagamento mostra toast de falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Liberar o envio" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(
        /não foi possível iniciar o pagamento/i,
      ),
    );
    expect(screen.getByRole("button", { name: "Liberar o envio" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
