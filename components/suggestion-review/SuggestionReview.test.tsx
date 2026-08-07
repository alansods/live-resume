// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { revisaoDeExemplo } from "@/fixtures/review";
import { importedResume } from "@/fixtures/resumes";
import { LocaleProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionary";
import { asItemId } from "@/lib/resume/ids";
import { imported } from "@/lib/resume/origin";
import { parsePeriod } from "@/lib/resume/period";
import { emptyIntake } from "@/lib/update-intake/content";
import { mergeIntake } from "@/lib/update-intake/merge";
import { SuggestionReview } from "./SuggestionReview";

afterEach(cleanup);

beforeAll(() => {
  // `scrollIntoView` não existe no jsdom, e o foco do cartão o chama.
  Element.prototype.scrollIntoView = vi.fn();
});

function montar(
  props: Partial<Parameters<typeof SuggestionReview>[0]> = {},
  locale: Locale = "pt",
) {
  return render(
    <LocaleProvider initialLocale={locale}>
      <SuggestionReview
        resume={importedResume}
        suggestions={revisaoDeExemplo}
        {...props}
      />
    </LocaleProvider>,
  );
}

const papel = () => screen.getByRole("article", { name: importedResume.header.name });
const cartoes = () => screen.getAllByRole("article").slice(1);

/** A caixa de marcação do cartão de índice `i` entre os visíveis. */
const caixaDoCartao = (i: number) => within(cartoes()[i]).getByRole("checkbox");

/**
 * Currículo cujo período de formação não é data, mas o parágrafo que veio do arquivo —
 * como no currículo real que expôs o defeito.
 */
const TEXTO_DO_ARQUIVO =
  "Em andamento, previsão de conclusão: 2º semestre de 2026 - Módulos: Desenvolvimento Fullstack, DevOps, IA e Produto";

const comPeriodoEmTexto = {
  ...importedResume,
  education: [
    {
      ...importedResume.education[0],
      period: parsePeriod(TEXTO_DO_ARQUIVO, imported),
    },
    ...importedResume.education.slice(1),
  ],
};

describe("Período em texto livre não ocupa a coluna da data", () => {
  test("Período em texto livre não espreme o título", () => {
    montar({ resume: comPeriodoEmTexto, suggestions: [] });

    const texto = screen.getByText(TEXTO_DO_ARQUIVO);
    // Linha própria: não é o elemento da coluna da data ao lado do título.
    expect(texto.className).not.toContain("paperPeriod");
    expect(texto.className).toContain("paperRawPeriod");
    // E o título do item continua inteiro, fora do mesmo elemento.
    const titulo = screen.getByText(/Pós-graduação em Engenharia de Dados/);
    expect(titulo.textContent).not.toContain(TEXTO_DO_ARQUIVO);
  });

  test("Período completo continua ao lado do título", () => {
    montar({ suggestions: [] });

    const data = screen.getByText("02/2015 – 12/2019");
    expect(data.className).toContain("paperPeriod");
    expect(data.className).not.toContain("paperRawPeriod");
  });

  test("O marcador acompanha o período em texto livre", () => {
    const sugestao = {
      ...revisaoDeExemplo.find((s) => s.kind === "dates")!,
      id: "sug-periodo-em-texto",
      path: `education.${comPeriodoEmTexto.education[0].id}.period`,
    };
    const { container } = montar({
      resume: comPeriodoEmTexto,
      suggestions: [sugestao],
    });

    const linha = screen.getByText(TEXTO_DO_ARQUIVO).closest("p")!;
    const marcador = within(linha).getByRole("button", { name: /sugestão 1/ });
    fireEvent.click(marcador);

    // Clicar no marcador leva à sugestão, como em qualquer outra âncora.
    expect(container.querySelector(`#sug-${sugestao.id}`)?.className).toMatch(
      /cardFocused/,
    );
  });
});

describe("A caixa de marcar a sugestão segue o design system", () => {
  test("A caixa da sugestão não é a do navegador", () => {
    montar();

    const caixa = caixaDoCartao(0);
    // O input continua sendo o controle: clique, foco e rótulo passam por ele.
    expect(caixa.tagName).toBe("INPUT");
    expect(caixa.closest("label")).not.toBeNull();
    // E o que se vê é o quadrado do design system, irmão do input.
    const quadrado = caixa.nextElementSibling!;
    expect(quadrado.className).toContain("checkboxBox");
    expect(quadrado.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Currículo exibido como foi importado", () => {
  test("O currículo mostra o texto importado", () => {
    montar();

    const texto = papel().textContent ?? "";
    expect(texto).toContain(importedResume.summary!.text);
    expect(texto).toContain("Liderei a migração da plataforma de pagamentos.");
    expect(texto).toContain("Fintech Kobo");
  });

  test("O que o usuário digitou aparece no currículo em revisão", () => {
    // A revisão recebe o currículo EM TRABALHO: o importado mais o que o usuário
    // digitou na etapa 02. O que ele escreveu aparece exatamente como escreveu.
    const emTrabalho = mergeIntake(importedResume, {
      ...emptyIntake,
      experience: [
        {
          id: asItemId("intake-job-1"),
          company: "Cooperativa Aurora",
          role: "Gerente de Operações",
          start: "01/2025",
          end: "",
          ongoing: true,
          delivered: "Reduzi o tempo de atendimento em 30%.",
        },
      ],
    }).resume;

    montar({ resume: emTrabalho });

    const texto = papel().textContent ?? "";
    expect(texto).toContain("Cooperativa Aurora");
    expect(texto).toContain("Reduzi o tempo de atendimento em 30%.");
  });

  test("Marcar não altera o currículo exibido", () => {
    montar();
    const antes = papel().textContent;

    fireEvent.click(caixaDoCartao(0));

    expect(papel().textContent).toBe(antes);
  });

  test("Texto proposto não aparece no currículo", () => {
    montar();

    const proposto = revisaoDeExemplo[0].after;
    expect(papel().textContent).not.toContain(proposto);
    // Ele existe na tela — dentro do cartão.
    expect(screen.getByText(proposto)).toBeTruthy();
  });
});

describe("Marcadores ancorados ao trecho", () => {
  test("Cada sugestão tem marcador no seu trecho", () => {
    montar();

    const marcadores = within(papel()).getAllByRole("button", { name: /sugestão \d/ });
    expect(marcadores).toHaveLength(revisaoDeExemplo.length);
  });

  test("Número do marcador é o número do cartão", () => {
    const { container } = montar();

    // Os marcadores saem na ordem do CURRÍCULO, não na da lista de sugestões — o que
    // importa é que cada um traga o número do seu cartão.
    const numerosNoPapel = within(papel())
      .getAllByRole("button", { name: /sugestão \d/ })
      .map((botao) => Number(botao.textContent))
      .sort((a, b) => a - b);
    expect(numerosNoPapel).toEqual(revisaoDeExemplo.map((_, i) => i + 1));

    for (const sugestao of revisaoDeExemplo) {
      const cartao = container.querySelector(`#sug-${sugestao.id}`)!;
      const numeroDoCartao = cartao.querySelector("span")!.textContent;
      const marcador = within(papel()).getByRole("button", {
        name: `sugestão ${numeroDoCartao}`,
      });
      expect(marcador.textContent, sugestao.id).toBe(numeroDoCartao);
    }
  });

  test("Sugestão de seção ancora na seção", () => {
    // A sugestão de ATS do resumo é a 6ª; o marcador dela fica no parágrafo do resumo.
    montar();

    const resumo = within(papel()).getByText(importedResume.summary!.text.slice(0, 40), {
      exact: false,
    });
    expect(within(resumo).getByRole("button", { name: /sugestão 6/ })).toBeTruthy();
  });
});

describe("Marcar é a única ação sobre o currículo final", () => {
  /**
   * O rótulo da caixa diz "aceitar", e é este teste que impede que ele signifique
   * "aplicar": aceitar só inclui a sugestão no conjunto que a exportação recebe — o papel
   * do currículo continua sendo o currículo importado, e o texto proposto segue preso ao
   * cartão.
   */
  test("Aceitar uma sugestão não altera o currículo em revisão", () => {
    montar();

    const antes = papel().textContent;
    const sugestao = revisaoDeExemplo[0];

    fireEvent.click(caixaDoCartao(0));

    expect(papel().textContent).toBe(antes);
    expect(papel().textContent).not.toContain(sugestao.after);
    // E o texto proposto continua onde sempre esteve: dentro do cartão.
    expect(cartoes()[0].textContent).toContain(sugestao.after);
  });

  test("Nenhuma ação de desfazer ou editar é oferecida", () => {
    montar();

    for (const proibido of [/desfazer/i, /aplicar/i, /editar/i, /reordenar/i]) {
      expect(screen.queryAllByRole("button", { name: proibido })).toHaveLength(0);
    }
    // E nenhum campo de texto: a revisão não edita o currículo.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});

describe("Foco e navegação entre marcador e cartão", () => {
  test("O resumo do marcador traz o essencial", () => {
    montar();

    const marcador = within(papel()).getAllByRole("button", { name: /sugestão 1/ })[0];
    fireEvent.mouseEnter(marcador.parentElement!);

    const dica = screen.getByRole("tooltip");
    expect(dica.textContent).toContain(revisaoDeExemplo[0].title);
    expect(dica.textContent).toContain(revisaoDeExemplo[0].after);
    expect(dica.textContent).toContain("Métrica");
  });

  /**
   * O percurso do ponteiro até o resumo é geometria, não evento: entrar no resumo já não
   * é sair do marcador, porque o resumo é filho dele. O que fechava o resumo era o vão de
   * papel entre os dois. Por isso o teste mede o CSS — é lá que o vão existe ou não.
   */
  test("O resumo continua aberto no caminho até ele", () => {
    const css = readFileSync(join(__dirname, "Review.module.css"), "utf8");

    const px = (seletor: string, propriedade: string) => {
      const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
      const bloco = semComentarios.split("}").find((trecho) =>
        trecho
          .split("{")[0]
          .split(",")
          .some((s) => s.trim().split("\n").pop()?.trim() === seletor),
      );
      const valor = bloco?.match(new RegExp(`${propriedade}\\s*:\\s*(-?[\\d.]+)px`));
      expect(valor, `${seletor} { ${propriedade} }`).toBeTruthy();
      return Number(valor![1]);
    };

    const fimDoMarcador = px(".mark", "height");
    const inicioDoResumo = px(".tooltip", "top");
    const ponte = {
      topo: px(".tooltip::before", "top"),
      altura: px(".tooltip::before", "height"),
    };

    // A ponte começa exatamente onde o marcador acaba e vai até o resumo: sem faixa de
    // papel no meio, e sem cobrir o botão numerado (que engoliria o clique no marcador).
    expect(inicioDoResumo + ponte.topo).toBe(fimDoMarcador);
    expect(ponte.topo + ponte.altura).toBe(0);
  });

  test("O resumo fecha ao sair do marcador", () => {
    montar();

    const marcador = within(papel()).getAllByRole("button", { name: /sugestão 1/ })[0];
    fireEvent.mouseEnter(marcador.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeTruthy();

    fireEvent.mouseLeave(marcador.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  test("Acionar o marcador foca o cartão", () => {
    const { container } = montar();

    const marcador = within(papel()).getAllByRole("button", { name: /sugestão 1/ })[0];
    fireEvent.click(marcador);

    const cartao = container.querySelector(`#sug-${revisaoDeExemplo[0].id}`);
    expect(cartao?.className).toMatch(/cardFocused/);
  });
});

describe("Ignorar remove a sugestão da revisão", () => {
  test("Sugestão ignorada some da tela", () => {
    montar();
    expect(cartoes()).toHaveLength(revisaoDeExemplo.length);

    fireEvent.click(within(cartoes()[0]).getByRole("button", { name: "Ignorar" }));

    expect(cartoes()).toHaveLength(revisaoDeExemplo.length - 1);
    expect(within(papel()).getAllByRole("button", { name: /sugestão \d/ })).toHaveLength(
      revisaoDeExemplo.length - 1,
    );
  });
});

describe("Filtro por tipo e contagem de pendências", () => {
  test("Filtro sem resultado informa", () => {
    montar({ suggestions: revisaoDeExemplo.filter((s) => s.kind === "metric") });

    fireEvent.click(screen.getByRole("button", { name: "Datas" }));

    expect(screen.getByText("Nenhuma sugestão deste tipo.")).toBeTruthy();
  });
});

/*
 * "Pontuação sobe ao marcar" vive em `components/shell/AppShell.test.tsx`: a nota é
 * exibida no chip da top bar, e o painel de revisão sozinho não a desenha mais.
 */

describe("Aviso de datas organizadas na revisão", () => {
  test("Inferência exibe o aviso na tela", () => {
    montar({ requiresDateNotice: true });

    expect(screen.getByText("As datas foram organizadas")).toBeTruthy();
  });

  test("Sem inferência, sem aviso na tela", () => {
    montar({ requiresDateNotice: false });

    expect(screen.queryByText("As datas foram organizadas")).toBeNull();
  });
});

describe("Interface bilíngue, currículo intocado", () => {
  test("Rótulos da revisão mudam com o idioma", () => {
    montar({}, "en");

    expect(screen.getByText("Suggestions")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Accept all" })).toBeTruthy();
  });

  test("Conteúdo do currículo não é traduzido na revisão", () => {
    const { unmount } = montar({}, "pt");
    const emPortugues = papel().textContent;
    unmount();

    montar({}, "en");

    // Só os títulos de seção do papel mudam de idioma; o conteúdo, não.
    expect(papel().textContent).toContain(
      "Liderei a migração da plataforma de pagamentos.",
    );
    expect(emPortugues).toContain("Liderei a migração da plataforma de pagamentos.");
    expect(screen.getByText(revisaoDeExemplo[0].after)).toBeTruthy();
  });

  test("Nenhum texto fixo em componente na revisão", () => {
    const dir = join(process.cwd(), "components", "suggestion-review");
    const componentes = readdirSync(dir).filter((nome) => nome.endsWith(".tsx"));
    expect(componentes.length).toBeGreaterThan(0);

    for (const arquivo of componentes) {
      if (arquivo.endsWith(".test.tsx")) continue;
      const fonte = readFileSync(join(dir, arquivo), "utf8");

      // Texto visível vem do dicionário; JSX não pode ter frase literal.
      const literaisEmJsx = fonte.match(/>\s*[A-Za-zÀ-ÿ]{3,}[^<>{}]*</g) ?? [];
      expect(literaisEmJsx, `${arquivo}: ${literaisEmJsx.join(" | ")}`).toEqual([]);
    }
  });
});

describe("Vazio e ausência de sugestões", () => {
  test("Sem sugestões, o currículo continua visível", () => {
    montar({ suggestions: [] });

    expect(papel().textContent).toContain(importedResume.header.name);
    expect(within(papel()).queryAllByRole("button", { name: /sugestão/ })).toHaveLength(
      0,
    );
    expect(screen.getByText("Nenhuma sugestão para este currículo.")).toBeTruthy();
  });
});
