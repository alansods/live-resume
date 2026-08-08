"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  DownloadSimple,
  FileArrowUp,
  ListChecks,
  PencilSimple,
} from "@phosphor-icons/react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { SuggestionReview } from "@/components/suggestion-review/SuggestionReview";
import { Button } from "@/components/ui";
import { FailureNotice, WarningNotice } from "@/components/ui/Notice";
import { TopBar } from "@/components/ui/TopBar";
import { UpdateIntake } from "@/components/update-intake/UpdateIntake";
import { useT } from "@/lib/i18n/context";
import { useProgress } from "@/lib/progress/state";
import { serializeResume } from "@/lib/resume/serialize";
import { atsScore } from "@/lib/suggestions/ats";
import { suggestDates } from "@/lib/suggestions/dates";
import { SuggestionSchema, type Suggestion } from "@/lib/suggestions/model";
import { ANALYSIS_STAGES, AnalysisProgress } from "./AnalysisProgress";
import { ExportComplete } from "./ExportComplete";
import { ExportStep } from "./ExportStep";
import { ImportStep } from "./ImportStep";
import {
  back,
  canGoBack,
  canGoNext,
  canGoTo,
  clearExportCompletion,
  goTo,
  initialFlowState,
  next,
  selectedPatches,
  steps,
  toggleFormat,
  toggleLocale,
  withExportCompletion,
  withIntake,
  withResume,
  withSelection,
  withSuggestions,
  workingLeftovers,
  workingResume,
  type Step,
  type SuggestionsFailure,
} from "./state";
import styles from "./Shell.module.css";

/**
 * O shell: top bar, stepper de etapas e a etapa atual.
 *
 * É o único lugar do app que conhece `fetch`. As quatro etapas recebem tudo por props e
 * não buscam nada — foi decisão das changes delas, e é o que permitiu montar as etapas 02
 * e 03 aqui sem alterar uma linha.
 *
 * Navegar não descarta nada: o estado vive aqui. Só recarregar a página zera, porque não
 * há storage — o arquivo do usuário é descartado, e isso é regra de produto.
 */

const ROTULO_DA_ETAPA = ["step1", "step2", "step3", "step4"] as const;

/**
 * O ícone de cada etapa, na ordem delas. A etapa cumprida troca o seu pelo check — o que
 * o círculo diz ali já não é "o que se faz aqui", é "isto já passou".
 */
const ICONE_DA_ETAPA = [FileArrowUp, PencilSimple, ListChecks, DownloadSimple] as const;

