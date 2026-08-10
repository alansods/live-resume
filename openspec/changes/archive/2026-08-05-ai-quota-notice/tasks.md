## 1. O motivo novo e a mensagem limpa

- [x] 1.1 Em `lib/ai/client.ts`: acrescentar `quota-exceeded` a `AiFailureReason`, classificar
  a falha da chamada por duck typing do campo `status` (429 → cota; qualquer outra coisa →
  `call-failed`), trocar a interpolação de `(error as Error).message` por mensagem escrita
  para o usuário, e registrar o detalhe bruto uma vez com `console.warn`.
  **Aceite**: cenários "Limite de uso vira motivo de cota", "Outras falhas da API continuam
  falha de comunicação", "A resposta da API não chega à tela" e "O detalhe bruto vai para o
  registro do servidor", em `lib/ai/client.test.ts`.

- [x] 1.2 Estender `failingClient` em `lib/ai/testing.ts` para aceitar o motivo novo, para os
  testes de rota e de tela exercitarem cota sem tocar na API.
  **Aceite**: `failingClient("quota-exceeded")` lança `AiError` com esse motivo; nenhum teste
  chama a API real.

## 2. As rotas

- [x] 2.1 Mapear `quota-exceeded` para 429 nas quatro rotas de IA (`resume-import`,
  `suggestions/metrics`, `suggestions/ats`, `export`).
  **Aceite**: cenário "A rota responde limite excedido", em `app/api/resume-import/route.test.ts`;
  as demais rotas cobertas nos seus próprios testes de status.

## 3. O aviso na tela

- [x] 3.1 Acrescentar o texto de cota ao `lib/i18n/dictionary.ts`, PT e EN, dizendo que o
  limite gratuito acabou e renova em cerca de 24 horas.
  **Aceite**: o teste que varre o JSX em busca de texto fixo continua passando.

- [x] 3.2 Etapa 01: guardar o código do erro junto da mensagem e renderizar `FailureNotice`
  com o texto de cota quando o código for `quota-exceeded`.
  **Aceite**: cenários "A importação avisa que a cota acabou" e "Falha que não é de cota
  mantém o aviso genérico", em `components/shell/AppShell.test.tsx`.

- [x] 3.3 Etapa 03: trocar `suggestionsIncomplete: boolean` por um motivo
  (`null | "partial" | "quota"`) em `components/shell/state.ts`, e exibir o aviso
  correspondente em `AppShell.tsx`.
  **Aceite**: cenário "A revisão distingue cota de sugestão faltando"; os cenários existentes
  "A revisão avisa quando parte das sugestões não veio" e "Sem falha, sem aviso de sugestão
  faltando" continuam passando.

- [x] 3.4 Etapa 04: mesmo tratamento em `ExportStep.tsx`.
  **Aceite**: cenário "A exportação avisa que a cota acabou", em `AppShell.test.tsx`.

## 4. Fechamento

- [x] 4.1 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam;
  `openspec archive ai-quota-notice --yes`.
