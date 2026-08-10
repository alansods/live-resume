## 1. Ordem cronológica de recurso

- [x] 1.1 Implementar `chronologicalOrder(resume)` em `lib/resume/chronological.ts` como
  função pura sobre `comparePeriodStart`: experiência em curso primeiro, depois início mais
  recente, período incompleto ordenado pelo ano, bullets conservados.
  **Aceite**: cenários "Experiências saem da mais recente para a mais antiga", "Experiência
  em curso vem primeiro", "Período incompleto é ordenado pelo ano" e "Bullets conservam a
  ordem no recurso".

## 2. Organização pela IA

- [x] 2.1 Implementar `organizeContent` em `lib/ai/organize-content.ts`: prompt com os ids e
  o conteúdo de cada item, `responseSchema` só de listas de identificadores, validação Zod na
  volta e devolução no formato `ResumeOrder`.
  **Aceite**: cenários "Ordem das experiências vem da IA", "Bullets são ordenados dentro da
  própria experiência", "Formações também são ordenadas" e "Currículo sem experiência e sem
  formação não chama a IA".
- [x] 2.2 Validar a permutação contra os ids do currículo antes de entregá-la, recusando id
  desconhecido, id repetido e lista incompleta.
  **Aceite**: cenários "Ordem com id desconhecido é recusada", "Ordem que repete id é
  recusada", "Ordem incompleta é recusada" e "Ordem válida é aceita inteira".
- [x] 2.3 Recorrer à ordem cronológica em qualquer `AiError` e em ordem inválida, registrando
  a falha em log sem conteúdo do currículo.
  **Aceite**: cenário "Falha de comunicação não interrompe a geração".

## 3. Trava de conteúdo

- [x] 3.1 Garantir que organizar não altera conteúdo: schema de resposta só de ids, currículo
  de entrada intacto, itens preservados na aplicação da ordem.
  **Aceite**: cenários "Nenhum item some ou aparece na organização", "Texto e origem
  sobrevivem à ordenação", "A IA não reescreve ao organizar" e "Organizar não muda o currículo
  de origem".
- [x] 3.2 Verificar que a revisão continua na ordem do arquivo importado.
  **Aceite**: cenário "A revisão continua na ordem do arquivo" — nenhuma chamada de
  organização no caminho das sugestões.

## 4. Fechamento

- [x] 4.1 Verificar isolamento da IA nos testes.
  **Aceite**: cenário "Nenhuma chamada real de organização na suíte" — os testes injetam
  `recordedClient`/`failingClient`/`neverCalledClient`.
- [x] 4.2 Verificar cobertura e qualidade.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
