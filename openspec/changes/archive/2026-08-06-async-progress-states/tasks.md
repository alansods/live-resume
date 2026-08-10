Nota sobre critério de aceite visual: não existe `.dc.html` para as quatro telas desta
change (ver `proposal.md` — Impact, "Referência de design"). O critério visual de cada
task de UI abaixo compara contra os valores especificados nesta própria change (medidas,
cores, raios, tempos), não contra um handoff `.dc.html` existente.

## 1. Máquina de estados e timer simulado compartilhados

- [x] 1.1 Criar `lib/progress/state.ts`: `ProgressState<Stage>`
      (`idle|running|done|error` + `stageIndex` + `stages` + `error`) e o hook
      `useProgress<Stage>(stages, { intervalMs = 620 })` com `start()`/`fail()`/`reset()`,
      timer ~620ms/etapa, cancelamento do timer anterior ao chamar `start()` de novo, e
      limpeza no unmount.
      **Aceite**: cenários "A etapa ativa é sempre conhecida", "Concluída, a operação sai
      do modo de execução", "Etapas avançam sozinhas no protótipo", "Nova operação
      cancela a anterior", "Desmontar limpa o timer" (`async-progress-states`). Teste:
      `lib/progress/state.test.ts` com `vi.useFakeTimers()`.

## 2. Primitivos de UI

- [x] 2.1 `components/ui/Spinner.tsx`: `border:2px solid #3f424d;
      border-top-color:#9184d9; border-radius:50%; animation: spin 0.7s linear infinite`;
      tamanho por prop (22px import, 26px análise, 20px exportação); `animation:none` sob
      `prefers-reduced-motion: reduce`.
      **Aceite visual**: raio/cores/duração exatos acima, nos três tamanhos usados.
- [x] 2.2 `components/ui/SegmentedProgress.tsx`: 10 segmentos
      `flex:1;height:4px;border-radius:2px`, gap 3px, preenchido `#9184d9`, vazio
      `#3f424d`, preenchimento proporcional a `stageIndex/stages.length`.
      **Aceite visual**: nunca uma barra contínua de largura variável. Aceite funcional:
      cenário "O aviso não estima tempo" (`app-shell-navigation`) — a barra não representa
      tempo, só etapas concluídas.
- [x] 2.3 `components/ui/StageChecklist.tsx`: itens `{label, state, note?}`; ícones
      `check-circle` `#b5abfc` (done), `circle-notch` `#9184d9` girando (active), `circle`
      `#595d6c` (pending); texto `#e9e9ed` (done/active) / `#75798c` (pending); nota
      lateral opcional.
      **Aceite**: cenários "O checklist de importação nomeia as quatro etapas", "O
      checklist de análise nomeia as cinco etapas com contagem" (`async-progress-states`).
- [x] 2.4 Exportar os três primitivos em `components/ui/index.tsx`.

## 3. Progresso de importação (etapa 01)

- [x] 3.1 `components/shell/ImportProgress.tsx`: cartão
      `border:1px solid rgba(233,233,237,0.12); border-radius:14px; padding:34px 36px;
      background:#1c1e2b; gap:20px`; cabeçalho com `Spinner` 22px, nome do arquivo 14px,
      legenda 12px com a etapa atual, percentual à direita; `SegmentedProgress`;
      `StageChecklist` com as 4 etapas (extrair texto, separar
      cabeçalho/experiências/formação, normalizar datas e cargos, marcar bullets sem
      métrica).
      **Aceite**: cenário "O checklist de importação nomeia as quatro etapas".
- [x] 3.2 Ligar em `components/shell/ImportStep.tsx`: ao selecionar/soltar arquivo, a
      dropzone sai do DOM (não fica `disabled`) e `ImportProgress` entra no lugar.
      **Aceite**: cenário "Selecionar arquivo troca a dropzone pelo progresso" — teste
      verificando ausência da dropzone no DOM, não só `disabled`.
- [x] 3.3 Ao concluir a quarta etapa, `ImportProgress` sai e entram o cartão de arquivo
      importado + campo de área de atuação.
      **Aceite**: cenário "Concluída, a importação troca o progresso pela confirmação".
