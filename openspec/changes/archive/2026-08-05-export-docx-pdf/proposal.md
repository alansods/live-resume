## Why

Tudo o que o app faz existe para produzir um arquivo, e o arquivo é a única coisa que ele
ainda não produz. `generateFinal` monta o currículo, `organizeContent` decide a ordem e
`translateResume` produz a versão traduzida — os três já testados, e os três sem ninguém
que os chame.

É também aqui que a promessa central se cumpre ou não. Gerar é reformatar: qualquer que
tenha sido o layout do arquivo importado — duas colunas, tabela, barra de proficiência —, o
que sai é o modelo padrão. Um PDF com o texto em imagem, ou um DOCX montado em tabela,
seriam lidos errado pelo ATS depois de todo o trabalho anterior.

## What Changes

- **DOCX com estilos nativos de parágrafo.** Título de seção é estilo, não negrito manual;
  sem tabela, sem caixa de texto, sem cabeçalho/rodapé com conteúdo, coluna única.
- **PDF com texto selecionável**, nunca imagem — o parser precisa extrair o texto.
- **As quatro saídas possíveis** (PT-BR/EN × DOCX/PDF), individualmente ou em `.zip` quando
  o usuário marca mais de uma.
- **O fluxo completo da exportação, numa ordem que importa**: aplica as sugestões marcadas
  (`generateFinal`), pede a ordem à IA (`organizeContent`) **uma vez** e a reutiliza em todas
  as saídas, traduz uma vez por idioma e reaproveita nos dois formatos.
- **Nome de arquivo padronizado**, derivado do nome da pessoa e do idioma:
  `curriculo-marina-alencar-pt.docx`, `resume-marina-alencar-en.pdf` — minúsculas, sem
  acento, sem espaço, para não quebrar em nenhum sistema de candidatura.
- **Data no formato do idioma**, via `formatPeriodForLocale`: `03/2022 – 12/2024` em
  português, `Mar 2022 – Dec 2024` em inglês.
- **Falha por saída, não por lote.** Se a tradução do inglês falhar, os arquivos em português
  são entregues e o inglês é reportado como falho. O usuário não perde o que deu certo.
- **O arquivo é descartado depois de entregue.** Nada é persistido: sem banco, sem storage,
  sem arquivo temporário sobrevivendo à requisição.

**Fora de escopo:**

- **A tela da etapa 04** — checkboxes de idioma e formato, rótulo do botão, lista de
  garantias de ATS. Ela é acabamento de `app-shell-navigation`; esta change entrega a
  biblioteca e a rota que ela chama.
- **A revisão e os seus cartões** — `suggestion-review-ui`.
- **Escolher o que exportar.** As sugestões marcadas chegam prontas do passo anterior;
  aqui elas só são aplicadas.
- **Layout com personalidade.** O modelo padrão é deliberadamente sem graça: uma fonte, uma
  coluna, títulos convencionais. Quem lê primeiro é máquina.
- **Envio por e-mail, link compartilhável ou histórico de exportações.** Não há conta, e o
  arquivo não sobrevive ao download.

## Capabilities

### New Capabilities

- `export-docx-pdf`: geração dos arquivos finais do currículo em DOCX e PDF, nos idiomas
  marcados, no modelo padrão de coluna única, com nome padronizado e empacotamento em `.zip`
  quando há mais de uma saída.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo**: `lib/export/docx.ts`, `lib/export/pdf.ts`, `lib/export/filename.ts`,
  `lib/export/export.ts` (o orquestrador) e o route handler `app/api/export`.
- **Dependências**: `docx` e `jszip` saem de `devDependencies` para `dependencies` — hoje
  estão lá só porque `scripts/build-fixtures.mjs` os usa, e passam a rodar em produção.
  **`@react-pdf/renderer` é instalação nova**, e é a única desta change.
- **Teste reabrindo o arquivo gerado**, como as regras do projeto exigem — e com uma
  simetria útil: o DOCX gerado é reaberto com `mammoth` e o PDF com `pdfjs-dist`, os mesmos
  parsers da importação, que já são dependências. Um PDF sem texto selecionável falha no
  teste exatamente como falharia num ATS.
- **Custo**: por exportação, uma chamada de organização mais no máximo uma de tradução,
  independentemente de quantos arquivos o usuário marcou.
- **Consequência de produto registrada**: este é o ponto onde conteúdo de máquina — ordem e
  tradução — vira arquivo assinado pelo usuário. Nada de novo entra aqui: a change não
  inventa texto, só materializa o que as anteriores produziram sob as suas próprias travas.
- **Referência de design**: `claude-design/README.md`, seção "6. Etapa 04 — Exportar" (lista
  de garantias de ATS e comportamento do download em lote). Sem UI nesta change.