export function AppShell() {
  const t = useT();
  const [state, setState] = useState(initialFlowState);
  const [analise, analiseAcoes] = useProgress(ANALYSIS_STAGES);
  const carregandoSugestoes = analise.mode === "running";
  const [repetirExportacao, setRepetirExportacao] = useState(false);

  /**
   * As sugestões são pedidas ao ENTRAR na revisão, uma vez. Pedir antes produziria
   * sugestões para um currículo que a etapa 02 ainda pode mudar.
   *
   * O que vai é o currículo EM TRABALHO — o importado com o que o usuário digitou —, e
   * junto dele o que ele digitou e não virou item, como material para conferir os
   * números que a IA propõe.
   *
   * São três origens. As de data saem de `suggestDates`, que é aritmética de calendário:
   * roda aqui mesmo, sem rota e sem espera — e, por não passar pelo caminho que pode
   * cair, é o que sobra na tela quando a IA falha. Elas entram primeiro no conjunto
   * porque são as únicas garantidas, e a numeração dos marcadores segue a ordem dele.
   */
  async function irPara(destino: Step) {
    const proximo = goTo(state, destino);
    setState(proximo);

    const emTrabalho = workingResume(proximo);
    if (destino !== 3 || proximo.suggestions !== null || emTrabalho === null) return;
    if (carregandoSugestoes) return;

    analiseAcoes.start();

    // Determinístico e local: já está pronto antes de a primeira requisição sair.
    const datas = suggestDates(emTrabalho);
    const lidas: Suggestion[] = [...datas.suggestions];
    let faltou: SuggestionsFailure = null;

    try {
      const sobras = workingLeftovers(proximo);
      const corpo = JSON.stringify({
        resume: JSON.parse(serializeResume(emTrabalho)),
        extraUserText: sobras,
      });
      const cabecalhos = { "content-type": "application/json" };

      // `allSettled`: uma rota que cai não pode levar junto o que a outra devolveu.
      const respostas = await Promise.allSettled([
        fetch("/api/suggestions/metrics", {
          method: "POST",
          headers: cabecalhos,
          body: corpo,
        }),
        fetch("/api/suggestions/ats", {
          method: "POST",
          headers: cabecalhos,
          body: corpo,
        }),
      ]);

      for (const resposta of respostas) {
        if (resposta.status !== "fulfilled" || !resposta.value.ok) {
          // Rota que não respondeu é uma parte do conjunto que faltou, e o usuário
          // precisa saber — a tela tem conteúdo e parece completa.
          //
          // Cota esgotada prevalece sobre "faltou uma parte": as duas rotas gastam da
          // mesma cota, e "entre de novo na etapa para tentar o resto" é o conselho
          // errado quando o limite do dia acabou.
          faltou =
            resposta.status === "fulfilled" && resposta.value.status === 429
              ? "quota"
              : (faltou ?? "partial");
          continue;
        }
        try {
          const dados = await resposta.value.json();
          for (const bruta of dados.suggestions ?? []) {
            const validada = SuggestionSchema.safeParse(bruta);
            if (validada.success) lidas.push(validada.data);
          }
        } catch {
          // Corpo ilegível é uma rota a menos, não a revisão inteira.
          faltou = faltou ?? "partial";
        }
      }
    } catch {
      // Falha catastrófica antes mesmo de chamar as rotas (ex.: currículo não
      // serializável) — não é o "faltou uma parte" que as rotas tratam sozinhas.
      analiseAcoes.fail(t.failure.analysisFailed);
      return;
    }

    // O aviso é específico: só sobe quando o app INFERIU um mês, nunca quando ele o
    // derivou de uma data que o próprio usuário escreveu.
    setState((atual) => withSuggestions(atual, lidas, datas.requiresDisclosure, faltou));
    analiseAcoes.finish();
  }

  /**
   * As etapas ficam **montadas** e só são escondidas.
   *
   * Cada uma guarda o próprio estado — os itens digitados na etapa 02, as marcações na
   * 03 —, e desmontar ao navegar apagaria os dois. Esconder preserva sem que nenhuma
   * delas precise ganhar prop de estado inicial: o encaixe é do shell, não delas.
   *
   * `hidden` (e não `display: none` no CSS) porque ele também tira o conteúdo da árvore
   * de acessibilidade: leitor de tela e teste enxergam só a etapa atual.
   */
  const etapa = (numero: Step, filho: React.ReactNode) => (
    <div hidden={state.step !== numero} key={numero}>
      {filho}
    </div>
  );

  // Estável: a etapa 02 emite dentro de um efeito, e um callback recriado a cada render
  // do shell viraria laço.
  const receberIntake = useCallback(
    (content: Parameters<typeof withIntake>[1]) =>
      setState((atual) => withIntake(atual, content)),
    [],
  );

  /**
   * O currículo em trabalho é derivado, não guardado: refazê-lo a partir do importado é
   * o que faz "voltar à etapa 02 e editar" recompor em vez de acumular.
   */
  const emTrabalho = useMemo(() => workingResume(state), [state]);

  // `reviewReady`: o painel de revisão só monta quando a análise realmente terminou —
  // nem enquanto ela roda, nem quando falhou. Não depende de `state.step`: a etapa 03
  // fica montada (só escondida) quando o usuário navega para outra etapa, e o painel
  // precisa continuar montado ali dentro para não perder o que foi marcado.
  const reviewReady = analise.mode === "done";

  /**
   * A nota de ATS do chip da top bar. `null` enquanto não há sugestões: sem elas a conta
   * daria 100 — nada pendente —, e anunciar nota cheia a um currículo que ainda não foi
   * analisado seria dizer o contrário do que se sabe.
   */
  const pontuacao =
    state.suggestions === null
      ? null
      : atsScore(state.suggestions, new Set(state.selected));

  const conteudo = () => (
    <>
      {etapa(
        1,
        <ImportStep
          fileName={state.fileName}
          onImported={(resume, fileName, report) =>
            setState((atual) => withResume(atual, resume, fileName, report))
          }
        />,
      )}

      {emTrabalho !== null ? (
        <>
          {etapa(2, (
            <>
              <UpdateIntake onChange={receberIntake} />
              {!state.intakeValid ? (
                <div className={styles.waiting}>
                  <WarningNotice>{t.step2.blocked}</WarningNotice>
                </div>
              ) : null}
            </>
          ))}
          {etapa(
            3,
            analise.mode === "running" ? (
              <AnalysisProgress state={analise} />
            ) : analise.mode === "error" ? (
              <div className={styles.waiting}>
                <FailureNotice>{analise.error}</FailureNotice>
                <Button variant="secondary" onClick={() => void irPara(3)}>
                  {t.progress.retry}
                </Button>
              </div>
            ) : reviewReady ? (
              <>
                {state.suggestionsFailure !== null ? (
                  <div className={styles.waiting}>
                    {/* Cota é limite alcançado, tom de atenção; o resto é chamada que
                        falhou de verdade, e continua no tom de falha. */}
                    {state.suggestionsFailure === "quota" ? (
                      <WarningNotice>{t.failure.quotaSuggestions}</WarningNotice>
                    ) : (
                      <FailureNotice>{t.wait.partialSuggestions}</FailureNotice>
                    )}
                  </div>
                ) : null}
                <SuggestionReview
                  resume={emTrabalho}
                  suggestions={state.suggestions ?? []}
                  requiresDateNotice={state.requiresDateNotice}
                  onSelectionChange={(selected) =>
                    setState((atual) => withSelection(atual, selected))
                  }
                />
              </>
            ) : null,
          )}
          {etapa(
            4,
            state.exportCompletion !== null ? (
              <ExportComplete
                files={state.exportCompletion.files}
                partialFailure={state.exportCompletion.partialFailure}
                onDownloadAgain={() => {
                  setRepetirExportacao(true);
                  setState((atual) => clearExportCompletion(atual));
                }}
                onStartOver={() => setState(initialFlowState)}
              />
            ) : (
              <ExportStep
                resume={emTrabalho}
                patches={selectedPatches(state)}
                locales={state.locales}
                formats={state.formats}
                onToggleLocale={(idioma) =>
                  setState((atual) => toggleLocale(atual, idioma))
                }
                onToggleFormat={(formato) =>
                  setState((atual) => toggleFormat(atual, formato))
                }
                onExported={(files, partialFailure) => {
                  setRepetirExportacao(false);
                  setState((atual) => withExportCompletion(atual, files, partialFailure));
                }}
                autoStart={repetirExportacao}
              />
            ),
          )}
        </>
      ) : null}
    </>
  );

  return (
    <div className={styles.app}>
      <TopBar backHref="/" atsScore={pontuacao} />

      {/*
        O stepper: quatro passos em linha, no topo do conteúdo e na largura dele.
        Todos são clicáveis — a trava de quais se pode abrir é `canGoTo`, não a posição.
      */}
      <nav className={styles.stepper} aria-label={t.shell.stepsTitle}>
        <div className={styles.stepperRow}>
          {steps.map((numero) => {
            const atual = state.step === numero;
            const cumprida = numero < state.step;
            const Icone = ICONE_DA_ETAPA[numero - 1];

            return (
              <Fragment key={numero}>
                {/*
                  O conector que CHEGA neste passo. Só fica verde quando os dois lados já
                  passaram: o que chega no passo atual é caminho em curso, não percorrido.
                */}
                {numero > 1 ? (
                  <span
                    className={state.step > numero ? styles.linkDone : styles.link}
                    aria-hidden
                  />
                ) : null}

                <button
                  type="button"
                  className={styles.step}
                  aria-current={atual ? "step" : undefined}
                  disabled={!canGoTo(state, numero) || carregandoSugestoes}
                  onClick={() => void irPara(numero)}
                >
                  <span
                    className={
                      cumprida
                        ? styles.circleDone
                        : atual
                          ? styles.circleOn
                          : styles.circle
                    }
                  >
                    {cumprida ? (
                      <Check size={14} aria-hidden />
                    ) : (
                      <Icone size={14} aria-hidden />
                    )}
                  </span>
                  <span
                    className={
                      atual
                        ? styles.stepLabelOn
                        : cumprida
                          ? styles.stepLabelDone
                          : styles.stepLabel
                    }
                  >
                    {numero}. {t.shell[ROTULO_DA_ETAPA[numero - 1]]}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </nav>

      <main className={styles.content}>
        {conteudo()}

        <div className={styles.stepNav}>
          <button
            type="button"
            className={styles.navBack}
            disabled={!canGoBack(state) || carregandoSugestoes}
            onClick={() => setState(back(state))}
          >
            <ArrowLeft size={13} aria-hidden />
            {t.shell.back}
          </button>
          <button
            type="button"
            className={styles.navNext}
            disabled={!canGoNext(state) || carregandoSugestoes}
            onClick={() => void irPara(next(state).step)}
          >
            {t.shell.next}
            <ArrowRight size={13} aria-hidden />
          </button>
        </div>
      </main>
    </div>
  );
}
