## 1. Resolução do worker

- [x] 1.1 Declarar `pdfjs-dist` em `serverExternalPackages` no `next.config.ts`, com
  comentário dizendo por quê — a opção parece removível, e removê-la derruba PDF de novo.
  **Aceite**: cenário "A dependência que lê PDF é declarada externa", em
  `lib/parsing/pdf.test.ts`. Verificação manual: `POST /api/resume-import` com um PDF real
  passa da extração, contra o servidor de desenvolvimento.

## 2. O erro para de culpar o arquivo

- [x] 2.1 Distinguir a falha de carregamento do worker da falha de arquivo: motivo próprio,
  mensagem que não acusa o arquivo do usuário, e status de erro do servidor na rota.
  **Aceite**: cenário "Falha de worker não é atribuída ao arquivo do usuário"; os cenários de
  `Arquivos que não podem ser processados` continuam passando com os mesmos nomes.

## 3. Fechamento

- [x] 3.1 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  pdf-worker-bundling --yes`.
