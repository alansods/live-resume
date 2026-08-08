// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { revisaoDeExemplo } from "@/fixtures/review";
import { importedResume } from "@/fixtures/resumes";
import { LocaleProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionary";
import type { Resume } from "@/lib/resume/schema";
import { serializeResume } from "@/lib/resume/serialize";
import { suggestDates } from "@/lib/suggestions/dates";
import { AppShell } from "./AppShell";

afterEach(cleanup);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

/** O que cada rota devolve nos testes. A IA nunca é chamada de verdade. */
type Respostas = {
  import?: { ok: boolean; body: unknown };
  suggestions?: unknown[];
  /** Sugestões construídas sobre o currículo que o shell enviou. */
  suggestionsFrom?: (resume: Resume) => unknown[];
  /**
   * Rotas de sugestão que falham: `reject` é rede fora, `error` é resposta de erro,
   * `quota` é o 429 do limite diário da IA.
   */
  suggestionsFail?: Partial<Record<"metrics" | "ats", "reject" | "error" | "quota">>;
  /** Segura as rotas de sugestão até ser liberada — para observar a espera. */
  segurar?: Promise<void>;
  /** Segura a rota de importação até ser liberada — para observar o progresso. */
  segurarImport?: Promise<void>;
  exportFailures?: string | null;
  /** A exportação responde 429: o limite diário da IA acabou. */
  exportQuota?: boolean;
  /** Rede fora na exportação — a operação falha de verdade, sem cota envolvida. */
  exportReject?: boolean;
  /** A exportação responde 422: nenhuma saída foi gerada. */
  exportNoOutput?: boolean;
  /** Segura a rota de exportação até ser liberada — para observar o progresso. */
  segurarExport?: Promise<void>;
};

/** Os corpos enviados às rotas de sugestão, para conferir o que o shell mandou. */
const enviadoParaSugestoes: { resume: Resume; extraUserText?: string[] }[] = [];

function mockarFetch(respostas: Respostas = {}) {
  const chamadas: string[] = [];

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    chamadas.push(url);

    if (url === "/api/resume-import") {
      if (respostas.segurarImport) await respostas.segurarImport;
      const {
        ok = true,
        body = { resume: JSON.parse(serializeResume(importedResume)) },
      } = respostas.import ?? {};
      return { ok, json: async () => body } as unknown as Response;
    }

    if (url.startsWith("/api/suggestions/")) {
      if (respostas.segurar) await respostas.segurar;
      const rota = url.endsWith("/metrics") ? "metrics" : "ats";
      const falha = respostas.suggestionsFail?.[rota];
      if (falha === "reject") throw new Error("rede fora");
      if (falha === "error") {
        return {
          ok: false,
          status: 502,
          json: async () => ({ error: { code: "call-failed" } }),
        } as unknown as Response;
      }
      if (falha === "quota") {
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: { code: "quota-exceeded" } }),
        } as unknown as Response;
      }

      const corpo = JSON.parse(String(init?.body ?? "{}"));
      enviadoParaSugestoes.push(corpo);

      const todas =
        respostas.suggestionsFrom?.(corpo.resume) ??
        respostas.suggestions ??
        revisaoDeExemplo;
      // Cada rota devolve só o que ela produz de verdade. As de data não vêm de rota
      // nenhuma: são calculadas no cliente, e é isso que os testes precisam refletir.
      const parte = url.endsWith("/metrics")
        ? todas.filter((s) => ["metric", "verb"].includes((s as { kind: string }).kind))
        : todas.filter((s) => (s as { kind: string }).kind === "ats");
      return {
        ok: true,
        json: async () => ({ suggestions: parte }),
      } as unknown as Response;
    }

    if (url === "/api/export") {
      if (respostas.segurarExport) await respostas.segurarExport;
      const corpo = JSON.parse(String(init?.body ?? "{}"));
      enviadoParaExport.push(corpo);
      if (respostas.exportReject) throw new Error("rede fora");
      if (respostas.exportQuota) {
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: { code: "quota-exceeded" } }),
        } as unknown as Response;
      }
      if (respostas.exportNoOutput) {
        return {
          ok: false,
          status: 422,
          json: async () => ({
            error: { code: "no-output", message: "Nenhum arquivo foi gerado." },
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        headers: new Headers({
          "content-disposition": 'attachment; filename="curriculo-pt.pdf"',
          ...(respostas.exportFailures
            ? { "x-export-failures": respostas.exportFailures }
            : {}),
        }),
        blob: async () => new Blob(["pdf"]),
        json: async () => ({}),
      } as unknown as Response;
    }

    throw new Error(`Rota inesperada: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return chamadas;
}

const enviadoParaExport: {
  resume?: Resume;
  patches?: { path: string; text: string }[];
}[] = [];

beforeEach(() => {
  enviadoParaExport.length = 0;
  enviadoParaSugestoes.length = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:x"),
    revokeObjectURL: vi.fn(),
  });
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const montar = (locale: Locale = "pt") =>
  render(
    <LocaleProvider initialLocale={locale}>
      <AppShell />
    </LocaleProvider>,
  );

/** Importa um arquivo pelo input da etapa 01. */
async function importar() {
  const arquivo = new File(["x"], "curriculo.docx");
  fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
    target: { files: [arquivo] },
  });
  await waitFor(() => expect(screen.getByText("Currículo importado")).toBeTruthy());
}

const irPara = (nome: RegExp) =>
  fireEvent.click(screen.getByRole("button", { name: nome }));

/** O que as rotas de IA devolvem — as de data não vêm de rota. */
const daIA = revisaoDeExemplo.filter((s) => s.kind !== "dates");

/**
 * As sugestões de data do currículo de exemplo, da mesma função que roda em produção:
 * o teste não duplica a regra de qual data está defeituosa.
 */
const datasDoExemplo = suggestDates(importedResume).suggestions;

describe("Importação do arquivo na etapa 01", () => {
  test("Arquivo selecionado é importado", async () => {
    mockarFetch();
    montar();

    await importar();

    expect(screen.getByText(/curriculo\.docx/)).toBeTruthy();
  });

  test("O percentual não chega a 100% enquanto a chamada não termina", async () => {
    // A rota fica pendurada: é exatamente a janela em que o bug aparecia.
    let liberar!: () => void;
    const pendente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    mockarFetch({ segurarImport: pendente });
    montar();

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
        target: { files: [new File(["x"], "curriculo.docx")] },
      });

      // Bem além do necessário para o timer varrer as quatro etapas nomeadas.
      act(() => {
        vi.advanceTimersByTime(620 * 10);
      });

      const cartao = screen.getByRole("status");
      expect(cartao.textContent).toContain("%");
      expect(cartao.textContent).not.toContain("100%");

      // E o checklist concorda: a última etapa ainda está em andamento, não concluída.
      const itens = cartao.querySelectorAll("li");
      const ultima = itens[itens.length - 1];
      expect(ultima.textContent).toContain("Marcar bullets sem métrica");
      expect(ultima.querySelector('[class*="iconActive"]')).toBeTruthy();
      expect(
        cartao.querySelectorAll('[class*="iconActive"]').length,
        "uma etapa em andamento por vez",
      ).toBe(1);
    } finally {
      vi.useRealTimers();
      liberar();
    }
  });

  test("Arquivo arrastado é importado", async () => {
    mockarFetch();
    const { container } = montar();

    const zona = container.querySelector("[class*=dropzone]")!;
    fireEvent.drop(zona, {
      dataTransfer: { files: [new File(["x"], "arrastado.docx")] },
    });

    await waitFor(() => expect(screen.getByText(/arrastado\.docx/)).toBeTruthy());
  });

  test("Enquanto importa, a espera é informada", async () => {
    mockarFetch();
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    // O cartão de progresso, não mais uma linha de texto — mas continua nomeando o
    // arquivo e a etapa corrente, com o alerta de não recarregar.
    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("curriculo.docx");
    expect(aviso.textContent).toMatch(/Não recarregue a página/);
    await waitFor(() => expect(screen.getByText("Currículo importado")).toBeTruthy());
  });

  test("Falha de importação é informada e não avança", async () => {
    mockarFetch({
      import: { ok: false, body: { error: { message: "Arquivo corrompido." } } },
    });
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "ruim.pdf")] },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Arquivo corrompido."),
    );
    expect(screen.getByRole("button", { name: "Avançar" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

describe("Sugestões pedidas uma vez ao entrar na revisão", () => {
  test("Sugestões são pedidas ao chegar na revisão", async () => {
    const chamadas = mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);

    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
    expect(chamadas.filter((u) => u.startsWith("/api/suggestions/"))).toHaveLength(2);
    // As duas rotas mais as datas calculadas localmente dão o conjunto inteiro.
    expect(screen.getAllByRole("article").length - 1).toBe(
      daIA.length + datasDoExemplo.length,
    );
  });

  test("Sugestões de data entram no conjunto da revisão", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    // "01/2020 – 12/2022" sobrepõe a experiência seguinte; "2018 - 2019" não tem mês.
    for (const sugestao of datasDoExemplo) {
      expect(screen.getByText(sugestao.title), sugestao.path).toBeTruthy();
    }
  });

  test("Sugestões de data não pedem serviço externo", async () => {
    const chamadas = mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    // Só as duas rotas de IA. Aritmética de calendário não vai à rede.
    expect(chamadas.filter((u) => u.startsWith("/api/suggestions/"))).toEqual([
      "/api/suggestions/metrics",
      "/api/suggestions/ats",
    ]);
  });

  test("Voltar e avançar não repete o pedido", async () => {
    const chamadas = mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
    const antes = chamadas.filter((u) => u.startsWith("/api/suggestions/")).length;

    irPara(/2\. Atualizar/);
    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    expect(chamadas.filter((u) => u.startsWith("/api/suggestions/"))).toHaveLength(antes);
  });

  test("Marcações sobrevivem à navegação", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
    const primeira = screen.getAllByRole("checkbox")[0];
    fireEvent.click(primeira);

    irPara(/2\. Atualizar/);
    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    expect(screen.getAllByRole("checkbox")[0]).toHaveProperty("checked", true);
  });
});

describe("Aviso de datas organizadas propagado à revisão", () => {
  const AVISO = /As datas foram organizadas/;

  /** Currículo sem período incompleto e sem sobreposição. */
  const semDefeitoDeData = {
    ...importedResume,
    jobs: [importedResume.jobs[0]],
    education: [importedResume.education[0]],
  };

  async function revisar(resume = importedResume) {
    mockarFetch({
      import: { ok: true, body: { resume: JSON.parse(serializeResume(resume)) } },
    });
    montar();
    await importar();
    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  }

  test("Mês inferido pelo app aciona o aviso", async () => {
    // "2018 - 2019" não tem mês de onde derivar: o app escolhe, e por isso avisa.
    expect(suggestDates(importedResume).requiresDisclosure).toBe(true);

    await revisar();

    expect(screen.getByText(AVISO)).toBeTruthy();
  });

  test("Mês derivado do usuário não aciona o aviso", async () => {
    // Sobreposição: o fim proposto sai do início da experiência seguinte, que o
    // usuário escreveu. Nada foi inferido, então nada precisa ser avisado.
    const soSobreposicao = {
      ...importedResume,
      jobs: importedResume.jobs.filter((job) => job.period.complete),
      education: importedResume.education,
    };
    const datas = suggestDates(soSobreposicao);
    expect(datas.suggestions.length).toBeGreaterThan(0);
    expect(datas.requiresDisclosure).toBe(false);

    await revisar(soSobreposicao);

    expect(screen.queryByText(AVISO)).toBeNull();
  });

  test("Currículo sem defeito de data não exibe aviso", async () => {
    expect(suggestDates(semDefeitoDeData).suggestions).toEqual([]);

    await revisar(semDefeitoDeData);

    expect(screen.queryByText(AVISO)).toBeNull();
  });
});

describe("Sugestões de data resistem à falha da IA", () => {
  test("Rotas de IA que falham não apagam as sugestões de data", async () => {
    // Rede fora: a promessa rejeita, e nem por isso o conjunto se perde.
    mockarFetch({ suggestionsFail: { metrics: "reject", ats: "reject" } });
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    // A revisão abre com as datas, em vez de vazia.
    for (const sugestao of datasDoExemplo) {
      expect(screen.getByText(sugestao.title), sugestao.path).toBeTruthy();
    }
    expect(screen.getAllByRole("article").length - 1).toBe(datasDoExemplo.length);
  });

  test("Falha de uma rota preserva o que a outra devolveu", async () => {
    mockarFetch({ suggestionsFail: { metrics: "error" } });
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    const daRotaQueRespondeu = daIA.filter((s) => s.kind === "ats");
    for (const sugestao of daRotaQueRespondeu) {
      expect(screen.getByText(sugestao.title), sugestao.id).toBeTruthy();
    }
    expect(screen.getAllByRole("article").length - 1).toBe(
      datasDoExemplo.length + daRotaQueRespondeu.length,
    );
  });
});

describe("Pontuação de ATS projetada na tela", () => {
  test("Pontuação sobe ao marcar", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    const antes = Number(screen.getByRole("meter").getAttribute("aria-valuenow"));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expect(
      Number(screen.getByRole("meter").getAttribute("aria-valuenow")),
    ).toBeGreaterThan(antes);
  });

  test("Sem sugestões, a top bar não pontua", () => {
    mockarFetch();
    montar();

    // Nada analisado ainda: a conta daria 100 — nota cheia por ausência de pendências —,
    // que é o contrário do que se sabe sobre o currículo.
    expect(screen.queryByRole("meter")).toBeNull();
  });
});

describe("Stepper horizontal no topo do conteúdo", () => {
  /** O botão de cada passo, na ordem do stepper. */
  const passos = () =>
    screen
      .getAllByRole("button")
      .filter((botao) => /^[1-4]\. /.test(botao.textContent ?? ""));

  test("Os quatro passos aparecem em linha, numerados no rótulo", () => {
    mockarFetch();
    montar();

    expect(passos().map((botao) => botao.textContent)).toEqual([
      "1. Importar",
      "2. Atualizar",
      "3. Revisar",
      "4. Exportar",
    ]);
  });

  test("O stepper não tem faixa própria em volta", () => {
    // Ele flutua sobre o fundo da página. Um fundo, uma borda ou uma sombra o
    // transformariam numa segunda barra logo abaixo da top bar — é o que se protege
    // aqui, e é uma propriedade da folha, não da árvore renderizada.
    const folha = readFileSync(
      join(process.cwd(), "components", "shell", "Shell.module.css"),
      "utf8",
    );
    const regra = folha.match(/\.stepper\s*\{([^}]*)\}/)![1];

    expect(regra).not.toMatch(/background|border|box-shadow/);
  });

  test("Passo cumprido é marcado como cumprido", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);

    // O passo 01 já passou; o 02 é o atual, e o 03 ainda não foi.
    const [um, dois, tres] = passos();
    expect(um.querySelector("span")!.className).not.toBe(
      tres.querySelector("span")!.className,
    );
    expect(dois.ariaCurrent).toBe("step");
    expect(um.ariaCurrent).toBeNull();
  });
});

describe("Exportação recebe as sugestões marcadas", () => {
  async function marcarEExportar() {
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
    const caixas = screen.getAllByRole("checkbox");
    fireEvent.click(caixas[0]);
    fireEvent.click(caixas[1]);

    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  }

  // As de data abrem o conjunto, então são elas que as duas primeiras caixas marcam.
  const marcadas = () => datasDoExemplo.slice(0, 2);

  test("O que foi marcado chega à exportação", async () => {
    mockarFetch();
    await marcarEExportar();

    const patches = enviadoParaExport[0].patches ?? [];
    expect(patches).toHaveLength(2);
    expect(patches).toEqual(
      marcadas().map((sugestao) => ({ path: sugestao.path, text: sugestao.after })),
    );
  });

  test("Correção de data marcada chega à exportação", async () => {
    mockarFetch();
    await marcarEExportar();

    const patches = enviadoParaExport[0].patches ?? [];
    const sobreposicao = marcadas().find((sugestao) => sugestao.action === "fixDate")!;

    // O período proposto chega como patch daquele trecho.
    expect(patches).toContainEqual({
      path: sobreposicao.path,
      text: sobreposicao.after,
    });
  });

  test("O que não foi marcado não chega", async () => {
    mockarFetch();
    await marcarEExportar();

    const enviados = (enviadoParaExport[0].patches ?? []).map((p) => p.path);
    const marcadosPath = marcadas().map((sugestao) => sugestao.path);

    for (const naoMarcada of [...datasDoExemplo, ...daIA]) {
      if (marcadosPath.includes(naoMarcada.path)) continue;
      expect(enviados, naoMarcada.id).not.toContain(naoMarcada.path);
    }
  });
});

/** Adiciona uma experiência pela etapa 02, que precisa estar visível. */
function digitarExperiencia(empresa: string, entregas = "") {
  fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));
  const modal = screen.getByRole("dialog");
  fireEvent.change(within(modal).getByLabelText("Empresa"), {
    target: { value: empresa },
  });
  fireEvent.change(within(modal).getByLabelText("Cargo"), {
    target: { value: "Gerente de Operações" },
  });
  if (entregas) {
    fireEvent.change(within(modal).getByLabelText(/O que você entregou/), {
      target: { value: entregas },
    });
  }
  fireEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));
}

describe("O que foi digitado na etapa 02 alimenta o fluxo", () => {
  test("O que foi digitado chega à revisão", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    digitarExperiencia("Cooperativa Aurora", "Reduzi o tempo de atendimento em 30%.");

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    // No papel do currículo, não só no formulário da etapa 02.
    const papel = within(
      screen.getByRole("article", { name: importedResume.header.name }),
    );
    expect(papel.getByText(/Cooperativa Aurora/)).toBeTruthy();
    expect(papel.getByText(/Reduzi o tempo de atendimento em 30%\./)).toBeTruthy();
  });

  test("O que foi digitado chega à exportação", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    digitarExperiencia("Cooperativa Aurora");

    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));

    const empresas = enviadoParaExport[0].resume!.jobs.map((job) => job.company);
    expect(empresas).toContain("Cooperativa Aurora");
  });

  test("Etapa 02 vazia não muda o currículo", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));

    expect(enviadoParaExport[0].resume).toEqual(
      JSON.parse(serializeResume(importedResume)),
    );
  });

  test("Editar a etapa 02 recompõe sem acumular", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    digitarExperiencia("Cooperativa Aurora");
    // Volta e remove: o currículo em trabalho é refeito a partir do importado.
    fireEvent.click(screen.getAllByRole("button", { name: /Remover/ })[0]);

    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));

    expect(enviadoParaExport[0].resume!.jobs).toHaveLength(importedResume.jobs.length);
  });
});

describe("Material do usuário enviado às sugestões", () => {
  test("Sobra da etapa 02 acompanha o pedido de sugestões", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    // Sem empresa não vira experiência do currículo — mas o texto não se perde.
    fireEvent.click(screen.getByRole("button", { name: /Adicionar experiência/ }));
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByLabelText("Cargo"), {
      target: { value: "Gerente de Operações" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Adicionar" }));

    irPara(/3\. Revisar/);
    await waitFor(() => expect(enviadoParaSugestoes).toHaveLength(2));

    for (const corpo of enviadoParaSugestoes) {
      expect(corpo.extraUserText).toContain("Gerente de Operações");
    }
  });

  test("Sem sobra, o pedido não carrega material extra", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    digitarExperiencia("Cooperativa Aurora");

    irPara(/3\. Revisar/);
    await waitFor(() => expect(enviadoParaSugestoes).toHaveLength(2));

    for (const corpo of enviadoParaSugestoes) {
      expect(corpo.extraUserText).toEqual([]);
    }
  });
});

describe("Sugestão que já não resolve não chega à exportação", () => {
  /**
   * Sugestão ancorada num bullet que o usuário digitou na etapa 02 — o único caso em
   * que o trecho endereçado pode desaparecer depois de marcado.
   */
  const sugestaoNoBulletDigitado = (resume: Resume) => {
    const job = resume.jobs.find(
      (candidato) => !importedResume.jobs.some((antigo) => antigo.id === candidato.id),
    );
    if (!job || job.bullets.length === 0) return [];

    return [
      {
        id: "sug-digitada",
        kind: "metric",
        path: `jobs.${job.id}.bullets.${job.bullets[0].id}`,
        where: `${job.company} · ${job.role}`,
        title: "Acrescentar escala",
        before: job.bullets[0].value.text,
        after: "Reduzi o tempo de atendimento em 30%, com 12 pessoas na operação.",
        why: "Escala mostra o tamanho da operação.",
        action: "apply",
        unsupportedNumbers: [],
      },
    ];
  };

  async function marcarSugestaoDoItemDigitado() {
    mockarFetch({ suggestionsFrom: sugestaoNoBulletDigitado });
    montar();
    await importar();

    irPara(/2\. Atualizar/);
    digitarExperiencia("Cooperativa Aurora", "Reduzi o tempo de atendimento.");

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Acrescentar escala")).toBeTruthy());

    // O cartão certo, não o primeiro: as sugestões de data abrem o conjunto.
    const cartao = screen.getByText("Acrescentar escala").closest("article")!;
    fireEvent.click(within(cartao).getByRole("checkbox"));
  }

  async function exportar() {
    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  }

  test("Sugestão que ainda resolve continua indo", async () => {
    await marcarSugestaoDoItemDigitado();
    await exportar();

    expect(enviadoParaExport[0].patches).toHaveLength(1);
  });

  test("Sugestão de item removido não vai à exportação", async () => {
    await marcarSugestaoDoItemDigitado();

    irPara(/2\. Atualizar/);
    fireEvent.click(screen.getAllByRole("button", { name: /Remover/ })[0]);

    await exportar();

    // O trecho já não existe: a sugestão some em silêncio, sem derrubar a exportação.
    expect(enviadoParaExport[0].patches).toEqual([]);
  });
});

describe("Falha parcial da exportação é informada", () => {
  async function exportar(failures: string | null) {
    mockarFetch({ exportFailures: failures });
    montar();
    await importar();
    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  }

  test("Falha de um idioma é exibida", async () => {
    await exportar('[{"locale":"en","reason":"AiError"}]');

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("todas as saídas"),
    );
  });

  test("Sem falha, sem aviso", async () => {
    await exportar(null);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Seleção de saídas na etapa 04 na tela", () => {
  /** A etapa 04 aberta, com o currículo já importado. */
  async function naExportacao() {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);
  }

  test("A contagem reflete idiomas vezes formatos", async () => {
    await naExportacao();

    fireEvent.click(screen.getByLabelText("English"));
    fireEvent.click(screen.getByLabelText("DOCX (estilos nativos)"));

    expect(screen.getByRole("button", { name: /Baixar 4 arquivos/ })).toBeTruthy();
  });

  test("Sem seleção não há download", async () => {
    await naExportacao();

    // Português vem marcado; desmarcá-lo deixa o conjunto vazio.
    fireEvent.click(screen.getByLabelText("Português (BR)"));

    const botao = screen.getByRole("button", { name: /Selecione idioma e formato/ });
    expect(botao).toHaveProperty("disabled", true);
  });

  test("Uma combinação gera um arquivo", async () => {
    await naExportacao();

    expect(screen.getByRole("button", { name: /Baixar 1 arquivo/ })).toBeTruthy();
  });

  test("Trocar o idioma da interface não muda as saídas escolhidas", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    // Só português está marcado por padrão.
    const antes = screen.getByRole("button", { name: /Baixar 1 arquivo/ });
    expect(antes).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByRole("button", { name: /Download 1 file/ })).toBeTruthy();
    expect(screen.getByLabelText("Portuguese (BR)")).toHaveProperty("checked", true);
    expect(screen.getByLabelText("English")).toHaveProperty("checked", false);
  });
});

describe("Interface bilíngue no shell", () => {
  test("Rótulos do shell mudam com o idioma", () => {
    mockarFetch();
    montar("en");

    expect(screen.getByRole("button", { name: /1\. Import/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  /**
   * O limite do que o app guarda. Ele existe porque agora o app guarda ALGUMA coisa: sem
   * este teste, o próximo estado que alguém quiser persistir passa sem ninguém notar.
   */
  test("Nada do currículo é guardado no navegador", async () => {
    mockarFetch();
    montar();

    await importar();
    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    const guardado = Object.fromEntries(
      Object.keys(localStorage).map((chave) => [chave, localStorage.getItem(chave)]),
    );

    // Só o idioma, e nada mais: nem currículo, nem etapa, nem sugestões aceitas.
    expect(Object.keys(guardado)).toEqual(["curriculo-vivo:locale"]);
    expect(guardado["curriculo-vivo:locale"]).toBe("en");

    const tudo = JSON.stringify(guardado);
    expect(tudo).not.toContain(importedResume.header.name);
    expect(tudo).not.toContain(revisaoDeExemplo[0].after);
  });

  test("Nenhum texto fixo em componente no shell", () => {
    const dir = join(process.cwd(), "components", "shell");
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

/** Uma promessa que o teste solta quando quiser. */
function represa() {
  let soltar!: () => void;
  const promessa = new Promise<void>((resolve) => {
    soltar = resolve;
  });
  return { promessa, soltar };
}

describe("A espera é anunciada", () => {
  const AVISO_RELOAD = /Não recarregue a página/;

  test("A importação anuncia a espera", () => {
    mockarFetch();
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("curriculo.docx");
    expect(aviso.textContent).toMatch(AVISO_RELOAD);
  });

  test("A importação anuncia a espera por etapa", () => {
    mockarFetch();
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("Extrair texto");
    expect(aviso.textContent).toMatch(AVISO_RELOAD);
  });

  test("A revisão anuncia a espera", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    irPara(/3\. Revisar/);

    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("Revisando seu currículo");
    expect(aviso.textContent).toMatch(AVISO_RELOAD);

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });

  test("A revisão anuncia a espera por etapa", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    irPara(/3\. Revisar/);

    expect(screen.getByRole("status").textContent).toContain("Ler versão importada");

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });

  test("A exportação anuncia a espera", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    expect(screen.getByRole("status").textContent).toMatch(/Gerando arquivos/i);
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  });

  test("A exportação anuncia a espera por etapa", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    // O nome do arquivo em geração é a etapa nomeada da exportação.
    expect(screen.getByRole("status").textContent).toMatch(/\.pdf|\.docx/);
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  });

  test("O aviso não promete progresso", () => {
    mockarFetch();
    const { container } = montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    // Nada que finja saber precisamente quanto TEMPO falta.
    expect(container.querySelector("progress")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  test("O aviso não estima tempo", () => {
    mockarFetch();
    const { container } = montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    // A barra é por etapa concluída, não por tempo: sem contagem regressiva, sem
    // percentual de duração esperada — o `%` que aparece é fração de etapas, não de
    // segundos, e por isso convive com a regra.
    expect(container.querySelector("progress")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("status").textContent).not.toMatch(
      /\d+\s*(segundos|minutos|seg|min)\b/i,
    );
  });

  test("Sem espera, sem aviso", async () => {
    mockarFetch();
    montar();
    await importar();

    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("Nada é acionável duas vezes durante a espera", () => {
  test("Não se navega durante o carregamento das sugestões", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    irPara(/3\. Revisar/);

    expect(screen.getByRole("button", { name: "Avançar" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Voltar" })).toHaveProperty(
      "disabled",
      true,
    );
    for (const etapa of [/1\. Importar/, /2\. Atualizar/, /4\. Exportar/]) {
      expect(screen.getByRole("button", { name: etapa }), String(etapa)).toHaveProperty(
        "disabled",
        true,
      );
    }

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });

  test("Não se baixa duas vezes", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    const botao = screen.getByRole("button", { name: /Baixar/ });
    fireEvent.click(botao);

    // O formulário inteiro sai — inclusive o próprio botão — enquanto gera; não dá
    // para clicar de novo no que não está mais na tela.
    expect(screen.queryByRole("button", { name: /Baixar/ })).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  });

  test("Falha libera as ações", async () => {
    mockarFetch({ suggestionsFail: { metrics: "reject", ats: "reject" } });
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    // A espera acabou mesmo tendo falhado: nada fica travado.
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Avançar" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});

describe("A revisão avisa quando parte das sugestões não veio", () => {
  test("A revisão avisa quando parte das sugestões não veio", async () => {
    mockarFetch({ suggestionsFail: { metrics: "error" } });
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    const aviso = screen.getByRole("alert");
    expect(aviso.textContent).toMatch(/Parte das sugestões não pôde ser obtida/);
    expect(aviso.textContent).toMatch(/entrar de novo|entrando/i);
  });

  test("Sem falha, sem aviso de sugestão faltando", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("As caixas de idioma e formato seguem o design system", () => {
  test("As caixas da etapa 04 não são as do navegador", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    const caixas = screen.getAllByRole("checkbox");
    expect(caixas).toHaveLength(4);

    for (const caixa of caixas) {
      // O input continua sendo o controle: clique, foco e rótulo passam por ele.
      expect(caixa.tagName).toBe("INPUT");
      expect(caixa.closest("label")).not.toBeNull();
      expect(caixa.nextElementSibling!.className).toContain("checkboxBox");
    }

    // E marcar continua mudando a contagem de saídas.
    fireEvent.click(screen.getByLabelText("English"));
    expect(screen.getByRole("button", { name: /Baixar 2 arquivos/ })).toBeTruthy();
  });
});

describe("Cota esgotada é anunciada como tal", () => {
  test("A importação avisa que a cota acabou", async () => {
    mockarFetch({
      import: {
        ok: false,
        body: {
          error: {
            code: "quota-exceeded",
            message: "O limite de uso gratuito acabou.",
          },
        },
      },
    });
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.pdf")] },
    });

    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toMatch(/limite de uso gratuito/i);
    // Sem prazo prometido: não se sabe qual janela de cota estourou.
    expect(aviso.textContent).toMatch(/mais tarde/i);
    // Continua na etapa 01, e o campo volta a aceitar arquivo.
    expect(screen.getByRole("button", { name: "Avançar" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Selecionar arquivo")).toHaveProperty("disabled", false);
  });

  test("A etapa 01 diz que o arquivo não é um currículo", async () => {
    mockarFetch({
      import: {
        ok: false,
        body: {
          error: {
            code: "not-a-resume",
            message: "Este arquivo não parece ser um currículo.",
          },
        },
      },
    });
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "contrato.pdf")] },
    });

    // A mensagem do motivo, e não a falha genérica: a pessoa precisa saber que o
    // problema é o arquivo que ela escolheu.
    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toMatch(/não parece ser um currículo/i);

    // Tom de atenção, não de falha: nada quebrou — o arquivo foi lido, só não é um
    // currículo. O ícone de aviso acompanha o tom âmbar.
    expect(aviso.className).toMatch(/warning/i);
    expect(aviso.querySelector("svg")).toBeTruthy();

    // E a dropzone continua na tela: o próximo passo é escolher outro arquivo, e ele se
    // faz aqui mesmo, sem um botão no caminho.
    expect(screen.getByLabelText("Selecionar arquivo")).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: "Enviar outro arquivo" })).toBeNull();
  });

  test("A recusa da importação é escrita no idioma da interface", async () => {
    mockarFetch({
      import: {
        ok: false,
        // A rota manda a mensagem em português; a tela não a usa quando conhece o código.
        body: {
          error: {
            code: "not-a-resume",
            message: "Este arquivo não parece ser um currículo.",
          },
        },
      },
    });
    montar("en");

    fireEvent.change(screen.getByLabelText("Choose file"), {
      target: { files: [new File(["x"], "contract.pdf")] },
    });

    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toMatch(/does not look like a resume/i);
    expect(aviso.textContent).not.toMatch(/currículo/i);
  });

  test("Falha que não é de cota mantém o aviso genérico", async () => {
    mockarFetch({
      import: {
        ok: false,
        body: { error: { code: "call-failed", message: "Arquivo corrompido." } },
      },
    });
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "ruim.pdf")] },
    });

    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toBe("Arquivo corrompido.");
    expect(aviso.textContent).not.toMatch(/limite de uso gratuito/i);
  });

  /** O aviso de cota da etapa 01, já na tela. */
  async function avisoDeCota() {
    mockarFetch({
      import: {
        ok: false,
        body: { error: { code: "quota-exceeded" } },
      },
    });
    montar();
    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.pdf")] },
    });
    return await screen.findByRole("alert");
  }

  test("O aviso de cota tem tom de atenção", async () => {
    const cota = await avisoDeCota();

    // A classe do módulo carrega o tom: atenção e falha não são a mesma caixa.
    expect(cota.className).toMatch(/warning/i);
    expect(cota.querySelector("svg")).toBeTruthy();

    cleanup();

    // E a falha comum, exibida no mesmo lugar, continua no outro tom.
    mockarFetch({
      import: {
        ok: false,
        body: { error: { code: "call-failed", message: "Arquivo corrompido." } },
      },
    });
    montar();
    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "ruim.pdf")] },
    });

    const falha = await screen.findByRole("alert");
    expect(falha.className).not.toMatch(/warning/i);

    // O tom âmbar existe no design system, e é de lá que a cor vem.
    const tokens = readFileSync(
      join(process.cwd(), "claude-design", "styles.css"),
      "utf8",
    );
    expect(tokens).toMatch(/--color-warning-400:/);
    const css = readFileSync(
      join(process.cwd(), "components", "ui", "Notice.module.css"),
      "utf8",
    );
    expect(css).toMatch(/var\(--color-warning-\d00\)/);
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });

  test("O aviso não encosta no que está acima dele", async () => {
    const cota = await avisoDeCota();

    // O aviso não repete o recuo lateral que a coluna da etapa já dá…
    const caixa = cota.parentElement!;
    expect(caixa.className).toMatch(/stepNotice/);

    const css = readFileSync(
      join(process.cwd(), "components", "shell", "Shell.module.css"),
      "utf8",
    );
    const regra = /\.stepNotice\s*{([^}]*)}/.exec(css)?.[1] ?? "";
    expect(regra).not.toMatch(/padding[^;]*48px/);
    // …e descola do que vem antes.
    expect(regra).toMatch(/margin-top:/);
  });

  test("O aviso tem a mesma largura do bloco acima", async () => {
    const cota = await avisoDeCota();
    const caixa = cota.parentElement!;

    const css = readFileSync(
      join(process.cwd(), "components", "shell", "Shell.module.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const regra = /\.stepNotice\s*{([^}]*)}/.exec(css)?.[1] ?? "";

    /*
     * Numa coluna flex, `align-items: flex-start` encolhe o filho até o conteúdo — era o
     * que deixava o aviso mais estreito que a dropzone. Sem a declaração vale `stretch`,
     * e a caixa acompanha a largura da coluna.
     */
    expect(regra).not.toMatch(/align-items/);
    expect(regra).not.toMatch(/(^|[^-])width:/);

    // O botão de tentar de novo é a exceção, e ela é explícita.
    expect(css).toMatch(/\.stepNotice\s*>\s*button\s*{[^}]*align-self:\s*flex-start/);

    // O container do aviso é o mesmo bloco de coluna que envolve a dropzone.
    expect(caixa.className).toMatch(/stepNotice/);
    expect(caixa.parentElement!.className).toMatch(/stepColumn/);
  });

  test("A revisão distingue cota de sugestão faltando", async () => {
    mockarFetch({ suggestionsFail: { metrics: "quota", ats: "quota" } });
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    const aviso = screen.getByRole("alert");
    expect(aviso.textContent).toMatch(/limite de uso gratuito/i);
    // Sem prazo prometido: não se sabe qual janela de cota estourou.
    expect(aviso.textContent).toMatch(/mais tarde/i);
    expect(aviso.textContent).not.toMatch(/Parte das sugestões não pôde ser obtida/);

    // As de data são calculadas aqui mesmo e continuam na tela.
    expect(screen.getAllByRole("article").length - 1).toBe(datasDoExemplo.length);
  });

  test("A exportação avisa que a cota acabou", async () => {
    mockarFetch({ exportQuota: true });
    montar();
    await importar();
    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toMatch(/limite de uso gratuito/i);
    // Sem prazo prometido: não se sabe qual janela de cota estourou.
    expect(aviso.textContent).toMatch(/mais tarde/i);
    expect(screen.getByRole("button", { name: /Baixar/ })).toHaveProperty(
      "disabled",
      false,
    );
  });
});

describe("Fidelidade ao design do shell", () => {
  const svgsDe = (elemento: Element) => elemento.querySelectorAll("svg");

  test("Os ícones do handoff estão nos seus lugares", async () => {
    mockarFetch();
    const { container } = montar();

    // Etapa 01: dropzone e navegação de etapa.
    expect(svgsDe(container.querySelector("[class*=dropzone]")!).length).toBe(1);
    expect(svgsDe(screen.getByRole("button", { name: "Voltar" })).length).toBe(1);
    expect(svgsDe(screen.getByRole("button", { name: "Avançar" })).length).toBe(1);

    await importar();
    // A confirmação da importação.
    expect(svgsDe(screen.getByText(/curriculo\.docx/)).length).toBe(1);

    // Etapa 04: legendas e botão de download.
    irPara(/4\. Exportar/);
    expect(svgsDe(screen.getByRole("button", { name: /Baixar/ })).length).toBe(1);
    for (const legenda of ["Idiomas", "Formatos"]) {
      expect(svgsDe(screen.getByText(legenda)).length, legenda).toBe(1);
    }
  });

  test("Ícone não vira rótulo de controle", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    // O nome acessível de cada controle é o seu texto; o ícone não é anunciado.
    for (const nome of ["Voltar", "Avançar", "Baixar 1 arquivo"]) {
      const controle = screen.getByRole("button", { name: nome });
      expect(controle.querySelector("svg")?.getAttribute("aria-hidden"), nome).toBe(
        "true",
      );
    }
  });

  test("Nenhuma cor fora do design system no shell", () => {
    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const caminho = join(dir, entrada.name);
        if (entrada.isDirectory()) varrer(caminho);
        else if (/\.(tsx?|css)$/.test(entrada.name) && !entrada.name.includes(".test."))
          arquivos.push(caminho);
      }
    };
    varrer(join(process.cwd(), "components", "shell"));
    varrer(join(process.cwd(), "components", "ui"));
    expect(arquivos.length).toBeGreaterThan(0);

    const literalDeCor = /#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/i;

    const infratores = arquivos.filter((arquivo) => {
      const fonte = readFileSync(arquivo, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      // Preto transparente é sombra, não cor de marca — o design system faz igual.
      return literalDeCor.test(fonte.replace(/rgb\(0 0 0 \/ [^)]*\)/g, ""));
    });

    expect(infratores).toEqual([]);
  });
});

describe("Coluna de conteúdo comum às etapas", () => {
  const cssDe = (pasta: string, arquivo: string) =>
    readFileSync(join(process.cwd(), "components", pasta, arquivo), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

  test("As etapas partilham a mesma coluna", () => {
    // A medida existe uma vez só.
    const shell = cssDe("shell", "Shell.module.css");
    const coluna = /\.stepColumn\s*{([^}]*)}/.exec(shell)?.[1] ?? "";
    expect(coluna).toMatch(/max-width:\s*920px/);
    expect(coluna).toMatch(/margin:\s*0 auto/);

    // E nenhuma etapa declara coluna própria.
    for (const [pasta, arquivo] of [
      ["update-intake", "UpdateIntake.module.css"],
      ["suggestion-review", "Review.module.css"],
      ["shell", "AnalysisProgress.module.css"],
      ["shell", "ExportComplete.module.css"],
    ] as const) {
      const css = cssDe(pasta, arquivo);
      const container = /\.(step|column)\s*{([^}]*)}/.exec(css)?.[2] ?? "";
      expect(container, arquivo).not.toMatch(/max-width/);
      expect(container, arquivo).not.toMatch(/padding/);
    }
  });

  test("O rodapé acompanha a coluna", () => {
    const shell = cssDe("shell", "Shell.module.css");
    const nav = /\.stepNav\s*{([^}]*)}/.exec(shell)?.[1] ?? "";

    // Centralizado e com a largura do conteúdo — 920 menos os dois recuos de 48.
    expect(nav).toMatch(/margin:\s*36px auto 48px/);
    expect(nav).toMatch(/max-width:\s*calc\(920px - 2 \* 48px\)/);
  });

  test("A revisão empilha currículo e sugestões", () => {
    const css = cssDe("suggestion-review", "Review.module.css");
    const grid = /\.grid\s*{([^}]*)}/.exec(css)?.[1] ?? "";

    // Uma coluna só: nada de `grid-template-columns` com duas faixas.
    expect(grid).not.toMatch(/grid-template-columns/);
    expect(grid).toMatch(/flex-direction:\s*column/);
  });
});

describe("A animação de entrada das etapas é desligável", () => {
  const cssDe = (pasta: string, arquivo: string) =>
    readFileSync(join(process.cwd(), "components", pasta, arquivo), "utf8");

  /** A consulta existe E anula a animação — não é uma regra qualquer. */
  const desligaMovimento = (css: string) =>
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/.test(css);

  /*
   * A animação de entrada é uma só, na coluna comum das etapas — então há um lugar só
   * onde desligá-la. O que cada etapa precisa garantir agora é não declarar uma segunda
   * por conta própria, que escaparia dessa regra.
   */
  const declaraAnimacaoDeEtapa = (css: string) => /animation:\s*stepIn/.test(css);

  test("Menos movimento, sem transição de etapa", () => {
    expect(desligaMovimento(cssDe("shell", "Shell.module.css"))).toBe(true);
    expect(
      declaraAnimacaoDeEtapa(cssDe("update-intake", "UpdateIntake.module.css")),
    ).toBe(false);
  });

  test("A revisão também obedece", () => {
    expect(desligaMovimento(cssDe("shell", "Shell.module.css"))).toBe(true);
    expect(declaraAnimacaoDeEtapa(cssDe("suggestion-review", "Review.module.css"))).toBe(
      false,
    );
  });
});

describe("Navegação entre as quatro etapas na tela", () => {
  test("A etapa atual é indicada na tela", async () => {
    mockarFetch();
    montar();

    expect(screen.getByRole("button", { name: /1\. Importar/ })).toHaveProperty(
      "ariaCurrent",
      "step",
    );

    await importar();
    irPara(/2\. Atualizar/);

    expect(screen.getByRole("button", { name: /2\. Atualizar/ })).toHaveProperty(
      "ariaCurrent",
      "step",
    );
  });

  test("Sem currículo, as etapas seguintes ficam indisponíveis", () => {
    mockarFetch();
    montar();

    for (const etapa of [/^2\./, /^3\./, /^4\./]) {
      expect(screen.getByRole("button", { name: etapa })).toHaveProperty(
        "disabled",
        true,
      );
    }
  });
});

describe("Progresso de importação por etapa nomeada", () => {
  test("Selecionar arquivo troca a dropzone pelo progresso", () => {
    mockarFetch();
    const { container } = montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    expect(container.querySelector("[class*=dropzone]")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  test("O checklist de importação nomeia as quatro etapas", () => {
    mockarFetch();
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });

    for (const etapa of [
      "Extrair texto",
      "Separar cabeçalho, experiências e formação",
      "Normalizar datas e cargos",
      "Marcar bullets sem métrica",
    ]) {
      // A legenda do cabeçalho repete o texto da etapa ativa — daí `getAllByText`.
      expect(screen.getAllByText(etapa).length, etapa).toBeGreaterThan(0);
    }
  });

  test("Concluída, a importação troca o progresso pela confirmação", async () => {
    mockarFetch();
    montar();
    await importar();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Currículo importado")).toBeTruthy();
  });

  test("Falha na importação oferece nova tentativa", async () => {
    mockarFetch({
      import: { ok: false, body: { error: { message: "Arquivo corrompido." } } },
    });
    montar();

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "ruim.pdf")] },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Arquivo corrompido."),
    );
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Enviar outro arquivo" }));

    expect(screen.getByLabelText("Selecionar arquivo")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Progresso de análise por etapa nomeada", () => {
  test("Avançar já entra em estado de análise", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    irPara(/3\. Revisar/);

    expect(screen.getByText("Revisando seu currículo")).toBeTruthy();
    expect(screen.getByRole("button", { name: /3\. Revisar/ })).toHaveProperty(
      "ariaCurrent",
      "step",
    );

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });

  test("O painel de revisão não aparece durante a análise", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    irPara(/3\. Revisar/);

    expect(screen.queryByText("Sugestões")).toBeNull();

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });

  test("O painel de revisão aparece quando a análise termina", async () => {
    mockarFetch();
    montar();
    await importar();

    irPara(/3\. Revisar/);
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());

    expect(screen.getByText("Sugestões")).toBeTruthy();
  });

  test("O checklist de análise nomeia as cinco etapas", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    irPara(/3\. Revisar/);

    for (const etapa of [
      "Ler versão importada",
      "Incorporar atualizações",
      "Procurar resultados sem número",
      "Checar datas sobrepostas e formatos",
      "Aplicar regras de leitura automática",
    ]) {
      expect(screen.getByText(etapa), etapa).toBeTruthy();
    }

    // Só os rótulos: nenhuma nota lateral de contagem ao lado das etapas.
    const itens = screen.getAllByRole("listitem");
    for (const item of itens) expect(item.textContent).not.toMatch(/\d/);

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });

  test("A etapa corrente é anunciada", async () => {
    const { promessa, soltar } = represa();
    mockarFetch({ segurar: promessa });
    montar();
    await importar();

    // Fake timers só depois do que já depende de tempo real (`waitFor` do import) —
    // misturar os dois trava o teste.
    vi.useFakeTimers();
    try {
      irPara(/3\. Revisar/);
      expect(screen.getByRole("status").textContent).toContain("Ler versão importada");

      await act(() => vi.advanceTimersByTimeAsync(620));
      expect(screen.getByRole("status").textContent).toContain("Incorporar atualizações");
    } finally {
      vi.useRealTimers();
    }

    soltar();
    await waitFor(() => expect(screen.getByText("Sugestões")).toBeTruthy());
  });
});

describe("Progresso de exportação por arquivo", () => {
  test("Clicar em baixar substitui o formulário pelo progresso", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    expect(screen.queryByLabelText("Português (BR)")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  });

  test("A lista de arquivos reflete a seleção do usuário", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByLabelText("English"));
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    expect(screen.getByText(/curriculo-marina-alencar-pt\.pdf/)).toBeTruthy();
    expect(screen.getByText(/resume-marina-alencar-en\.pdf/)).toBeTruthy();
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  });

  test("Só um arquivo está em andamento por vez", async () => {
    mockarFetch();
    const { container } = montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByLabelText("English"));
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    const ativos = container.querySelectorAll('[class*="active"]');
    expect(ativos.length).toBe(1);

    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  });

  test("O rótulo do botão de download conta a seleção", async () => {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);

    expect(screen.getByRole("button", { name: /Baixar 1 arquivo/ })).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Português (BR)"));
    expect(
      screen.getByRole("button", { name: /Selecione idioma e formato/ }),
    ).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByLabelText("Português (BR)"));
    fireEvent.click(screen.getByLabelText("English"));
    expect(screen.getByRole("button", { name: /Baixar 2 arquivos/ })).toBeTruthy();
  });

  test("Falha na exportação oferece nova tentativa", async () => {
    mockarFetch({ exportReject: true });
    montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Não foi possível gerar os arquivos. Tente novamente.",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(screen.getByRole("button", { name: /Baixar/ })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  /**
   * A causa mais comum de nenhuma saída ser gerada é a mesma da cota esgotada — um limite
   * da IA, não um defeito do app. O aviso usa o mesmo tom âmbar, não o roxo de falha.
   */
  test("Nenhum arquivo gerado usa o tom de atenção", async () => {
    mockarFetch({ exportNoOutput: true });
    montar();
    await importar();
    irPara(/4\. Exportar/);

    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));

    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toContain("Nenhum arquivo foi gerado.");
    expect(aviso.className).toContain("warning");
    expect(aviso.className).not.toContain("notice");

    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
  });
});

describe("Conclusão da exportação", () => {
  async function exportar() {
    mockarFetch();
    montar();
    await importar();
    irPara(/4\. Exportar/);
    fireEvent.click(screen.getByRole("button", { name: /Baixar/ }));
    await waitFor(() => expect(enviadoParaExport).toHaveLength(1));
  }

  test("A conclusão substitui form e progresso", async () => {
    await exportar();

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByLabelText("Português (BR)")).toBeNull();
    expect(screen.getByText("Currículo exportado")).toBeTruthy();
  });

  test("A conclusão lista os arquivos gerados", async () => {
    await exportar();

    expect(screen.getByText(/curriculo-marina-alencar-pt\.pdf/)).toBeTruthy();
  });

  test("Baixar de novo repete a geração", async () => {
    await exportar();

    fireEvent.click(screen.getByRole("button", { name: "Baixar de novo" }));

    await waitFor(() => expect(enviadoParaExport).toHaveLength(2));
  });

  test("Começar um novo currículo reseta o fluxo", async () => {
    await exportar();

    fireEvent.click(screen.getByRole("button", { name: "Começar um novo currículo" }));

    expect(screen.getByRole("button", { name: /1\. Importar/ })).toHaveProperty(
      "ariaCurrent",
      "step",
    );
    expect(screen.getByLabelText("Selecionar arquivo")).toBeTruthy();
    expect(screen.queryByText("Currículo importado")).toBeNull();
  });
});

describe("Acessibilidade do progresso", () => {
  const cssDe = (arquivo: string) =>
    readFileSync(join(process.cwd(), "components", "ui", arquivo), "utf8");
  const cssDeShell = (arquivo: string) =>
    readFileSync(join(process.cwd(), "components", "shell", arquivo), "utf8");

  const desligaMovimento = (css: string) =>
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/.test(css);

  test("Redução de movimento desliga spinner e shimmer sem esconder o texto", () => {
    // O texto da etapa nunca depende da animação: o ícone em andamento do checklist e o
    // shimmer do skeleton de análise desligam, o rótulo continua.
    expect(desligaMovimento(cssDe("StageChecklist.module.css"))).toBe(true);
    expect(desligaMovimento(cssDeShell("AnalysisProgress.module.css"))).toBe(true);
  });

  test("Um único indicador de carregamento por cartão", () => {
    // O cabeçalho não repete a animação do ícone "em andamento" do checklist num
    // spinner à parte — cada cartão tem exatamente um elemento animado.
    for (const arquivo of [
      "ExportProgress.module.css",
      "ImportProgress.module.css",
      "AnalysisProgress.module.css",
    ]) {
      expect(cssDeShell(arquivo)).not.toContain("spinner");
    }
  });
});
