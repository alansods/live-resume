import { describe, expect, test } from "vitest";
import { classifyFailure, isTemporary } from "./errors";

/**
 * A classificação é o que decide se a cadeia continua. Errar para "temporário" custa
 * uma tentativa; errar para "definitivo" derruba o pedido — então os dois lados da
 * fronteira são testados aqui, um a um.
 */

function erroComStatus(status: number, message = "erro") {
  return Object.assign(new Error(message), { status });
}

describe("Falhas que fazem a cadeia continuar", () => {
  test("429 é cota", () => {
    expect(classifyFailure(erroComStatus(429)).kind).toBe("quota");
  });

  test("erros 5xx são indisponibilidade", () => {
    for (const status of [500, 502, 503, 529]) {
      expect(classifyFailure(erroComStatus(status)).kind).toBe("unavailable");
    }
  });

  test("timeout de requisição (408) é indisponibilidade", () => {
    expect(classifyFailure(erroComStatus(408)).kind).toBe("unavailable");
  });

  test("códigos de rede são indisponibilidade", () => {
    for (const code of ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"]) {
      const erro = Object.assign(new Error("socket"), { code });
      expect(classifyFailure(erro).kind).toBe("unavailable");
    }
  });

  test("sem status, a mensagem denuncia limite de uso", () => {
    expect(classifyFailure(new Error("Rate limit reached for model")).kind).toBe("quota");
    expect(classifyFailure(new Error("You exceeded your current quota")).kind).toBe(
      "quota",
    );
    expect(classifyFailure(new Error("Too Many Requests")).kind).toBe("quota");
  });

  test("sem status, a mensagem denuncia indisponibilidade", () => {
    expect(classifyFailure(new Error("Service Unavailable")).kind).toBe("unavailable");
    expect(classifyFailure(new Error("The model is overloaded")).kind).toBe(
      "unavailable",
    );
  });

  test("erro que não soubemos ler tenta o próximo provedor", () => {
    expect(classifyFailure(new Error("algo estranho")).kind).toBe("unavailable");
    expect(classifyFailure(null).kind).toBe("unavailable");
    expect(classifyFailure("string solta").kind).toBe("unavailable");
  });

  test("cota e indisponibilidade são as únicas temporárias", () => {
    expect(isTemporary("quota")).toBe(true);
    expect(isTemporary("unavailable")).toBe(true);
    expect(isTemporary("invalid-request")).toBe(false);
    expect(isTemporary("unauthorized")).toBe(false);
    expect(isTemporary("invalid-response")).toBe(false);
  });
});

describe("Falhas que interrompem a cadeia", () => {
  test("400 é pedido inválido — nosso defeito, não do provedor", () => {
    const { kind } = classifyFailure(erroComStatus(400, "invalid schema"));
    expect(kind).toBe("invalid-request");
    expect(isTemporary(kind)).toBe(false);
  });

  test("404 (modelo inexistente) é pedido inválido", () => {
    expect(classifyFailure(erroComStatus(404)).kind).toBe("invalid-request");
  });

  test("401 e 403 são credencial, não indisponibilidade", () => {
    expect(classifyFailure(erroComStatus(401)).kind).toBe("unauthorized");
    expect(classifyFailure(erroComStatus(403)).kind).toBe("unauthorized");
  });

  test("o status vence a mensagem: 400 falando em limite não vira cota", () => {
    expect(classifyFailure(erroComStatus(400, "rate limit")).kind).toBe(
      "invalid-request",
    );
  });
});

describe("De onde o status é lido", () => {
  test("aceita status, statusCode e response.status", () => {
    expect(classifyFailure({ status: 429 }).status).toBe(429);
    expect(classifyFailure({ statusCode: 503 }).kind).toBe("unavailable");
    expect(classifyFailure({ response: { status: 429 } }).kind).toBe("quota");
  });
});
