## 1. A escala num lugar só

- [x] 1.1 Mover `ESPACO` e a entrelinha de `pdf.ts` para `typography.ts`, com as conversões
  para as unidades do DOCX (twips e 240 avos).
  **Aceite**: cenário "Os dois formatos leem a mesma escala", em `lib/export/export.test.ts`;
  o PDF continua saindo com os mesmos valores.

## 2. O DOCX declara o espaçamento

- [x] 2.1 Aplicar espaçamento e entrelinha aos parágrafos do DOCX, pela mesma escala.
  **Aceite**: cenário "O DOCX declara o próprio espaçamento", conferido reabrindo o arquivo
  gerado.

## 3. Fechamento

- [x] 3.1 Verificar qualidade e arquivar.
  **Aceite**: `npm test`, `npm run build`, `npm run lint` e `npx tsc --noEmit` passam;
  `openspec archive docx-vertical-rhythm --yes`.