- [x] 3.4 Estado de erro de importação: substitui `ImportProgress`, mensagem em
      linguagem do usuário, ação de tentar de novo que reinicia a operação e libera a
      dropzone.
      **Aceite**: cenário "Falha na importação oferece nova tentativa".

## 4. Progresso de análise por IA (transição etapa 02 → 03)

- [x] 4.1 `components/shell/AnalysisProgress.tsx`: coluna `max-width:620px;
      padding:96px 48px; gap:24px`, entrada `animation .22s ease-out` fade +
      translateY(8px); cabeçalho `Spinner` 26px + `<h3>Revisando seu currículo</h3>` +
      parágrafo 14px `text-muted`; `StageChecklist` de 5 etapas (ler versão importada →
      incorporar atualizações → procurar resultados sem número → checar datas
      sobrepostas e formatos → aplicar regras de leitura automática) com nota lateral de
      contagem; bloco skeleton (`background:#1c1e2b; border-radius:8px; padding:18px`)
      com 3 barras `height:9px;border-radius:4px;background:#3f424d` (larguras 70%/92%/
      48%) com shimmer (opacidade .35→1→.35, 1.3s ease-in-out infinite, delays
      0/.15s/.3s).
      **Aceite**: cenário "O checklist de análise nomeia as cinco etapas com contagem".
- [x] 4.2 `components/shell/AppShell.tsx`: `reviewReady = state.step === 3 && !analysing`;
      painel de revisão (`SuggestionReview`) só renderiza com `reviewReady`;
      `AnalysisProgress` renderiza quando `step === 3 && analysing`; clicar "Avançar" na
      etapa 02 muda `state.step` para 3 e inicia a análise no mesmo gesto; realce do rail
      permanece na etapa 03 durante a análise.
      **Aceite**: cenários "Avançar já entra em estado de análise", "O painel de revisão
      não aparece durante a análise", "O painel de revisão aparece quando a análise
      termina".
- [x] 4.3 Estado de erro de análise: substitui `AnalysisProgress`, ação de tentar de
      novo que reinicia a operação.
      **Aceite**: cenário "Falha na análise oferece nova tentativa".

## 5. Progresso de exportação (etapa 04)

- [x] 5.1 `components/shell/ExportProgress.tsx`: `padding:22px 24px; border-radius:8px;
      background:#1c1e2b; gap:16px`; `Spinner` 20px; título "Gerando arquivos" + contador
      "N de M" à direita; `StageChecklist` sem `SegmentedProgress`, um item "active" por
      vez.
      **Aceite**: cenários "A lista de arquivos reflete a seleção do usuário", "Só um
      arquivo está em andamento por vez".
- [x] 5.2 Lista de arquivos derivada de `resumeFileName` (`lib/export/filename.ts`) —
      nomes reais de download (`curriculo-<nome>-pt.pdf`, `resume-<nome>-en.docx`).
      **Aceite**: nome exibido no item da lista é idêntico ao nome do `<a download>`
      disparado para aquele arquivo.
- [x] 5.3 `components/shell/ExportStep.tsx`: ao clicar em baixar, formulário inteiro
      (idiomas, formatos, campo de nome, checklist de garantias) sai do DOM — não fica
      `disabled` — e `ExportProgress` entra sozinho; rótulo do botão de download conta a
      seleção antes de disparar: 0 → "Selecione idioma e formato" (desabilitado), 1 →
      "Baixar 1 arquivo", N → "Baixar N arquivos".
      **Aceite**: cenários "Clicar em baixar substitui o formulário pelo progresso", "O
      rótulo do botão de download conta a seleção".
- [x] 5.4 Estado de erro de exportação: substitui `ExportProgress`, ação de tentar de
      novo, formulário volta a ficar disponível.
      **Aceite**: cenário "Falha na exportação oferece nova tentativa".

## 6. Tela de conclusão da exportação

- [x] 6.1 `components/shell/state.ts`: campo `exportCompletion: { files: string[] } |
      null` em `FlowState`; helpers `withExportCompletion`/`clearExportCompletion`;
      `goTo`/`next`/`back` para fora da etapa 04 limpam `exportCompletion`.
      **Aceite**: teste unitário em `state.test.ts` cobrindo set/clear e limpeza ao sair
      da etapa 04.
