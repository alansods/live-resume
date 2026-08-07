// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { dictionaries, locales } from "./dictionary";
import { LocaleProvider, useLocale } from "./context";

// Sem `globals: true`, a limpeza automática do Testing Library não roda.
afterEach(cleanup);

function Amostra() {
  const { t, locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="titulo">{t.step2.title}</span>
      <span data-testid="vazio">{t.empty.experience}</span>
      <span data-testid="idioma">{locale}</span>
      <button onClick={() => setLocale(locale === "pt" ? "en" : "pt")}>trocar</button>
    </div>
  );
}

describe("Interface bilíngue, conteúdo intocado", () => {
  test("Rótulos mudam com o idioma", async () => {
    render(
      <LocaleProvider initialLocale="pt">
        <Amostra />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("titulo").textContent).toBe("Atualizar");

    // A troca é em runtime, pelo toggle da interface — não por remontar a árvore.
    fireEvent.click(screen.getByRole("button", { name: "trocar" }));

    expect(screen.getByTestId("idioma").textContent).toBe("en");
    expect(screen.getByTestId("titulo").textContent).toBe("Update");
    expect(screen.getByTestId("vazio").textContent).toBe(
      "No new experience since the last version.",
    );
  });

  test("O idioma escolhido sobrevive a uma nova visita", () => {
    render(
      <LocaleProvider initialLocale="pt">
        <Amostra />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "trocar" }));
    cleanup();

    // Nova montagem = recarregar ou trocar de página: o padrão volta a ser "pt", e é a
    // preferência guardada que decide.
    render(
      <LocaleProvider initialLocale="pt">
        <Amostra />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("idioma").textContent).toBe("en");
    expect(screen.getByTestId("titulo").textContent).toBe("Update");
  });

  test("Preferência guardada inválida não derruba a interface", () => {
    localStorage.setItem("curriculo-vivo:locale", "klingon");

    render(
      <LocaleProvider initialLocale="pt">
        <Amostra />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("idioma").textContent).toBe("pt");
    expect(screen.getByTestId("titulo").textContent).toBe("Atualizar");
  });

  test("Armazenamento indisponível não impede o uso", () => {
    // Janela privada: ler e escrever a preferência lançam.
    const bloqueado = () => {
      throw new Error("armazenamento bloqueado");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(bloqueado);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(bloqueado);

    render(
      <LocaleProvider initialLocale="pt">
        <Amostra />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("titulo").textContent).toBe("Atualizar");

    // A escolha não pode ser guardada, mas vale enquanto a aba estiver aberta.
    fireEvent.click(screen.getByRole("button", { name: "trocar" }));
    expect(screen.getByTestId("idioma").textContent).toBe("en");
    expect(screen.getByTestId("titulo").textContent).toBe("Update");

    vi.restoreAllMocks();
  });

  test("Os dois idiomas têm exatamente as mesmas chaves", () => {
    const caminhos = (dicionario: object, prefixo = ""): string[] =>
      Object.entries(dicionario).flatMap(([chave, valor]) =>
        typeof valor === "object" && valor !== null
          ? caminhos(valor, `${prefixo}${chave}.`)
          : [`${prefixo}${chave}`],
      );

    const [primeiro, ...resto] = locales.map((locale) =>
      caminhos(dictionaries[locale]).sort(),
    );
    for (const outro of resto) {
      expect(outro).toEqual(primeiro);
    }
  });

  test("Nenhuma tradução ficou vazia", () => {
    for (const locale of locales) {
      const percorrer = (dicionario: object, prefixo = "") => {
        for (const [chave, valor] of Object.entries(dicionario)) {
          if (typeof valor === "object" && valor !== null) {
            percorrer(valor, `${prefixo}${chave}.`);
          } else {
            expect(String(valor).trim(), `${locale}: ${prefixo}${chave}`).not.toBe("");
          }
        }
      };
      percorrer(dictionaries[locale]);
    }
  });
});
