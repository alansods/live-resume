## 1. A verificação de fumaça

- [x] 1.1 Escrever `scripts/smoke.mjs`: build, servidor de produção, importação de um
  currículo real, sugestões, exportação dos quatro arquivos, relatório e código de saída.
  Declarar no topo o custo em chamadas e o limite diário.
  **Aceite**: cenários "A verificação de fumaça existe e é acionável" e "A fumaça declara o
  que custa", em `lib/smoke.test.ts` (que lê o script, nunca o executa).

- [x] 1.2 Acrescentar `npm run smoke` ao `package.json`, fora de `npm test`.
  **Aceite**: cenário "A suíte não dispara a fumaça".

## 2. Código morto

- [x] 2.1 Remover `isEmptyIntake` de `lib/update-intake/content.ts`.
  **Aceite**: `npm run lint` e `npx tsc --noEmit` passam; nenhuma chamada restou.

- [x] 2.2 Remover `outputCount` de `components/shell/state.ts` e mover os três cenários da
  contagem para `AppShell.test.tsx`, medindo pelo rótulo do botão.
  **Aceite**: cenários "A contagem reflete idiomas vezes formatos", "Sem seleção não há
  download" e "Uma combinação gera um arquivo" verificados na tela.

## 3. Fechamento

- [x] 3.1 Verificar qualidade e arquivar.
  **Aceite**: `npm test`, `npm run build`, `npm run lint` e `npx tsc --noEmit` passam;
  `openspec archive smoke-check --yes`.
