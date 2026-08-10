## 1. A escala

- [x] 1.1 Criar `lib/export/typography.ts` com os tamanhos em pontos (nome 16, contato 9,
  seção 11, cargo 10,5, período e corpo 10), a cor do texto e do contato, e a família por
  formato — Arial no DOCX, Helvetica no PDF.
  **Aceite**: os dois geradores passam a ler dali; nenhum tamanho de fonte fica escrito em
  `docx.ts` ou `pdf.ts`.

## 2. DOCX

- [x] 2.1 Sobrescrever `styles.default.title` e `styles.default.heading1` com fonte, tamanho
  e cor do padrão, e aplicar a família ao documento inteiro.
  **Aceite**: cenários "Estilo nativo não impõe a tipografia do tema", "Uma única família de
  fonte por documento" e "Nenhuma cor de tema no documento", em `lib/export/export.test.ts`,
  lidos do `styles.xml` do arquivo gerado. O cenário "Títulos de seção usam estilo nativo"
  continua passando.
- [x] 2.2 Acrescentar a régua fina abaixo do título de seção, como borda de parágrafo.
  **Aceite**: os cenários "DOCX não contém tabela" e "DOCX não contém caixa de texto nem
  coluna" continuam passando — borda de parágrafo não é nenhum dos dois.

## 3. PDF

- [x] 3.1 Ler a escala do módulo comum, ajustando o nome de 20pt para 16pt.
  **Aceite**: cenários "O tamanho de cada elemento é o mesmo nos dois formatos" e "O nome não
  domina a página", medindo o texto do PDF gerado com o mesmo extrator que a importação usa.
  Os cenários "Texto do PDF é extraível" e "PDF não é imagem" continuam passando.

## 4. Fechamento

- [x] 4.1 Gerar as quatro saídas do currículo real e conferir as duas aparências lado a lado.
  **Aceite**: DOCX e PDF renderizados e comparados; nenhum azul, uma família por arquivo, o
  nome numa linha só.
- [x] 4.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  document-typography --yes`.
