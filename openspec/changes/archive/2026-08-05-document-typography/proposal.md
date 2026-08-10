## Why

O primeiro currículo exportado de verdade saiu com duas tipografias e uma cor que ninguém
escolheu.

O DOCX usa `HeadingLevel.TITLE` e `HEADING_1` (`docx.ts:96-101`), e **estilo nativo do Word
traz a própria fonte, o próprio tamanho e a própria cor**. A linha que declara `font: "Calibri"`
alcança só o `default.document.run`, não os títulos. Confirmado no XML do arquivo gerado:

```
Title      → 28pt
Heading1   → 16pt, cor 2E74B5   (azul do tema do Word)
```

Resultado: corpo em Calibri 11pt e títulos em serifa azul de 16pt, com o nome em 28pt
quebrando em duas linhas. O PDF, que tem folha de estilo própria, sai completamente
diferente: Helvetica, nome de 20pt, título de 11pt com régua, tudo preto.

Isso **contraria uma invariante de produto**: o modelo padrão exige "uma única fonte". Um
documento com corpo numa fonte e títulos noutra, colorida, tem duas. E o mesmo currículo
entregue em dois formatos deveria ser o mesmo documento, não dois documentos diferentes.

Usar estilo nativo foi decisão certa e continua — é o que dá estrutura navegável e legível
por ATS. O que faltou foi sobrescrever o que ele traz de bagagem.

## What Changes

- **Um padrão tipográfico só, escrito uma vez e aplicado aos dois formatos.** Uma escala
  curta, sem cor, sem variação de família:

  | elemento | tamanho | peso |
  |---|---|---|
  | nome | 16pt | negrito |
  | contato | 9pt | normal |
  | título de seção | 11pt | negrito, maiúsculas, régua fina abaixo |
  | cargo · empresa | 10,5pt | negrito |
  | período | 10pt | normal |
  | corpo e bullets | 10pt | normal |

- **Uma família só, nos dois formatos: Arial no DOCX, Helvetica no PDF.** São metricamente
  equivalentes — mesmas larguras de caractere —, então as quebras de linha coincidem e os
  dois arquivos ficam praticamente sobreponíveis. Helvetica é nativa do gerador de PDF e
  Arial existe em qualquer instalação do Word, então nenhum dos dois precisa embutir fonte.
  O DOCX deixa de usar Calibri, que não tem equivalente no PDF.
- **Os estilos nativos continuam, sobrescritos.** `title` e `heading1` recebem fonte, tamanho
  e cor explícitos via `styles.default`. O DOCX continua com títulos de estilo nativo — o
  requisito atual e o cenário que o verifica não mudam —, só param de trazer o tema do Word
  junto.
- **Nenhuma cor no documento.** Preto no texto, cinza escuro só no contato. O azul sai.
- **O nome deixa de quebrar em duas linhas**, em consequência do tamanho.

**Fora de escopo:**

- **Mudar o conteúdo, a ordem ou os títulos de seção.** Nada do que está escrito no currículo
  muda; muda como é desenhado.
- **Embutir uma fonte** no PDF ou no DOCX. Traria licenciamento e peso para ganhar uma
  diferença que Arial e Helvetica já não têm.
- **Tornar os dois arquivos idênticos ao pixel.** São formatos diferentes, com motores de
  layout diferentes. O alvo é "o mesmo documento", não "o mesmo arquivo".
- **A latência da exportação** (103s para quatro saídas). É outro assunto, e é o próximo.
- **A tela de revisão**, que desenha o currículo com os tokens do design system. Papel de
  tela e papel de arquivo são coisas diferentes: um é interface, o outro é o documento do
  usuário.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `export-docx-pdf`: o requisito "DOCX no modelo padrão" passa a exigir que os estilos
  nativos sejam sobrescritos com a tipografia do padrão, sem cor herdada do tema. Entra um
  requisito novo de tipografia comum aos dois formatos — hoje não existe nenhum, e é
  exatamente por isso que os dois divergiram sem ninguém perceber.

## Impact

- **Código tocado**: `lib/export/docx.ts` (estilos do documento), `lib/export/pdf.ts` (escala
  de tamanhos) e um módulo novo com a escala, para os dois lerem do mesmo lugar.
- **Código novo**: `lib/export/typography.ts` — a escala e a família por formato. Uma fonte
  de verdade só; foi a ausência dela que deixou os dois divergirem.
- **Dependências**: nenhuma nova.
- **Consequência registrada**: currículos exportados antes desta change têm outra aparência.
  Não há versionamento nem histórico — o arquivo é descartado depois do download —, então
  ninguém tem o que comparar. É seguro.
- **Referência de design**: nenhuma. O handoff descreve as **telas** do app; o papel do
  currículo exportado é documento do usuário, e o `.dc.html` da revisão desenha a tela, não o
  arquivo.
