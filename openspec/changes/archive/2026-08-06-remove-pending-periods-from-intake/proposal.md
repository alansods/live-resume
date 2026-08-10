## Why

A etapa 02 (Atualizar) existe para o usuário adicionar formação, experiência e habilidades
novas. Hoje ela também obriga o usuário a completar, ali mesmo, o mês de qualquer período que
a importação deixou incompleto — a seção "Datas a completar", com um cartão e um campo
`mm/aaaa` por pendência. Na tela, isso faz a etapa parecer uma revisão de problemas do arquivo
importado, não um lugar para escrever novidades.

Esse trabalho já é feito, de novo, pela revisão. `suggestions-dates` (requirement
"Organização de períodos incompletos") já produz, para todo período sem mês, uma sugestão com
o período completo — derivada de datas vizinhas quando dá, inferida com aviso quando não dá —
e `suggestion-review-ui` (requirement "Período em texto livre não ocupa a coluna da data") já
exibe esse período incompleto em texto livre com marcador ancorado, na etapa 03. O usuário
resolve a mesma pendência marcando a sugestão, sem digitar nada na etapa 02.

Manter os dois caminhos é redundância: a etapa 02 pede ao usuário uma informação que a etapa
03 já sabe propor sozinha, com aviso de que organizou.

## What Changes

- **A etapa 02 deixa de completar datas.** A seção "Datas a completar", o campo `mm/aaaa` por
  pendência e o mecanismo que a alimenta (`lib/update-intake/pending.ts`,
  `components/update-intake/PendingPeriods.tsx`) são removidos. A etapa passa a mostrar só as
  três seções de adicionar (formação, experiências, habilidades).
- **Período incompleto vira, sempre, sugestão de data na etapa 03.** Como ninguém mais
  completa o mês na etapa 02, todo período sem mês chega à revisão como sugestão — o
  comportamento que `suggestions-dates` e `suggestion-review-ui` já implementam sem alteração
  nenhuma nelas.
- **O requisito "Rótulo do texto do arquivo só aparece com texto"** sai de `update-intake`
  junto — ele só existe para o card da seção removida.
- **A frase final do Purpose de `update-intake`** ("...nenhuma data fica sem mês") é ajustada
  na hora de arquivar, para não prometer algo que a etapa não faz mais.
- **A dica de rodapé sobre métrica proposta** ("O app propõe a métrica provável a partir do
  que você escrever...") também é removida da etapa 02 nesta change — é só copy, não estava
  specced, e o usuário pediu a remoção junto.

**Fora de escopo:**

- **Alterar `suggestions-dates` ou `suggestion-review-ui`.** As duas capabilities já cobrem o
  caso; esta change só para de duplicá-lo na etapa 02.
- **Qualquer UI nova na etapa 03.** O marcador e a sugestão de data já existem lá.

## Capabilities

### Modified Capabilities

- `update-intake`: remove o requirement "Conclusão dos períodos incompletos da importação" e
  o requirement "Rótulo do texto do arquivo só aparece com texto".
- `app-shell-navigation`: remove o requirement "Períodos incompletos da importação chegam à
  etapa 02" — o shell não completa mais datas ali; `suggestDates`, já ligado à etapa 03, é o
  único caminho.

## Impact

- **Código removido**: `components/update-intake/PendingPeriods.tsx`,
  `lib/update-intake/pending.ts` e seu teste, os campos/funções que só existiam para
  alimentá-los em `components/shell/state.ts` (`workingPendingPeriods`,
  `withCompletedPeriod`) e `components/shell/AppShell.tsx`, as chaves de i18n
  `sections.pendingPeriods`, `pendingPeriods.*` e `hint`, e os testes correspondentes.
- **Código tocado**: `components/update-intake/UpdateIntake.tsx` (remove a seção e o rodapé
  de dica).
- **Nenhuma capability nova, nenhuma rota nova, nenhuma dependência nova.**
