## 1. Ligar o cálculo de datas

- [x] 1.1 No `AppShell`, calcular `suggestDates(workingResume)` ao entrar na etapa 03 pela
  primeira vez, antes de esperar as rotas de IA, e somar o resultado ao conjunto — datas
  primeiro, IA depois.
  **Aceite**: cenários "Sugestões de data entram no conjunto da revisão" e "Sugestões de data
  não pedem serviço externo", em `components/shell/AppShell.test.tsx`.
- [x] 1.2 Propagar `requiresDisclosure` como `requiresDateNotice`, no lugar do `false` fixo.
  **Aceite**: cenários "Mês inferido pelo app aciona o aviso", "Mês derivado do usuário não
  aciona o aviso" e "Currículo sem defeito de data não exibe aviso".
- [x] 1.3 Garantir que a falha das rotas de IA não descarta o que já foi produzido.
  **Aceite**: cenários "Rotas de IA que falham não apagam as sugestões de data" e "Falha de
  uma rota preserva o que a outra devolveu".

## 2. Exportação

- [x] 2.1 Conferir que uma sugestão de data marcada chega à exportação como patch de período.
  **Aceite**: cenário "Correção de data marcada chega à exportação"; os cenários "O que foi
  marcado chega à exportação" e "O que não foi marcado não chega" continuam passando.

## 3. Fechamento

- [x] 3.1 Conferir a etapa 03 no navegador com o aviso visível e o filtro de datas.
  **Aceite**: critério visual comparado a `claude-design/CurriculoVivoApp.dc.html` — box de
  aviso e chip do filtro `dates`. **Divergência registrada**: o protótipo mostra
  "Aplicar"/"Desfazer" nos cartões; eles não existem e não são introduzidos.
  **Não feito**: chegar à etapa 03 no navegador exige passar pela importação, que exige
  `GEMINI_API_KEY` — mesma trava do item 1, e é o item 5 da fila. A cobertura equivalente está
  nos testes de tela: "Mês inferido pelo app aciona o aviso" renderiza o box de verdade, e
  "Sugestões de data entram no conjunto da revisão" renderiza os cartões.
- [x] 3.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  dates-into-review --yes`.
