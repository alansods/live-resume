// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/context";
import { UpdateIntake } from "./UpdateIntake";

afterEach(cleanup);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

function montar(props: Parameters<typeof UpdateIntake>[0] = {}) {
  return render(
    <LocaleProvider initialLocale="pt">
      <UpdateIntake {...props} />
    </LocaleProvider>,
  );
}

/** Preenche e confirma o modal de experiência. */
function adicionarExperiencia(empresa: string, cargo = "Cargo") {
  fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));
  const modal = screen.getByRole("dialog");
  fireEvent.change(within(modal).getByLabelText("Empresa"), {
    target: { value: empresa },
  });
  fireEvent.change(within(modal).getByLabelText("Cargo"), { target: { value: cargo } });
  fireEvent.change(within(modal).getByLabelText("Início"), {
    target: { value: "03/2022" },
  });
  fireEvent.change(within(modal).getByLabelText("Fim"), {
    target: { value: "06/2024" },
  });
  fireEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));
}

describe("Seções da etapa", () => {
  test("As três seções aparecem", () => {
    montar();

    const secoes = [
      "Formação e certificações",
      "Experiências e promoções",
      "Novas habilidades",
    ];
    for (const secao of secoes) {
      expect(screen.getByText(secao)).toBeTruthy();
    }

    // Cada uma com o seu contador.
    expect(screen.getAllByText("0 itens").length).toBe(3);

    // E na ordem do handoff.
    const texto = document.body.textContent ?? "";
    expect(texto.indexOf(secoes[0])).toBeLessThan(texto.indexOf(secoes[1]));
    expect(texto.indexOf(secoes[1])).toBeLessThan(texto.indexOf(secoes[2]));
  });

  test("Contador acompanha os itens", () => {
    montar();

    expect(screen.getAllByText("0 itens").length).toBe(3);

    adicionarExperiencia("Fintech Kobo");
    expect(screen.getByText("1 item")).toBeTruthy();

    adicionarExperiencia("Banco Órion");
    expect(screen.getByText("2 itens")).toBeTruthy();
  });

  test("Contador concorda em número", () => {
    montar();

    adicionarExperiencia("Fintech Kobo");
    expect(screen.getByText("1 item")).toBeTruthy();
    expect(screen.queryByText("1 itens")).toBeNull();

    adicionarExperiencia("Banco Órion");
    expect(screen.getByText("2 itens")).toBeTruthy();
  });

  test("Seção vazia não repete o botão de adicionar", () => {
    montar();

    // Vazia, o convite é um só: o do bloco vazio.
    for (const rotulo of [/Adicionar formação/, /Adicionar experiência/]) {
      expect(screen.getAllByRole("button", { name: rotulo })).toHaveLength(1);
    }

    const vazio = screen
      .getByText("Nenhuma formação nova.")
      .closest("div") as HTMLElement;
    expect(
      within(vazio).getByRole("button", { name: /Adicionar formação/ }),
    ).toBeTruthy();
  });

  test("Seção com item traz o botão no cabeçalho", () => {
    montar();
    adicionarExperiencia("Fintech Kobo");

    // O bloco vazio saiu…
    expect(
      screen.queryByText("Nenhuma experiência nova desde a última versão."),
    ).toBeNull();

    // …e o botão agora vive no cabeçalho da seção.
    const botao = screen.getByRole("button", { name: /Adicionar experiência/ });
    expect(botao.closest("header")).toBeTruthy();
  });
});

describe("Bloco de estado vazio", () => {
  test("Lista vazia explica o vazio", () => {
    montar();

    for (const frase of [
      "Nenhuma formação nova.",
      "Nenhuma experiência nova desde a última versão.",
      "Nenhuma habilidade nova.",
    ]) {
      expect(screen.getByText(frase), frase).toBeTruthy();
    }

    // Cada bloco traz também a frase de apoio, que diz o que entra ali.
    expect(
      screen.getByText(/Mudou de empresa, foi promovido ou assumiu um escopo maior/),
    ).toBeTruthy();
    expect(screen.getByText(/Ferramentas, linguagens ou certificações/)).toBeTruthy();
  });

  test("O vazio da formação preserva o que foi importado", () => {
    montar();

    expect(screen.getByText(/As do arquivo importado seguem no currículo/)).toBeTruthy();
  });
});

