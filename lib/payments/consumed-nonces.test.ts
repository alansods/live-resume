import { afterEach, describe, expect, test } from "vitest";
import { isConsumed, markConsumed, resetConsumedNonces } from "./consumed-nonces";

describe("Controle de uso único", () => {
  afterEach(() => resetConsumedNonces());

  test("nonce novo não está consumido", () => {
    expect(isConsumed("a")).toBe(false);
  });

  test("nonce marcado passa a estar consumido", () => {
    markConsumed("b");
    expect(isConsumed("b")).toBe(true);
  });

  test("nonce consumido expira depois da janela do token", () => {
    const agora = Date.now();
    markConsumed("c", agora);
    expect(isConsumed("c", agora + 31 * 60 * 1000)).toBe(false);
  });
});
