import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { signToken, verifyToken } from "./token";

describe("Token de sessão paga", () => {
  const original = process.env.PAYMENT_TOKEN_SECRET;

  beforeEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = "segredo-de-teste";
  });

  afterEach(() => {
    process.env.PAYMENT_TOKEN_SECRET = original;
  });

  test("token recém-emitido é válido", () => {
    const token = signToken("nonce-1");
    const decodificado = verifyToken(token);
    expect(decodificado).not.toBeNull();
    expect(decodificado?.nonce).toBe("nonce-1");
  });

  test("Token expirado é recusado", () => {
    const emitidoHaMuitoTempo = Date.now() - 31 * 60 * 1000;
    const token = signToken("nonce-2", emitidoHaMuitoTempo);
    expect(verifyToken(token)).toBeNull();
  });

  test("token dentro da validade é aceito", () => {
    const emitidoHaPouco = Date.now() - 29 * 60 * 1000;
    const token = signToken("nonce-3", emitidoHaPouco);
    expect(verifyToken(token)).not.toBeNull();
  });

  test("token adulterado é recusado", () => {
    const token = signToken("nonce-4");
    const [payload] = token.split(".");
    const adulterado = `${payload}.assinatura-invalida`;
    expect(verifyToken(adulterado)).toBeNull();
  });

  test("token assinado com outro segredo é recusado", () => {
    const token = signToken("nonce-5");
    process.env.PAYMENT_TOKEN_SECRET = "outro-segredo";
    expect(verifyToken(token)).toBeNull();
  });

  test("string que não é um token é recusada", () => {
    expect(verifyToken("qualquer-coisa")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});
