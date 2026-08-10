## 1. Dependências

- [x] 1.1 Instalar `@react-pdf/renderer` e mover `docx` e `jszip` de `devDependencies` para
  `dependencies`.
  **Aceite**: `npm run build` passa e o bundle do cliente não cresce — as três só são
  alcançadas por import dinâmico no servidor.

## 2. Nome de arquivo

- [x] 2.1 Implementar `resumeFileName(name, locale, format)` em `lib/export/filename.ts`:
  minúsculas, sem acento, sem espaço, prefixo por idioma, extensão do formato.
  **Aceite**: cenários "Nome é derivado da pessoa e do idioma", "Acento e espaço não
  sobrevivem ao nome" e "Nome vazio não produz arquivo sem identificação".

## 3. DOCX

- [x] 3.1 Implementar `buildDocx(resume, locale)` em `lib/export/docx.ts` com estilos nativos
  de parágrafo, coluna única, sem tabela nem caixa de texto, datas por
  `formatPeriodForLocale` e títulos de seção do próprio módulo.
  **Aceite**: cenários "Títulos de seção usam estilo nativo", "DOCX não contém tabela", "DOCX
  não contém caixa de texto nem coluna", "Todo o conteúdo aparece no DOCX", "Arquivo em
  português traz data numérica" e "Arquivo em inglês traz mês abreviado" — verificados
  reabrindo o arquivo com `mammoth` e inspecionando `word/document.xml`.

## 4. PDF

- [x] 4.1 Implementar `buildPdf(resume, locale)` em `lib/export/pdf.ts` com
  `@react-pdf/renderer` em import dinâmico, coluna única e uma fonte.
  **Aceite**: cenários "Texto do PDF é extraível", "PDF não é imagem" e "Todo o conteúdo
  aparece no PDF" — verificados reabrindo o arquivo com `pdfjs-dist`.

## 5. Orquestração

- [x] 5.1 Implementar `exportResume` em `lib/export/export.ts`: `generateFinal` com as
  sugestões marcadas, ordem pedida uma vez, tradução no máximo uma por idioma, e os arquivos
  de cada combinação marcada.
  **Aceite**: cenários "Uma ordem serve todas as saídas", "Uma tradução serve os dois
  formatos", "Idioma do currículo não é traduzido", "Sugestão marcada aparece no arquivo" e
  "Sugestão não marcada não aparece no arquivo".
- [x] 5.2 Empacotar em `.zip` com `jszip` quando houver mais de uma saída; entregar o arquivo
  direto quando houver uma só.
  **Aceite**: cenários "Várias saídas viram um zip", "Saída única não é compactada" e
  "Nenhuma saída marcada não gera arquivo".
- [x] 5.3 Isolar a falha por idioma, devolvendo `files` e `failures` lado a lado.
  **Aceite**: cenários "Falha de tradução não derruba o outro idioma" e "Falha de todas as
  saídas não devolve arquivo vazio".
- [x] 5.4 Não emitir conteúdo do currículo em log e não persistir nada.
  **Aceite**: cenário "Nenhum conteúdo de currículo em log na exportação".

## 6. Fronteira HTTP

- [x] 6.1 Criar o route handler `app/api/export`: valida o corpo com Zod, chama
  `exportResume` no servidor e devolve o arquivo com `content-type` e nome corretos.
  **Aceite**: currículo inválido vira 400; falha de IA vira status distinguível; a resposta
  carrega o nome do arquivo no `content-disposition`.

## 7. Fechamento

- [x] 7.1 Verificar isolamento da IA e verificação por reabertura.
  **Aceite**: cenário "Nenhuma chamada real de exportação na suíte".
- [x] 7.2 Verificar cobertura e qualidade.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
