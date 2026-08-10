## Context

Ver `proposal.md` — Why. Hoje as três operações usam `WaitNotice`
(`components/ui/Notice.tsx`) e booleanos locais (`carregando` em `ImportStep.tsx`,
`carregandoSugestoes` em `AppShell.tsx`, `gerando` em `ExportStep.tsx`), sem noção de
etapa. Não existe tela de conclusão de exportação. `components/shell/state.ts` é o único
lugar hoje com estado que sobrevive a navegar entre etapas (`FlowState`); os booleanos de
loading das etapas 01/03/04 são locais. `lib/export/filename.ts` já produz os nomes reais
de download (`curriculo-<nome>-pt.pdf`, `resume-<nome>-en.docx`) reaproveitados pela lista
de arquivos do progresso de exportação e pela tela de conclusão.

## Goals / Non-Goals

**Goals:**
- Um contrato único de máquina de estados (`idle | running | done | error` + etapa
  nomeada) reusado pelas três operações, para que qualquer uma delas saiba, a qualquer
  momento, qual etapa nomeada está ativa.
- Um timer simulado (~620ms/etapa) cuja interface de consumo (nome da etapa, índice) não
  muda quando a implementação real (SSE/polling/stream) substituir o timer — só a fonte do
  avanço muda.
- Reaproveitar o lugar onde cada operação hoje guarda seu estado (`ImportStep`/
  `ExportStep` local, `AppShell` para a análise), acrescentando só o que falta:
  `FlowState.exportCompletion` para a tela de conclusão sobreviver a ir e voltar entre a
  etapa 03 e a 04.

**Non-Goals:**
- Instrumentar progresso real no backend (`app/api/resume-import`, `/api/suggestions/*`,
  `/api/export`) — fica para uma change futura que reusa o contrato de nomes de etapa
  definido aqui.
- Mudar o conteúdo do formulário de exportação (idiomas/formatos/garantias) além do
  momento em que ele sai/entra de tela.

## Decisions

**Máquina de estados compartilhada em `lib/progress/state.ts`**, não uma por operação:

    type ProgressMode = "idle" | "running" | "done" | "error";

    type ProgressState<Stage extends string> = {
      mode: ProgressMode;
      stageIndex: number;       // válido quando mode === "running"
      stages: readonly Stage[]; // nomes fixos da operação, na ordem
      error: string | null;     // presente quando mode === "error"
    };

Um hook `useProgress<Stage>(stages, { intervalMs = 620 }): [ProgressState<Stage>, actions]`
concentra o timer simulado, o cancelamento e a limpeza, com `actions.start()`,
`actions.fail(message)`, `actions.reset()`. `start()` sempre cancela um timer anterior
antes de ligar o novo — cobre tanto "nova operação enquanto uma está rodando" quanto
"start chamado duas vezes". Um `useEffect` de limpeza no unmount cobre o cancelamento por
desmontagem. Ao alcançar a última etapa, o hook marca `mode: "done"` e para o timer
sozinho.

Alternativa considerada: um hook por operação (`useImportProgress`,
`useAnalysisProgress`, `useExportProgress`). Rejeitada — duplicaria a lógica de
timer/cancelamento três vezes; a única coisa que muda entre operações é a lista de nomes
de etapa, que já é um parâmetro.

**Contrato de nomes = contrato entre protótipo e produção.** O hook não sabe se o avanço
de etapa vem de `setInterval` ou de um evento de SSE; ele só expõe `stageIndex`/`stages`.
Trocar o timer simulado por consumo de stream é trocar a implementação *interna* do hook
(ou substituí-lo por outro com a mesma superfície), sem tocar em
`ImportProgress.tsx`/`AnalysisProgress.tsx`/`ExportProgress.tsx`, que só leem
`state.stageIndex`, `state.mode`, `state.stages`.

**Onde o estado mora:**
- Import (etapa 01) e exportação (etapa 04): estado local do componente
  (`ImportStep.tsx`, `ExportStep.tsx`), como hoje `carregando`/`gerando` — a operação não
  precisa sobreviver a navegar para outra etapa.
