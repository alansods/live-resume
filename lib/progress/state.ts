"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Máquina de estados compartilhada pelas três operações assíncronas do fluxo (importar,
 * analisar, exportar).
 *
 * O timer avança a etapa nomeada corrente a cada `intervalMs`, mas para na última — ele
 * não promete que a operação terminou, só que não há mais etapa seguinte para nomear. Quem
 * sabe que a operação real terminou é quem chamou `start()`: quando a chamada de verdade
 * resolve, ele chama `finish()`; quando falha, `fail(mensagem)`. É essa separação que
 * mantém o contrato de nomes de etapa válido tanto para o timer simulado (protótipo) quanto
 * para um evento real de SSE/polling/stream (implementação futura) — nenhum dos dois
 * precisa saber do outro.
 */

export type ProgressMode = "idle" | "running" | "done" | "error";

export type ProgressState<Stage extends string> = {
  mode: ProgressMode;
  /** Válido quando `mode` é `running` ou `done`. */
  stageIndex: number;
  stages: readonly Stage[];
  error: string | null;
};

export type ProgressActions = {
  /** Começa a operação. Cancela um timer anterior, se houver um ainda rodando. */
  start: () => void;
  /** A operação real terminou com sucesso. */
  finish: () => void;
  /** A operação real falhou. */
  fail: (message: string) => void;
  /** Volta ao estado inicial — usado por "tentar de novo". */
  reset: () => void;
};

function estadoInicial<Stage extends string>(
  stages: readonly Stage[],
): ProgressState<Stage> {
  return { mode: "idle", stageIndex: 0, stages, error: null };
}

export function useProgress<Stage extends string>(
  stages: readonly Stage[],
  { intervalMs = 620 }: { intervalMs?: number } = {},
): readonly [ProgressState<Stage>, ProgressActions] {
  const [state, setState] = useState<ProgressState<Stage>>(() => estadoInicial(stages));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const parar = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    parar();
    setState({ mode: "running", stageIndex: 0, stages, error: null });
    timer.current = setInterval(() => {
      setState((atual) => {
        if (atual.mode !== "running") return atual;
        const proxima = Math.min(atual.stageIndex + 1, atual.stages.length - 1);
        return { ...atual, stageIndex: proxima };
      });
    }, intervalMs);
  }, [parar, stages, intervalMs]);

  const finish = useCallback(() => {
    parar();
    setState((atual) => ({
      ...atual,
      mode: "done",
      stageIndex: atual.stages.length - 1,
    }));
  }, [parar]);

  const fail = useCallback(
    (message: string) => {
      parar();
      setState((atual) => ({ ...atual, mode: "error", error: message }));
    },
    [parar],
  );

  const reset = useCallback(() => {
    parar();
    setState(estadoInicial(stages));
  }, [parar, stages]);

  // Desmontar limpa o timer — sem intervalo pendente depois disso.
  useEffect(() => parar, [parar]);

  return [state, { start, finish, fail, reset }] as const;
}
