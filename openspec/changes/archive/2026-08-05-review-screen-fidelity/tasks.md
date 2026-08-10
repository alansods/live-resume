## 1. O papel não recebe texto livre na coluna da data

- [x] 1.1 Em `ResumePaper.tsx`, separar o período completo (ao lado do título) do período em
  texto livre (linha própria abaixo, com o marcador junto), para experiências e formações;
  acrescentar a classe em `Review.module.css`, sem `nowrap`.
  **Aceite**: cenários "Período em texto livre não espreme o título", "Período completo
  continua ao lado do título" e "O marcador acompanha o período em texto livre", em
  `components/suggestion-review/SuggestionReview.test.tsx`.

## 2. As caixas de marcar

- [x] 2.1 Criar `Checkbox` em `components/ui/index.tsx` com a forma do handoff — 16px, raio
  4px, borda do divisor, accent quando marcado, foco visível — em
  `components/ui/primitives.module.css`, só com tokens.
  **Aceite**: o guard de cor literal continua passando.

- [x] 2.2 Usar o `Checkbox` no cartão de sugestão e na etapa 04.
  **Aceite**: cenários "A caixa da sugestão não é a do navegador" e "As caixas da etapa 04
  não são as do navegador"; os cenários existentes de marcar sugestão e de contagem de
  saídas continuam passando.

## 3. O rótulo órfão da etapa 02

- [x] 3.1 Em `PendingPeriods.tsx`, só exibir a linha do texto do arquivo quando houver texto.
  **Aceite**: cenário "Período sem texto no arquivo não mostra rótulo vazio", em
  `components/update-intake/UpdateIntake.test.tsx`.

## 4. Fechamento

- [x] 4.1 Verificar qualidade e arquivar.
  **Aceite**: `npm test`, `npm run build`, `npm run lint` e `npx tsc --noEmit` passam;
  `openspec archive review-screen-fidelity --yes`.
