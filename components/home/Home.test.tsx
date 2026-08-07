// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { LocaleProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionary";
import { Home } from "./Home";

afterEach(cleanup);

const montar = (locale: Locale = "pt") =>
  render(
    <LocaleProvider initialLocale={locale}>
      <Home />
    </LocaleProvider>,
  );

describe("A raiz apresenta o produto", () => {
  test("A raiz mostra a manchete e a explicação", () => {
    montar();

    expect(screen.getByRole("heading", { name: /Melhore seu currículo/ })).toBeTruthy();
    expect(screen.getByText(/Suba o \.docx antigo/)).toBeTruthy();
  });

  test("A raiz não é uma página em branco", () => {
    const { container } = montar();

    expect((container.textContent ?? "").trim().length).toBeGreaterThan(200);
  });
});

describe("Caminho para o fluxo", () => {
  test("A chamada leva ao fluxo", () => {
    montar();

    const cta = screen.getByRole("link", { name: "Começar agora" });
    expect(cta.getAttribute("href")).toBe("/app");
  });

  test("O ícone da chamada não vira o rótulo dela", () => {
    montar();

    // O rótulo continua sendo o texto; a seta é decoração.
    const cta = screen.getByRole("link", { name: "Começar agora" });
    expect(cta.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  test("A chamada é identificável", () => {
    montar();

    // Um único link de ação na página: o CTA.
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("As quatro etapas são apresentadas", () => {
  test("Os quatro cards aparecem numerados", () => {
    montar();

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent?.slice(0, 2))).toEqual([
      "01",
      "02",
      "03",
      "04",
    ]);
  });

  test("Os cards descrevem o que cada etapa faz", () => {
    montar();

    for (const etapa of ["Importa", "Atualiza", "Revisa", "Exporta"]) {
      expect(screen.getByText(etapa), etapa).toBeTruthy();
    }
    // O texto do card 03 fala em marcar, não em aceitar: a revisão é checklist.
    expect(screen.getByText(/Você marca as que quer/)).toBeTruthy();
  });
});

describe("Caminho para o fluxo sem interceptação", () => {
  test("A chamada é um link navegável", () => {
    montar();

    // Link de verdade: clique do meio, nova aba e ausência de JavaScript continuam
    // funcionando. Um botão com navegação por código perderia os três.
    const cta = screen.getByRole("link", { name: "Começar agora" });
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe("/app");
  });

  test("Nada atrasa a navegação", () => {
    montar();
    const cta = screen.getByRole("link", { name: "Começar agora" });

    // Ninguém intercepta o clique para animar a saída antes de navegar.
    const evento = new MouseEvent("click", { bubbles: true, cancelable: true });
    cta.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(false);
  });
});

describe("A animação de entrada é desligável", () => {
  test("Menos movimento, sem transição na home", () => {
    const css = readFileSync(
      join(process.cwd(), "components", "home", "Home.module.css"),
      "utf8",
    );

    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    // A regra existe E anula a animação de entrada, não outra coisa qualquer.
    const bloco = /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/.exec(
      css,
    );
    expect(bloco).toBeTruthy();
  });
});

describe("Interface bilíngue na home", () => {
  test("A home muda de idioma", () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByRole("heading", { name: /Improve your resume/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start now" })).toBeTruthy();
    expect(screen.getByText("Import")).toBeTruthy();
  });

  test("Nenhum texto fixo em componente na home", () => {
    const dir = join(process.cwd(), "components", "home");
    const componentes = readdirSync(dir).filter(
      (nome) => nome.endsWith(".tsx") && !nome.includes(".test."),
    );
    expect(componentes.length).toBeGreaterThan(0);

    for (const arquivo of componentes) {
      const fonte = readFileSync(join(dir, arquivo), "utf8");
      const literaisEmJsx = fonte.match(/>\s*[A-Za-zÀ-ÿ]{3,}[^<>{}]*</g) ?? [];
      expect(literaisEmJsx, `${arquivo}: ${literaisEmJsx.join(" | ")}`).toEqual([]);
    }
  });
});
