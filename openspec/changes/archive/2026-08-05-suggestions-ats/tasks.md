## 1. Modelo compartilhado

- [x] 1.1 Acrescentar `rewrite` e `toText` a `suggestionActions` em
  `lib/suggestions/model.ts`, sem alterar nenhum campo existente.
  **Aceite**: cenário "Ação fora do conjunto conhecido é rejeitada"; as sugestões de métrica
  e de data continuam validando sem mudança.
- [x] 1.2 Definir `RawAtsSuggestionSchema` e o `responseSchema` da chamada, com `kind` fixo
  em `ats`. O `responseSchema` restringe `path` a `summary`/`skills`; o schema Zod o mantém
  como string livre, para que proposta mal ancorada seja descartada sozinha em vez de
  derrubar o lote.
  **Aceite**: cenário "Resposta de ATS fora do esquema é rejeitada".

## 2. Sugestões de ATS

- [x] 2.1 Implementar `suggestAts` em `lib/ai/suggest-ats.ts` — prompt com resumo e
  habilidades num único envio, saída estruturada, validação Zod na volta e ancoragem por
  `validateAtsSuggestions` — mesma política de `validateSuggestions`, com `summary`/`skills`
  no lugar de bullet.
  **Aceite**: cenários "Modelo comum é respeitado nas sugestões de ATS", "Texto atual
  corresponde ao trecho endereçado", "Path que não resolve é descartado na geração de ATS" e
  "No máximo duas sugestões de ATS".
- [x] 2.2 Cobrir a sugestão de resumo com respostas gravadas em `fixtures/`.
  **Aceite**: cenários "Resumo de adjetivos recebe proposta", "Resumo já indexável não recebe
  proposta", "A proposta trata da mesma trajetória" e "Currículo sem resumo não recebe
  sugestão de resumo".
- [x] 2.3 Cobrir a sugestão de habilidades com respostas gravadas.
  **Aceite**: cenários "Símbolo de nível vira texto corrido", "Nenhuma competência se perde
  na conversão", "Percentual de proficiência também é convertido", "Habilidades já em texto
  não recebem proposta" e "Currículo sem habilidades não recebe sugestão de habilidades".
- [x] 2.4 Reutilizar a sinalização de números não apoiados de `lib/suggestions/numbers.ts`.
  **Aceite**: cenários "Tempo de experiência inédito é sinalizado", "Número que o usuário
  escreveu não é sinalizado" e "Conversão de habilidades não inventa número".
- [x] 2.5 Garantir o escopo: descartar sugestão de ats fora de `summary`/`skills` e não
  produzir nada sobre formatação que a geração normaliza; devolver lista vazia sem chamar a
  IA quando não houver resumo nem habilidades; manter o currículo intacto.
  **Aceite**: cenários "Bullet não recebe sugestão de ATS", "Formatação que a geração conserta
  não vira sugestão", "Currículo sem resumo e sem habilidades não chama a IA" e "Currículo
  permanece intacto ao sugerir ATS".

## 3. Pontuação de ATS

- [x] 3.1 Implementar `atsScore(suggestions, selected)` em `lib/suggestions/ats.ts` como
  função pura: `100 − Σ peso(não marcada)`, pesos `ats 12 · dates 8 · metric 4 · verb 3`,
  piso 0, sem receber o currículo e sem importar nada de `lib/ai/`.
  **Aceite**: cenários "Sem marcação, a pontuação é a do currículo como está", "Currículos
  diferentes partem de pontuações diferentes", "Marcar uma sugestão sobe a pontuação",
  "Marcar mais nunca baixa a pontuação", "Desmarcar devolve a pontuação anterior", "Marcar
  tudo leva ao máximo", "Pontuação fica no intervalo" e "Mesma entrada, mesma pontuação".

## 4. Fronteira HTTP

- [x] 4.1 Criar o route handler `app/api/suggestions/ats`, no mesmo formato de
  `app/api/suggestions/metrics`: valida o corpo com Zod, chama `suggestAts` no servidor e
  distingue os erros de esquema, de comunicação e de credencial ausente.
  **Aceite**: cenário "Falha de comunicação na geração de ATS é distinguível"; a chave nunca
  aparece em resposta nem em bundle de cliente.

## 5. Fechamento

- [x] 5.1 Verificar isolamento da IA nos testes.
  **Aceite**: cenário "Nenhuma chamada real de ATS na suíte" — os testes injetam
  `recordedClient`/`failingClient`/`neverCalledClient`.
- [x] 5.2 Verificar cobertura e qualidade.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece todos os cenários desta capability e o
  cenário novo de `suggestions-metrics`; `npm test`, `npm run build`, `npm run lint` e
  `npx tsc --noEmit` passam.