- Análise (transição 02→03): sobe para `AppShell.tsx`, porque já é onde
  `carregandoSugestoes` mora hoje — o gate `reviewReady` e o bloqueio de navegação
  dependem do shell saber o estado da análise, igual já acontece.
- Tela de conclusão da exportação: único estado novo que precisa sobreviver a mais que um
  render — "ajustar e exportar outra versão" volta para a etapa 03 e pode voltar depois
  para a 04, e nesse ponto o formulário (não a conclusão) deve reaparecer. Isso é
  navegação entre etapas, que hoje só o shell registra. `FlowState` ganha um campo
  `exportCompletion: { files: string[] } | null` em `state.ts`, com helpers
  `withExportCompletion`/`clearExportCompletion`, consistente com o padrão existente do
  módulo (estado do fluxo mora em `state.ts`, puro e testado por unidade). `goTo`/`next`/
  `back` para fora da etapa 04 SHALL limpar `exportCompletion`.

**Primitivos novos em `components/ui`** (nenhum existe hoje: `index.tsx` só tem `Button`,
`Card`, `Field`, `TextArea`, `Checkbox`, `Chip`, `Modal`):
- `Spinner.tsx` — `border: 2px solid #3f424d; border-top-color: #9184d9; border-radius:
  50%; animation: spin 0.7s linear infinite`, tamanho por prop (22px import, 26px análise,
  20px exportação); `animation: none` sob `prefers-reduced-motion: reduce`.
- `SegmentedProgress.tsx` — `total` (10, fixo na etapa 01) e `filled` (derivado de
  `stageIndex`/`stages.length`); só usado no cartão de importação.
- `StageChecklist.tsx` — lista de `{ label, state: "done"|"active"|"pending", note?:
  string }`; nota opcional (ausente na importação, presente na análise).

**Componentes de tela em `components/shell`**: `ImportProgress.tsx` (substitui
`carregando ? <WaitNotice/> : <dropzone/>`), `AnalysisProgress.tsx` (substitui o
`WaitNotice` que `AppShell.tsx` renderiza durante `carregandoSugestoes`),
`ExportProgress.tsx` (substitui o `WaitNotice` de `ExportStep.tsx`; quando `gerando` é
true o restante do formulário para de renderizar, não só fica desabilitado),
`ExportComplete.tsx` (a partir de `exportCompletion.files`, usando `resumeFileName` de
`lib/export/filename.ts` para os nomes reais).

**i18n**: chaves novas em `lib/i18n/dictionary.ts`, padrão `wait.*`/`step1.*` existente,
adicionadas em `pt` e `en` (o tipo `Dictionary`, derivado de `typeof pt`, força paridade
por erro de compilação): `progress.*` (títulos/legendas/etapas de import e análise,
títulos de erro e retry por operação) e `exportComplete.*` (título, agradecimento, blocos,
rótulos das três ações). `t.step1.loading`/`t.step1.tryAgain`, hoje sem uso, são
candidatos a reaproveitar como legenda de fallback e rótulo de retry da importação — a
decidir na implementação.

## Risks / Trade-offs

- [Timer simulado a 620ms pode não bater com a duração real de nenhuma operação
  (22–103s medidos)] → Aceito por design: o protótipo não promete tempo, só nomeia
  etapas; a UI não muda quando o timer for trocado por progresso real, então o
  descompasso de timing não é visível ao usuário como uma promessa quebrada.
- [`FlowState.exportCompletion` é o primeiro estado de tela (não de dado de currículo) a
  entrar em `state.ts`] → Aceito porque é o único estado desta change que precisa
  sobreviver a navegação; mantê-lo fora de `state.ts` obrigaria a duplicar a lógica de
  "limpar ao sair da etapa 04" em outro lugar.
- [Migrar os três `WaitNotice` para os novos cartões pode deixar `WaitNotice` órfão] →
  Se as três migrações cobrirem os únicos usos, `WaitNotice` é removido nesta mesma change
  (task de limpeza); se sobrar algum uso sem etapas nomeadas, ele permanece e seu
  comentário interno é atualizado para refletir que a proibição de barra de progresso
  passou a ser "não estimar tempo", não "nunca mostrar progresso".
