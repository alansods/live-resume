## 1. Verificação por fragmento

- [x] 1.1 Em `lib/parsing/verify.ts`, tentar a contenção do texto inteiro primeiro; só na
  falha quebrar o campo em `. ` e `; `, reunindo ao anterior todo fragmento com menos de 12
  caracteres normalizados, e exigir contenção de cada unidade resultante.
  **Aceite**: cenários "Campo reunido de partes distantes é aceito", "Fragmento reformulado
  derruba o campo inteiro" e "Colagem de palavras soltas é recusada", em
  `lib/parsing/verify.test.ts`.
- [x] 1.2 Preservar o comportamento atual em tudo que já passava.
  **Aceite**: cenários "Texto inventado é rejeitado", "Reformulação é rejeitada",
  "Normalização de espaços é aceita" e "Divisão de bloco é aceita" continuam passando com os
  mesmos nomes, sem alteração no teste.

## 2. Comparação por palavras

- [x] 2.1 Normalizar pontuação a espaço antes de comparar, na mesma função que já
  normaliza espaços, marcador de lista e aspas tipográficas.
  **Aceite**: cenários "Pontuação de ligação é aceita" e "Palavra trocada é recusada mesmo
  com a pontuação igual"; "Normalização de espaços é aceita" continua passando.

## 3. Fechamento

- [x] 3.1 Importar o currículo real que expôs o defeito, contra o servidor de
  desenvolvimento.
  **Aceite**: `POST /api/resume-import` devolve 200 — hoje devolve 502 `rewrite-detected` —
  e o campo de habilidades sai com o texto que a IA reuniu, sem nenhuma palavra inventada.
- [x] 3.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  verify-fragments --yes`.
