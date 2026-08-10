// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import { LocaleProvider } from "@/lib/i18n/context";
import { AppShell } from "./AppShell";

/**
 * Falha catastrófica da análise: algo quebra antes mesmo de chamar as rotas de
 * sugestão (ex.: o currículo em trabalho não serializa). É diferente de "faltou uma
 * parte" — aquilo a revisão mostra com conteúdo incompleto; isto aqui não chega a
 * abrir a revisão. `serializeResume` é mockado para lançar só neste arquivo, porque
 * é o único jeito de provocar essa falha sem depender de um currículo real quebrado.
 */
vi.mock("@/lib/resume/serialize", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/resume/serialize")>();
  return {
    ...real,
    serializeResume: vi.fn(() => {
      throw new Error("não serializa");
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockarImportacao() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/resume-import") {
      // O mock de importação não passa pelo `serializeResume` mockado: o corpo é
      // montado direto a partir do fixture serializado ANTES do mock ser aplicado
      // ao módulo (o `vi.mock` acima só afeta chamadas feitas pelo `AppShell`).
      return {
        ok: true,
        json: async () => ({ resume: importedResumeSerializado }),
      } as unknown as Response;
    }
    throw new Error(`Rota inesperada: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
}

// Serializado com a implementação real, antes do mock trocar o módulo por um que lança.
const { serializeResume: serializeResumeReal } = await vi.importActual<
  typeof import("@/lib/resume/serialize")
>("@/lib/resume/serialize");
const importedResumeSerializado = JSON.parse(serializeResumeReal(importedResume));

describe("Falha na análise oferece nova tentativa", () => {
  test("Falha na análise oferece nova tentativa", async () => {
    mockarImportacao();
    // Simula "já pagou": este teste cobre a falha da análise, não o gate de pagamento.
    window.history.pushState({}, "", "/?paid_session=sessao-de-teste");
    render(
      <LocaleProvider initialLocale="pt">
        <AppShell />
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByLabelText("Selecionar arquivo"), {
      target: { files: [new File(["x"], "curriculo.docx")] },
    });
    await waitFor(() => expect(screen.getByText("Currículo importado")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /3\. Revisar/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Não foi possível analisar o currículo. Tente novamente.",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    // Falhou de novo — mas a ação de tentar de novo reiniciou a operação do zero.
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Não foi possível analisar o currículo. Tente novamente.",
      ),
    );
  });
});