describe("Adicionar item pela tela", () => {
  test("Modal abre com o tipo certo", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Nova experiência")).toBeTruthy();
    for (const campo of ["Empresa", "Cargo", "Início", "Fim"]) {
      expect(within(modal).getByLabelText(campo), campo).toBeTruthy();
    }
    expect(
      within(modal).getByLabelText("O que você entregou? (números ajudam)"),
    ).toBeTruthy();
  });

  test("Adicionar cria o item", () => {
    montar();
    adicionarExperiencia("Fintech Kobo", "Tech Lead");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByDisplayValue("Fintech Kobo")).toBeTruthy();
    expect(screen.getByDisplayValue("Tech Lead")).toBeTruthy();
    expect(
      screen.queryByText("Nenhuma experiência nova desde a última versão."),
    ).toBeNull();
  });

  test("Não existe linha em branco inline", () => {
    montar();

    // Sem itens, nenhum campo de formulário existe fora do modal.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("Campos da formação", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByLabelText("Curso"), {
      target: { value: "Pós em Dados" },
    });
    fireEvent.change(within(modal).getByLabelText("Instituição"), {
      target: { value: "USP" },
    });
    fireEvent.change(within(modal).getByLabelText("Início"), {
      target: { value: "03/2022" },
    });
    fireEvent.change(within(modal).getByLabelText("Conclusão"), {
      target: { value: "06/2024" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    for (const campo of ["Curso", "Instituição", "Início", "Conclusão"]) {
      expect(screen.getByLabelText(campo), campo).toBeTruthy();
    }
  });

  test("Campos da experiência", () => {
    montar();
    adicionarExperiencia("Fintech Kobo");

    for (const campo of [
      "Empresa",
      "Cargo",
      "Início",
      "Fim",
      "O que você entregou? (números ajudam)",
    ]) {
      expect(screen.getByLabelText(campo), campo).toBeTruthy();
    }
  });

  test("Campo da habilidade", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar habilidade/ }));
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByLabelText("Habilidade"), {
      target: { value: "Rust" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    expect(screen.getByDisplayValue("Rust")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remover" })).toBeTruthy();
  });
});

describe("Saída da etapa", () => {
  /** A última emissão — é o que o shell guardaria. */
  function ultimaEmissao(emitir: ReturnType<typeof vi.fn>) {
    return emitir.mock.calls.at(-1)?.[0];
  }

  test("Criar um item emite o conteúdo", () => {
    const emitir = vi.fn();
    montar({ onChange: emitir });

    adicionarExperiencia("Cooperativa Aurora", "Gerente de Operações");

    const conteudo = ultimaEmissao(emitir);
    expect(conteudo.experience).toHaveLength(1);
    expect(conteudo.experience[0].company).toBe("Cooperativa Aurora");
    expect(conteudo.experience[0].id).toBeTruthy();
  });

  test("Editar um item emite o conteúdo atualizado", () => {
    const emitir = vi.fn();
    montar({ onChange: emitir });
    adicionarExperiencia("Cooperativa Aurora", "Gerente de Operações");
    const idOriginal = ultimaEmissao(emitir).experience[0].id;

    const cargo = screen.getByDisplayValue("Gerente de Operações");
    fireEvent.change(cargo, { target: { value: "Diretora de Operações" } });

    const conteudo = ultimaEmissao(emitir);
    expect(conteudo.experience[0].role).toBe("Diretora de Operações");
    // O id sobrevive à edição: é ele que mantém a sugestão ancorada ao trecho certo.
    expect(conteudo.experience[0].id).toBe(idOriginal);
  });

  test("Remover um item emite o conteúdo sem ele", () => {
    const emitir = vi.fn();
    montar({ onChange: emitir });
    adicionarExperiencia("Cooperativa Aurora");
    adicionarExperiencia("Banco Órion");

    fireEvent.click(screen.getAllByRole("button", { name: /Remover/ })[0]);

    const conteudo = ultimaEmissao(emitir);
    expect(conteudo.experience.map((item: { company: string }) => item.company)).toEqual([
      "Banco Órion",
    ]);
  });

  test("Rascunho não é emitido", () => {
    const emitir = vi.fn();
    montar({ onChange: emitir });

    fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByLabelText("Empresa"), {
      target: { value: "Empresa que o usuário desistiu de adicionar" },
    });

    // Digitar sem confirmar não é conteúdo do currículo.
    expect(ultimaEmissao(emitir).experience).toEqual([]);
  });
});