- [x] 6.2 `components/shell/ExportComplete.tsx`: entrada `animation .26s`; círculo 52px
      `background:#2b2741` com ícone `check` 26px `#b5abfc`; `<h2>Currículo
      exportado</h2>`; parágrafo de agradecimento citando a contagem de arquivos; bloco
      "Arquivos no .zip" (`background:#1c1e2b`) listando cada arquivo com ícone `file`
      `#9184d9`; bloco "Antes de mandar" (`background:#1e2030`) com orientação curta;
      três ações — "Baixar de novo" (primária), "Ajustar e exportar outra versão"
      (secundária), "Começar um novo currículo" (ghost).
      **Aceite**: cenários "A conclusão substitui form e progresso", "A conclusão lista
      os arquivos gerados".
- [x] 6.3 Ligar as três ações: "Baixar de novo" repete a geração com a mesma seleção;
      "Ajustar e exportar outra versão" volta à etapa 03 e chama
      `clearExportCompletion`; "Começar um novo currículo" volta à etapa 01 e descarta
      importação + sugestões aceitas/dispensadas.
      **Aceite**: cenários "Baixar de novo repete a geração", "Ajustar e exportar outra
      versão volta à revisão", "Começar um novo currículo reseta o fluxo".

## 7. i18n

- [x] 7.1 Adicionar `progress.*` (títulos/legendas/etapas de import e análise, mensagens
      de erro e retry por operação) e `exportComplete.*` (título, agradecimento, blocos,
      rótulos das três ações) em `lib/i18n/dictionary.ts`, em `pt` e `en`, seguindo o
      padrão `xTitle`/`xDetail` já usado em `wait.*`.
      **Aceite**: build TypeScript sem erro (paridade de chaves forçada pelo tipo
      `Dictionary`).
- [x] 7.2 Decidir reaproveitar ou remover `t.step1.loading`/`t.step1.tryAgain` (hoje sem
      uso em `ImportStep.tsx`).
      **Aceite**: nenhuma chave órfã sobra no dicionário ao final da change.

## 8. Acessibilidade

- [x] 8.1 `role="status"` + região `aria-live="polite"` em `ImportProgress`,
      `AnalysisProgress` e `ExportProgress`, anunciando a etapa nomeada corrente quando
      muda.
      **Aceite**: cenário "A etapa corrente é anunciada".
- [x] 8.2 `prefers-reduced-motion: reduce` desliga `Spinner` e o shimmer do skeleton de
      análise, mantendo o texto da etapa corrente visível.
      **Aceite**: cenário "Redução de movimento desliga spinner e shimmer sem esconder o
      texto".

## 9. Requisito modificado em app-shell-navigation

- [x] 9.1 Ao arquivar esta change, confirmar que o requisito "A espera é anunciada" em
      `openspec/specs/app-shell-navigation/spec.md` reflete a versão MODIFICADA desta
      change (progresso por etapa nomeada permitido, estimativa por tempo continua
      proibida).
      **Aceite**: cenários "A importação anuncia a espera por etapa", "A revisão anuncia
      a espera por etapa", "A exportação anuncia a espera por etapa", "O aviso não estima
      tempo", "Sem espera, sem aviso" (`app-shell-navigation`).
- [x] 9.2 Atualizar o comentário em `components/ui/Notice.tsx` que hoje explica "sem
      barra de progresso porque nada informa progresso real"; remover `WaitNotice` se as
      três migrações (tasks 3.2, 4.2, 5.3) cobrirem todos os usos, ou manter e atualizar o
      comentário se sobrar algum uso sem etapas nomeadas.
      **Aceite**: nenhum comentário no código contradiz o comportamento novo.

## 10. Limpeza e testes de regressão

- [x] 10.1 Rodar a suíte existente (`AppShell.test.tsx`, `state.test.ts`,
      `ImportStep.test.tsx`, `ExportStep.test.tsx` se existirem) e ajustar aos novos
      componentes.
      **Aceite**: requisitos já cobertos de `app-shell-navigation` (bloqueio de
      navegação durante espera, cota esgotada) continuam passando sem alteração de
      comportamento.
- [x] 10.2 Teste de componente (não só do hook isolado) confirmando ausência de timer
      pendente após desmontar um componente com operação em `running`.
      **Aceite**: cenário "Desmontar limpa o timer".
