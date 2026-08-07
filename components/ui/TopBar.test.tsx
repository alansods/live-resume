// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AppShell } from "@/components/shell/AppShell";
import { Home } from "@/components/home/Home";
import { LocaleProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionary";

afterEach(cleanup);

/**
 * A top bar é uma só. O que estes testes protegem não é a aparência dela — é que as
 * duas telas usem a mesma, que é o que impede a divergência de voltar.
 */

function montar(tela: "home" | "app", locale: Locale = "pt") {
  // O shell é o único que busca; sem currículo importado ele não chama nada, mas o
  // `fetch` precisa existir.
  vi.stubGlobal("fetch", vi.fn());

  return render(
    <LocaleProvider initialLocale={locale}>
      {tela === "home" ? <Home /> : <AppShell />}
    </LocaleProvider>,
  );
}

const barra = (container: HTMLElement) => container.querySelector("header")!;

/**
 * Ficar no topo durante a rolagem é CSS, e o jsdom não aplica folha de estilo — então o
 * que se verifica é a folha, como já se faz com a régua da home.
 */
function declaracao(arquivo: string, seletor: string, propriedade: string): string {
  const css = readFileSync(join(__dirname, arquivo), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const bloco = css
    .split("}")
    .find((trecho) => trecho.split("{")[0].trim().endsWith(seletor));
  const valor = bloco?.match(new RegExp(`${propriedade}\\s*:\\s*([^;]+);`));
  expect(valor, `${arquivo}: ${seletor} { ${propriedade} }`).toBeTruthy();
  return valor![1].trim();
}

describe("A top bar acompanha a rolagem", () => {
  test("A top bar continua visível ao rolar", () => {
    expect(declaracao("TopBar.module.css", ".topBar", "position")).toBe("sticky");
    expect(declaracao("TopBar.module.css", ".topBar", "top")).toBe("0");
  });

  test("A top bar não cobre o começo do conteúdo", () => {
    // `sticky` reserva a própria altura no fluxo; `fixed` ou `absolute` a tirariam dele,
    // e cada tela precisaria repetir um recuo compensatório no topo.
    expect(declaracao("TopBar.module.css", ".topBar", "position")).not.toBe("fixed");
    expect(declaracao("TopBar.module.css", ".topBar", "position")).not.toBe("absolute");
  });

  test("O modal fica acima da top bar", () => {
    const daBarra = Number(declaracao("TopBar.module.css", ".topBar", "z-index"));
    const doModal = Number(declaracao("primitives.module.css", ".backdrop", "z-index"));

    expect(doModal).toBeGreaterThan(daBarra);
  });

  test("A top bar da home acompanha a rolagem", () => {
    // A home usa a mesma barra: o que garante o comportamento lá é a igualdade, não uma
    // segunda folha de estilo.
    const naHome = barra(montar("home").container);
    cleanup();
    const noApp = barra(montar("app").container);

    expect(naHome.className).toBe(noApp.className);
    expect(declaracao("TopBar.module.css", ".topBar", "position")).toBe("sticky");
  });
});

describe("Uma única top bar no produto", () => {
  test("As duas telas usam a mesma top bar", () => {
    const naHome = barra(montar("home").container);
    cleanup();
    const noApp = barra(montar("app").container);

    // Mesma classe de módulo CSS: é literalmente o mesmo arquivo de estilo.
    expect(noApp.className).toBe(naHome.className);

    const toggleDaHome = within(naHome).getByRole("group");
    const toggleDoApp = within(noApp).getByRole("group");
    expect(toggleDoApp.className).toBe(toggleDaHome.className);
    expect(toggleDoApp.innerHTML).toBe(toggleDaHome.innerHTML);
  });
});

describe("Caminho de volta à home na top bar", () => {
  test("A top bar leva de volta à home", () => {
    const { container } = montar("app");

    const volta = within(barra(container)).getByRole("link");
    expect(volta.getAttribute("href")).toBe("/");
  });

  test("O caminho de volta é distinguível do voltar de etapa", () => {
    montar("app");

    const volta = screen.getByRole("link", { name: "Voltar para a home" });
    const voltarEtapa = screen.getByRole("button", { name: "Voltar" });

    // Mesma palavra na tela, rótulos acessíveis diferentes — destinos diferentes.
    expect(volta.textContent).toContain("Voltar");
    expect(voltarEtapa.textContent).toContain("Voltar");
    expect(screen.queryAllByRole("link", { name: "Voltar" })).toEqual([]);
  });

  test("Voltar à home não muda a etapa", () => {
    montar("app");

    // É um link para a raiz, não um controle de navegação de etapa.
    const volta = screen.getByRole("link", { name: "Voltar para a home" });
    expect(volta.tagName).toBe("A");
    expect(screen.getByRole("button", { name: /1\. Importar/ }).ariaCurrent).toBe("step");
  });

  test("O rótulo acessível do caminho de volta muda com o idioma", () => {
    montar("app", "en");

    expect(screen.getByRole("link", { name: "Back to home" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Voltar para a home" })).toBeNull();
  });
});

describe("Top bar compartilhada com o aplicativo", () => {
  test("A home usa a top bar do produto", () => {
    const { container } = montar("home");

    const cabecalho = within(barra(container));
    expect(cabecalho.getByText("Currículo Vivo")).toBeTruthy();
    expect(cabecalho.getByRole("button", { name: "PT-BR" })).toBeTruthy();
    expect(cabecalho.getByRole("button", { name: "EN" })).toBeTruthy();
  });

  test("A home não oferece caminho de volta para si mesma", () => {
    const { container } = montar("home");

    expect(within(barra(container)).queryByRole("link")).toBeNull();
  });
});