describe("Datas obrigatórias no modal", () => {
  test("Data vazia segura o Adicionar até as duas virem", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    fireEvent.change(within(modal).getByLabelText("Curso"), {
      target: { value: "Pós em Dados" },
    });
    fireEvent.change(within(modal).getByLabelText("Instituição"), {
      target: { value: "USP" },
    });
    // Só o início: ainda falta a conclusão.
    fireEvent.change(within(modal).getByLabelText("Início"), {
      target: { value: "03/2022" },
    });

    expect(within(modal).getByRole("button", { name: "Adicionar" })).toHaveProperty(
      "disabled",
      true,
    );

    fireEvent.change(within(modal).getByLabelText("Conclusão"), {
      target: { value: "06/2024" },
    });
    expect(within(modal).getByRole("button", { name: "Adicionar" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  test("Nenhuma data preenchida também segura o Adicionar", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));
    const modal = screen.getByRole("dialog");

    fireEvent.change(within(modal).getByLabelText("Empresa"), {
      target: { value: "Cooperativa Aurora" },
    });
    fireEvent.change(within(modal).getByLabelText("Cargo"), {
      target: { value: "Gerente" },
    });

    expect(within(modal).getByRole("button", { name: "Adicionar" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  test("Em andamento dispensa o fim", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));
    const modal = screen.getByRole("dialog");

    fireEvent.change(within(modal).getByLabelText("Empresa"), {
      target: { value: "Cooperativa Aurora" },
    });
    fireEvent.change(within(modal).getByLabelText("Cargo"), {
      target: { value: "Gerente" },
    });
    fireEvent.change(within(modal).getByLabelText("Início"), {
      target: { value: "03/2022" },
    });
    fireEvent.click(within(modal).getByLabelText("Em andamento"));

    expect(within(modal).getByRole("button", { name: "Adicionar" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});

describe("Máscara de data", () => {
  test("Formata os dígitos enquanto se digita", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    const inicio = within(modal).getByLabelText("Início");
    fireEvent.change(inicio, { target: { value: "032022" } });
    expect(inicio).toHaveProperty("value", "03/2022");
  });

  test("Já formatado, passa sem reescrita", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    const inicio = within(modal).getByLabelText("Início");
    fireEvent.change(inicio, { target: { value: "03/2022" } });
    expect(inicio).toHaveProperty("value", "03/2022");
  });

  test("Nome de mês em inglês não é engolido", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    const inicio = within(modal).getByLabelText("Início");
    fireEvent.change(inicio, { target: { value: "March 2022" } });
    expect(inicio).toHaveProperty("value", "March 2022");
  });
});

describe("Datas na tela", () => {
  test("Mês inválido é recusado na tela", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    const inicio = within(modal).getByLabelText("Início");
    fireEvent.change(inicio, { target: { value: "13/2022" } });
    fireEvent.blur(inicio);

    expect(within(modal).getByRole("alert").textContent).toBe(
      "Mês precisa estar entre 01 e 12.",
    );
    expect(inicio.getAttribute("aria-invalid")).toBe("true");
  });

  test("Mês inválido é marcado ao digitar, sem precisar sair do campo", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    const inicio = within(modal).getByLabelText("Início");
    fireEvent.change(inicio, { target: { value: "13/2022" } });

    // A validação do modal é recalculada a cada tecla: o erro aparece junto, e o
    // botão de confirmar já sabe que o item não pode nascer.
    expect(within(modal).getByRole("alert").textContent).toBe(
      "Mês precisa estar entre 01 e 12.",
    );
    expect(within(modal).getByRole("button", { name: "Adicionar" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  test("Corrigir a data limpa o erro ao vivo", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    const inicio = within(modal).getByLabelText("Início");
    fireEvent.change(inicio, { target: { value: "13/2022" } });
    expect(within(modal).getByRole("alert").textContent).toBe(
      "Mês precisa estar entre 01 e 12.",
    );

    fireEvent.change(inicio, { target: { value: "03/2022" } });

    expect(within(modal).queryByRole("alert")).toBeNull();
    expect(inicio.getAttribute("aria-invalid")).toBeNull();
  });

  test("Fim anterior ao início é marcado no campo Fim", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Adicionar formação/ }));
    const modal = screen.getByRole("dialog");

    fireEvent.change(within(modal).getByLabelText("Curso"), {
      target: { value: "Pós em Dados" },
    });
    fireEvent.change(within(modal).getByLabelText("Instituição"), {
      target: { value: "USP" },
    });
    fireEvent.change(within(modal).getByLabelText("Início"), {
      target: { value: "03/2022" },
    });
    fireEvent.change(within(modal).getByLabelText("Conclusão"), {
      target: { value: "01/2021" },
    });

    // O erro de faixa mora no campo do fim, que é onde a correção se faz.
    const conclusao = within(modal).getByLabelText("Conclusão");
    expect(conclusao.getAttribute("aria-invalid")).toBe("true");
    expect(within(modal).getByRole("alert").textContent).toBe(
      "O fim não pode ser anterior ao início.",
    );
    expect(within(modal).getByRole("button", { name: "Adicionar" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

describe("Interface bilíngue na etapa", () => {
  test("Conteúdo do usuário não é traduzido", () => {
    render(
      <LocaleProvider initialLocale="pt">
        <UpdateIntake />
      </LocaleProvider>,
    );
    adicionarExperiencia("Agência Vetor", "Desenvolvedora Júnior");

    // O texto digitado permanece exatamente como foi escrito, qualquer que seja o
    // idioma da interface — traduzir currículo é da exportação.
    expect(screen.getByDisplayValue("Agência Vetor")).toBeTruthy();
    expect(screen.getByDisplayValue("Desenvolvedora Júnior")).toBeTruthy();
  });

  test("Nenhum texto fixo em componente", () => {
    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const caminho = join(dir, entrada.name);
        if (entrada.isDirectory()) varrer(caminho);
        else if (entrada.name.endsWith(".tsx") && !entrada.name.includes(".test."))
          arquivos.push(caminho);
      }
    };
    varrer(join(process.cwd(), "components"));

    // Texto entre tags JSX que não venha de `{...}` seria string fixa.
    const textoSolto = />\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ,.?!]{3,}\s*</;

    const infratores = arquivos.filter((arquivo) => {
      const fonte = readFileSync(arquivo, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      return textoSolto.test(fonte);
    });

    expect(infratores).toEqual([]);
  });
});
