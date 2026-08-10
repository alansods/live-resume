## 1. A natureza da divergência

- [x] 1.1 Em `lib/parsing/verify.ts`, classificar a recusa — `sem-acento`, `palavras:N` ou
  `ausente` — e carregá-la no `RewriteDetectedError`, ao lado do campo. A classificação SHALL
  ser rótulo e número, nunca conteúdo.
  **Aceite**: cenário "O registro da falha não contém texto do currículo", em
  `lib/parsing/structure.test.ts`; os cenários de recusa existentes continuam passando com os
  mesmos nomes.

## 2. A segunda tentativa

- [x] 2.1 Em `lib/parsing/index.ts`, envolver estruturação e verificação num laço de no
  máximo duas tentativas, passando à segunda o campo recusado e a natureza da divergência.
  **Aceite**: cenários "Resposta recusada é pedida uma segunda vez", "A segunda tentativa diz
  o que foi recusado", "Duas recusas falham a importação" e "Não há terceira tentativa".
- [x] 2.2 Em `lib/ai/structure.ts`, aceitar o retorno da tentativa anterior e acrescentá-lo ao
  pedido, sem alterar o prompt da primeira tentativa.
  **Aceite**: o pedido da primeira tentativa é idêntico ao de hoje; o da segunda nomeia o
  campo e a natureza.

## 3. O log

- [x] 3.1 Em `app/api/resume-import/route.ts`, registrar campo e natureza da divergência.
  **Aceite**: o log traz os dois e nenhum trecho do currículo; a invariante de privacidade
  continua válida.

## 4. Fechamento

- [x] 4.1 Confirmar com o currículo real, se a cota da API permitir.
  **Aceite**: importações repetidas concluem; quando a primeira resposta é recusada, o log
  registra a repetição e o usuário não vê erro.
  **Não feito**: a cota da API continua esgotada (429), conferida ao fim da change. O
  contrato da repetição está coberto por teste com cliente sequenciado — primeira resposta
  recusada, segunda aceita, e a contagem exata de duas chamadas. O que **não** foi observado
  em produção é a premissa que motivou tudo: que a segunda resposta do modelo real costuma
  ser diferente da primeira. Ela vem da medição de hoje (uma recusa em quatro tentativas com
  a mesma entrada), não de uma execução da repetição em si.
- [x] 4.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  structuring-retry --yes`.
