// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Button, Card, Field, Modal, TextArea } from "./index";

// Sem `globals: true`, a limpeza automática do Testing Library não roda.
afterEach(cleanup);

describe("Primitivos de interface", () => {
  test("Botão compõe as classes do design system", () => {
    render(<Button variant="secondary">Adicionar</Button>);
    const botao = screen.getByRole("button", { name: "Adicionar" });

    expect(botao.className).toContain("btn");
    expect(botao.className).toContain("btn-secondary");
    // Nunca submete formulário sem querer.
    expect(botao.getAttribute("type")).toBe("button");
  });

  test("Campo liga rótulo, erro e estado inválido", () => {
    render(<Field label="Início" error="Mês precisa estar entre 01 e 12." />);

    const campo = screen.getByLabelText("Início");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe(
      "Mês precisa estar entre 01 e 12.",
    );
    expect(campo.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").getAttribute("id"),
    );
  });

  test("Campo sem erro não anuncia invalidez", () => {
    render(<Field label="Curso" />);

    expect(screen.getByLabelText("Curso").getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("Cartão envolve o conteúdo", () => {
    render(
      <Card>
        <span>conteúdo</span>
      </Card>,
    );
    expect(screen.getByText("conteúdo")).toBeTruthy();
  });
});

describe("Adicionar por modal", () => {
  function ModalDeTeste({ onClose }: { onClose: () => void }) {
    return (
      <Modal open title="Nova formação" onClose={onClose} footer={<button>ok</button>}>
        <Field label="Curso" />
      </Modal>
    );
  }

  test("Clique no overlay fecha", () => {
    const fechar = vi.fn();
    render(<ModalDeTeste onClose={fechar} />);

    // O overlay é o pai direto da caixa do modal.
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(fechar).toHaveBeenCalledTimes(1);
  });

  test("Clique dentro da caixa não fecha", () => {
    const fechar = vi.fn();
    render(<ModalDeTeste onClose={fechar} />);

    fireEvent.click(screen.getByLabelText("Curso"));
    fireEvent.click(screen.getByText("Nova formação"));

    expect(fechar).not.toHaveBeenCalled();
  });

  test("Esc fecha", () => {
    const fechar = vi.fn();
    render(<ModalDeTeste onClose={fechar} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(fechar).toHaveBeenCalledTimes(1);
  });

  test("Modal segue a forma do handoff", () => {
    const css = readFileSync(
      join(process.cwd(), "components", "ui", "primitives.module.css"),
      "utf8",
    );

    // Overlay escurecido, caixa de largura fixa limitada pela tela, cantos
    // arredondados e entrada com escala — os valores do handoff.
    expect(css).toContain("width: 420px");
    expect(css).toContain("max-width: 90vw");
    expect(css).toContain("border-radius: 10px");
    expect(css).toMatch(/\.backdrop\s*{[\s\S]*var\(--color-overlay\)/);
    // Centralizado na tela — não dependente do `margin: auto` do `<dialog>` nativo,
    // que o reset do Tailwind anula.
    expect(css).toMatch(/\.backdrop\s*{[^}]*position:\s*fixed;[^}]*inset:\s*0;/);
    expect(css).toMatch(/\.backdrop\s*{[^}]*align-items:\s*center;/);
    expect(css).toMatch(/\.backdrop\s*{[^}]*justify-content:\s*center;/);
    // E o token resolve para o valor do handoff.
    const tokens = readFileSync(
      join(process.cwd(), "claude-design", "styles.css"),
      "utf8",
    );
    expect(tokens).toMatch(/--color-overlay:\s*rgba\(10,\s*10,\s*16,\s*0\.6\)/);
    expect(css).toMatch(/@keyframes modalPop[\s\S]*scale\(0\.94\) translateY\(6px\)/);
  });
});

describe("Fidelidade ao design", () => {
  test("Nenhuma cor fora do design system", () => {
    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const caminho = join(dir, entrada.name);
        if (entrada.isDirectory()) varrer(caminho);
        else if (/\.(tsx?|css)$/.test(entrada.name) && !entrada.name.includes(".test."))
          arquivos.push(caminho);
      }
    };
    varrer(join(process.cwd(), "components"));
    varrer(join(process.cwd(), "app"));

    const literalDeCor =
      /#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/i;

    const infratores = arquivos.filter((arquivo) => {
      const fonte = readFileSync(arquivo, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      // `rgb(0 0 0 / …)` puro preto é sombra, não cor de marca: o design system
      // define as sombras com o mesmo preto transparente.
      return literalDeCor.test(fonte.replace(/rgb\(0 0 0 \/ [^)]*\)/g, ""));
    });

    expect(infratores).toEqual([]);
  });

  test("Os campos compõem a classe do design system", () => {
    render(
      <>
        <Field label="Curso" />
        <TextArea label="O que você entregou?" />
      </>,
    );

    // A forma do controle vem do design system, como no botão.
    expect(screen.getByLabelText("Curso").className).toMatch(/\binput\b/);
    expect(screen.getByLabelText("O que você entregou?").className).toMatch(/\binput\b/);

    /*
     * E o módulo local não redeclara a forma. Era essa cópia — sem `min-height`, com
     * fundo `--color-bg` e raio 4px — que fazia o campo sair mais baixo e mais escuro
     * que o cartão.
     */
    const modulo = readFileSync(
      join(process.cwd(), "components", "ui", "primitives.module.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    const regraDoCampo = /\.(control|field)\b[^{]*\{([^}]*)\}/g;
    for (const [, , corpo] of modulo.matchAll(regraDoCampo)) {
      for (const propriedade of ["background:", "border-radius:", "padding:"]) {
        expect(corpo, propriedade).not.toContain(propriedade);
      }
    }
  });

  test("O campo é mais claro que o cartão que o contém", () => {
    const tokens = readFileSync(
      join(process.cwd(), "claude-design", "styles.css"),
      "utf8",
    );
    const valor = (nome: string) =>
      new RegExp(`${nome}:\\s*(#[0-9a-f]{6})`, "i").exec(tokens)?.[1];

    // O campo usa `--color-surface`; o cartão, `--color-card`.
    const modulo = readFileSync(
      join(process.cwd(), "components", "ui", "primitives.module.css"),
      "utf8",
    );
    expect(modulo).toMatch(/\.card\s*\{[^}]*background:\s*var\(--color-card\)/);

    const sistema = readFileSync(
      join(process.cwd(), "claude-design", "styles.css"),
      "utf8",
    );
    expect(sistema).toMatch(/\.input\s*\{[^}]*background:\s*var\(--color-surface\)/);

    // E a superfície do campo é de fato mais clara que a do cartão.
    const luminancia = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);

    const campo = valor("--color-surface")!;
    const cartao = valor("--color-card")!;
    expect(luminancia(campo)).toBeGreaterThan(luminancia(cartao));
  });
});
