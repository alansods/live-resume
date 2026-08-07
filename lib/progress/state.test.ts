// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useProgress } from "./state";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ETAPAS = ["a", "b", "c"] as const;

describe("A etapa ativa é sempre conhecida", () => {
  test("A etapa ativa é sempre conhecida", () => {
    const { result } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());

    expect(result.current[0].mode).toBe("running");
    expect(result.current[0].stages[result.current[0].stageIndex]).toBe("a");
  });
});

describe("Concluída, a operação sai do modo de execução", () => {
  test("Concluída, a operação sai do modo de execução", () => {
    const { result } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());
    act(() => result.current[1].finish());

    expect(result.current[0].mode).toBe("done");
    expect(result.current[0].stageIndex).toBe(ETAPAS.length - 1);
  });
});

describe("Etapas avançam sozinhas no protótipo", () => {
  test("Etapas avançam sozinhas no protótipo", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());
    expect(result.current[0].stageIndex).toBe(0);

    act(() => vi.advanceTimersByTime(620));
    expect(result.current[0].stageIndex).toBe(1);

    act(() => vi.advanceTimersByTime(620));
    expect(result.current[0].stageIndex).toBe(2);

    // Não passa da última: o timer não inventa uma etapa que não existe.
    act(() => vi.advanceTimersByTime(620 * 5));
    expect(result.current[0].stageIndex).toBe(2);
    expect(result.current[0].mode).toBe("running");
  });
});

describe("Nova operação cancela a anterior", () => {
  test("Nova operação cancela a anterior", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());
    act(() => vi.advanceTimersByTime(620 * 2));
    expect(result.current[0].stageIndex).toBe(2);

    act(() => result.current[1].start());
    expect(result.current[0].stageIndex).toBe(0);
    expect(result.current[0].mode).toBe("running");
  });
});

describe("Desmontar limpa o timer", () => {
  test("Desmontar limpa o timer", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());
    unmount();

    // Sem assinante para observar, mas o timer não deve seguir rodando: nenhuma
    // exceção nem chamada de setState fora de componente montado.
    expect(() => vi.advanceTimersByTime(620 * 10)).not.toThrow();
  });
});

describe("Erro por operação", () => {
  test("fail() troca o modo e guarda a mensagem", () => {
    const { result } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());
    act(() => result.current[1].fail("deu errado"));

    expect(result.current[0].mode).toBe("error");
    expect(result.current[0].error).toBe("deu errado");
  });

  test("reset() volta ao estado inicial", () => {
    const { result } = renderHook(() => useProgress(ETAPAS));

    act(() => result.current[1].start());
    act(() => result.current[1].fail("deu errado"));
    act(() => result.current[1].reset());

    expect(result.current[0]).toEqual({
      mode: "idle",
      stageIndex: 0,
      stages: ETAPAS,
      error: null,
    });
  });
});
