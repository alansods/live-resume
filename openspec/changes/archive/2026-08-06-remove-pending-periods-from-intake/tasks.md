## 1. Specs primeiro

- [x] 1.1 Escrever a delta removendo "Conclusão dos períodos incompletos da importação" e
  "Rótulo do texto do arquivo só aparece com texto" de `update-intake`.
  **Aceite**: `specs/update-intake/spec.md` desta change.

## 2. Remover a seção da etapa 02

- [x] 2.1 Remover `components/update-intake/PendingPeriods.tsx` e a renderização condicional
  dele em `components/update-intake/UpdateIntake.tsx`.
  **Aceite**: nenhuma referência a `PendingPeriods` no componente.
- [x] 2.2 Remover `lib/update-intake/pending.ts` e `lib/update-intake/pending.test.ts`.
  **Aceite**: nenhum import de `@/lib/update-intake/pending` no repositório.
- [x] 2.3 Remover `workingPendingPeriods` e `withCompletedPeriod` de
  `components/shell/state.ts`, e a fiação correspondente (`pendencias`, props
  `pendingPeriods`/`onCompletePeriod` para `UpdateIntake`) em `components/shell/AppShell.tsx`.
  **Aceite**: `AppShell.tsx` não importa mais `PendingPeriod` de `PendingPeriods.tsx`.
- [x] 2.4 Remover as chaves `sections.pendingPeriods`, `pendingPeriods.description`,
  `pendingPeriods.originalLabel` e `hint` de `lib/i18n/dictionary.ts` (pt e en), e o parágrafo
  de dica de rodapé em `UpdateIntake.tsx`.
  **Aceite**: nenhuma chave órfã, `npx tsc --noEmit` limpo.
- [x] 2.5 Remover o describe "Conclusão dos períodos incompletos da importação" (5 testes) de
  `components/update-intake/UpdateIntake.test.tsx`, e qualquer passagem de
  `pendingPeriods`/`onCompletePeriod` nos helpers de montagem desse arquivo e de
  `components/shell/AppShell.test.tsx`.
  **Aceite**: `npm test` passa sem os testes removidos e sem teste órfão quebrado.

## 3. Fechamento

- [x] 3.1 Ajustar a frase final do Purpose de `openspec/specs/update-intake/spec.md` ao
  arquivar (remove "...e nenhuma data fica sem mês").
- [x] 3.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` continua passando (nenhum cenário removido deixou
  teste órfão, nenhum cenário restante ficou sem teste); `npm test`, `npm run build`,
  `npm run lint` e `npx tsc --noEmit` passam; a etapa 02 testada manualmente com um currículo
  com datas incompletas confirma que a seção sumiu e a sugestão de data aparece na etapa 03.
