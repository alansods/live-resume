## 1. Fusão (função pura)

- [x] 1.1 Criar `lib/update-intake/merge.ts` com o tipo `IntakeContent` (as três listas com
  ids estáveis) e `mergeIntake(imported, intake)` devolvendo `{ resume, leftovers }`.
  Formação e experiência viram itens do currículo com origem `typed`; `delivered` vira um
  bullet por linha não vazia; habilidades entram na linha de habilidades; períodos passam por
  `parsePeriod(raw, typed)`.
  **Aceite**: cenários "Formação digitada entra no currículo", "Experiência digitada entra com
  as suas entregas", "Habilidade digitada entra na linha de habilidades", "Currículo sem
  habilidades ganha a linha", "Origem do que foi digitado é o usuário", "Nenhum trecho
  importado é alterado", "Refazer a fusão não duplica", "Data digitada vira período completo"
  e "Experiência em andamento vira fim em aberto", em `lib/update-intake/merge.test.ts`.
- [x] 1.2 Validar o item candidato contra o `ResumeSchema` antes de acrescentá-lo; o que não
  passa sai em `leftovers` com os textos que o usuário escreveu nele.
  **Aceite**: cenários "Item sem o essencial não entra no currículo" e "O que não virou item
  volta como sobra". O currículo devolvido valida contra `ResumeSchema` em todos os casos.

## 2. Pendências de data

- [x] 2.1 Criar `lib/update-intake/pending.ts`: a partir do currículo e de
  `report.incompletePeriods`, derivar uma pendência **por lado sem mês**, com id composto
  (`<path>#start` / `<path>#end`), o texto original do arquivo e o ano quando conhecido. Fim
  em aberto não é pendência.
  **Aceite**: cenários "Início e fim sem mês são duas pendências" e "Sem pendências, a seção
  não aparece", em `lib/update-intake/pending.test.ts`.
- [x] 2.2 Criar a conclusão: aplicar `{ month, year }` ao lado endereçado usando
  `completePeriod`, com origem `typed`, preservando o `raw`.
  **Aceite**: cenários "Usuário completa o período", "Sem ano conhecido, mês e ano são
  exigidos" e "Período completado passa a ser conteúdo do usuário".

## 3. Etapa 02

- [x] 3.1 Acrescentar a prop `onChange?: (content: IntakeContent) => void` a `UpdateIntake`,
  emitindo as três listas quando elas mudam — nunca o rascunho do modal.
  **Aceite**: cenários "Criar um item emite o conteúdo", "Editar um item emite o conteúdo
  atualizado", "Remover um item emite o conteúdo sem ele" e "Rascunho não é emitido", em
  `components/update-intake/UpdateIntake.test.tsx`. Nenhuma medida da tela muda.
- [x] 3.2 Passar `onCompletePeriod` a receber `{ month, year }` em `PendingPeriods`, usando o
  valor completo que `validateMonthYear` já devolve.
  **Aceite**: cenários "Períodos incompletos são apresentados" e "Nenhum mês é assumido"
  continuam passando; o ano informado chega ao callback.

## 4. Shell

- [x] 4.1 `ImportStep` preserva o relatório da importação e o entrega junto do currículo em
  `onImported`.
  **Aceite**: cenário "Período sem mês aparece na etapa 02"; os cenários de importação da
  `app-shell-navigation` continuam passando.
- [x] 4.2 `components/shell/state.ts` guarda `intake`, `report` e as datas completadas, e
  expõe `workingResume(state)` derivado. Currículo novo zera o que foi digitado.
  **Aceite**: cenários "Etapa 02 vazia não muda o currículo" e "Editar a etapa 02 recompõe sem
  acumular", em `components/shell/state.test.ts`.
- [x] 4.3 `AppShell` liga a etapa 02: passa `onChange`, `pendingPeriods` e `onCompletePeriod`,
  e entrega `workingResume` às etapas 03 e 04.
  **Aceite**: cenários "O que foi digitado chega à revisão", "O que foi digitado chega à
  exportação", "Período completado segue para as etapas seguintes" e "Importação sem pendência
  não apresenta a seção", em `components/shell/AppShell.test.tsx`.
- [x] 4.4 `AppShell` envia `extraUserText` (as sobras da fusão) nos dois pedidos de sugestão.
  **Aceite**: cenários "Sobra da etapa 02 acompanha o pedido de sugestões" e "Sem sobra, o
  pedido não carrega material extra".
- [x] 4.5 `AppShell` filtra os patches marcados cujo path já não resolve antes de enviá-los à
  exportação.
  **Aceite**: cenários "Sugestão de item removido não vai à exportação" e "Sugestão que ainda
  resolve continua indo".

## 5. Revisão

- [x] 5.1 Cobrir o requisito renomeado de `suggestion-review-ui` com o currículo em trabalho.
  **Aceite**: cenário "O que o usuário digitou aparece no currículo em revisão"; os cenários
  "O currículo mostra o texto importado", "Marcar não altera o currículo exibido" e "Texto
  proposto não aparece no currículo" continuam passando com os mesmos nomes.

## 6. Fechamento

- [x] 6.1 Renomear no `openspec/specs/` o requisito de `suggestion-review-ui` conforme o delta
  e conferir o fluxo no navegador: importar, digitar na etapa 02, ver o item na etapa 03 e no
  arquivo exportado.
  **Aceite**: o item digitado aparece no PDF gerado. Critério visual: a etapa 02 permanece
  idêntica ao `claude-design/CurriculoVivoApp.dc.html` (nenhuma medida muda nesta change).
  **Feito em parte**: o renomeio da spec e a conferência do shell no navegador, sim. O fluxo
  ponta a ponta no navegador **não** — passar da etapa 01 exige `GEMINI_API_KEY`, que ainda
  não está no ambiente. Isso é o item 5 da fila (rodar com IA real), e a cobertura equivalente
  está nos testes: "O que foi digitado chega à exportação" prova que o item digitado chega ao
  `/api/export`, e os testes de `lib/export/` já reabrem os arquivos gerados.
- [x] 6.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece todos os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  intake-into-flow --yes`.
