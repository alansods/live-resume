## 1. Fundação do pipeline

- [x] 1.1 Adicionar `mammoth` e `pdfjs-dist` e definir o bloco intermediário
  `Block = { text, kind, page?, column? }` em `lib/parsing/blocks.ts`, com os tipos de erro
  de importação (formato não suportado, corrompido, sem camada de texto, grande demais).
  **Aceite**: dependências no `package.json`; tipos exportados; `npx tsc --noEmit` passa.
- [x] 1.2 Criar as fixtures binárias por script versionado em `fixtures/files/`, gerando
  DOCX e PDF a partir de conteúdo em texto: currículo completo com listas, currículo com
  entregas em parágrafo corrido, currículo de duas páginas, currículo em duas colunas, PDF
  só com imagem e arquivo corrompido.
  **Aceite**: `npm run fixtures` regenera os arquivos de forma reproduzível; a fonte de
  cada fixture é legível em texto.

## 2. Extração determinística

- [x] 2.1 Implementar a extração DOCX em `lib/parsing/docx.ts` com
  `mammoth.convertToHtml({ buffer })`, mapeando `li` para `listItem`, `p` para `paragraph`
  e `h1..h6` para `heading`.
  **Aceite**: cenários "Itens de lista são preservados como itens", "Parágrafo corrido não
  vira lista" e "Títulos são preservados como títulos"; teste que `extractRawText` não é
  usado.
- [x] 2.2 Implementar a extração PDF em `lib/parsing/pdf.ts` com `getDocument({ data })` e
  `getTextContent()`, reconstruindo linhas por proximidade vertical e unindo páginas na
  ordem. Importar o build legacy dentro do módulo, para não vazar para o bundle do cliente.
  **Aceite**: cenários "Linhas são reconstruídas pela posição", "Marcadores de lista são
  reconhecidos" e "Páginas são unidas na ordem".
- [x] 2.3 Detectar calhas verticais a partir das caixas reais dos itens e particionar por
  coluna **antes** de montar as linhas.
  **Aceite**: cenários "Currículo em duas colunas é detectado", "Colunas não são
  intercaladas", "Coluna única não é sinalizada" e "Conteúdo de todas as colunas é
  preservado".
- [x] 2.4 Detectar formato pelo conteúdo, não só pela extensão, e recusar o que não pode
  ser processado antes de qualquer chamada de IA.
  **Aceite**: cenários "Formato não suportado", "Arquivo corrompido", "PDF sem camada de
  texto" e "Arquivo grande demais"; teste que a IA não é chamada nesses casos.
- [x] 2.5 Verificar o determinismo da extração.
  **Aceite**: cenário "Mesma entrada, mesmo texto extraído".

## 3. Fronteira da IA

- [x] 3.1 Criar o cliente Gemini em `lib/ai/client.ts` com `@google/genai`, saída
  estruturada (`responseMimeType: "application/json"` + `responseSchema`), leitura da
  credencial só no servidor e erros distinguíveis para falha de chamada e configuração
  ausente.
  **Aceite**: cenários "Falha de comunicação com a IA" e "Configuração ausente".
- [x] 3.2 Definir o port `structureResume(blocks)` em `lib/ai/structure.ts`, com a
  implementação Gemini como padrão e uma implementação gravada para os testes.
  **Aceite**: cenário "Testes não chamam a IA real" — nenhuma chamada de rede na suíte.
- [x] 3.3 Escrever o prompt de estruturação, instruindo distribuição sem reescrita, e
  validar a resposta contra `ResumeSchema`.
  **Aceite**: cenários "Texto extraído vira currículo canônico", "Conteúdo de múltiplas
  colunas é remontado em ordem" e "Resposta fora do esquema é rejeitada".

## 4. Verificação anti-reescrita

- [x] 4.1 Implementar a verificação por contenção em `lib/parsing/verify.ts`: normalizar
  espaços e marcador de lista, e exigir que cada texto devolvido esteja contido no texto
  extraído.
  **Aceite**: cenários "Normalização de espaços é aceita" e "Divisão de bloco é aceita".
- [x] 4.2 Rejeitar o que não veio do arquivo, nomeando o texto não encontrado.
  **Aceite**: cenários "Texto inventado é rejeitado" e "Reformulação é rejeitada" —
  nenhum currículo é produzido nesses casos.
- [x] 4.3 Aplicar ids novos, origem "importado" e o parser de período de `resume-model` ao
  currículo aceito.
  **Aceite**: cenários "Período completo é normalizado" e "Período sem mês fica
  incompleto"; o currículo passa em `deserializeResume`.

## 5. Relatório

- [x] 5.1 Produzir o relatório em `lib/parsing/report.ts` com contagens, bullets sem
  número, períodos incompletos e períodos sobrepostos, cada um pelo path.
  **Aceite**: cenários "Contagens do que foi reconhecido", "Bullets sem número" e
  "Períodos incompletos e sobrepostos".
- [x] 5.2 Listar o texto extraído que não foi aproveitado em nenhum campo, e garantir que o
  relatório é descritivo.
  **Aceite**: cenários "Texto extraído não aproveitado" e "Relatório não altera o
  currículo".

## 6. Fronteira HTTP

- [x] 6.1 Expor `importResume(buffer, fileName)` em `lib/parsing/index.ts`, devolvendo
  `{ resume, report }`, sem conhecer `Request` nem `Response`.
  **Aceite**: todo o pipeline é testável sem subir servidor.
- [x] 6.2 Criar o route handler em `app/api/resume-import/route.ts`: limite de tamanho,
  detecção de formato, tradução de erro para status HTTP e descarte do buffer.
  **Aceite**: cenários "Nada é gravado em disco" e "Conteúdo não vai para log"; teste de
  que erros viram status distinguíveis.

## 7. Fechamento

- [x] 7.1 Verificar cobertura e qualidade.
  **Aceite**: o teste de cobertura de spec reconhece os cenários desta capability;
  `npm test`, `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
