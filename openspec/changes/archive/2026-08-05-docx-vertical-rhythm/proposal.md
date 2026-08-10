## Why

Os dois arquivos exportados já têm a mesma tipografia — `lib/export/typography.ts` nasceu
justamente porque cada gerador tinha a sua. O que ficou de fora foi o **ritmo vertical**: o
PDF declara a escala inteira (`ESPACO = { nome: 2, secao: 14, item: 10, linha: 3 }` e
`lineHeight: 1.45`, em `lib/export/pdf.ts`), e o DOCX não declara espaçamento de parágrafo
nenhum.

O que o DOCX não declara, ele herda do leitor. Cada editor aplica o seu padrão — o Word usa
8pt depois do parágrafo e 1,08 de entrelinha; outros usam zero —, e o mesmo currículo sai
com respiro diferente conforme o programa que abriu. É a mesma classe de defeito que a
tipografia teve: não é descuido de um gerador, é decisão que não estava escrita em lugar
nenhum. E é visível: dois arquivos que deveriam ser o mesmo documento em formatos
diferentes.

## What Changes

- **A escala de espaço sai do `pdf.ts` e vai para `typography.ts`**, junto de `TAMANHO`,
  `COR` e `FAMILIA` — é decisão do documento, não de um gerador. A entrelinha vai junto.
- **O DOCX passa a declarar espaçamento em cada parágrafo**, com a mesma escala, convertida
  para as unidades do formato: espaço em twips (1pt = 20) e entrelinha na medida de 240
  avos que o Word usa.
- **O PDF passa a ler a escala do módulo compartilhado.** Os valores não mudam: o que muda é
  de onde vêm.

**Fora de escopo:**

- **Mudar a escala.** Os números são os que o PDF já usava e que o usuário já viu impressos.
  Esta change os move e os aplica ao DOCX; discutir se 14pt antes da seção é o certo é outra
  conversa.
- **Margem de página do DOCX.** O padrão do formato (2,54cm) é convencional e não é o que
  diverge entre os dois arquivos.
- **Controle de quebra de página** (`keepNext`, viúvas e órfãs). É outro assunto, e não é
  ritmo.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `export-docx-pdf`: ganha o requisito de que o espaçamento vertical é declarado pelo
  documento, e não herdado do leitor.

## Impact

- **Código tocado**: `lib/export/typography.ts` (a escala e as conversões),
  `lib/export/docx.ts` (espaçamento por parágrafo), `lib/export/pdf.ts` (passa a importar).
- **Comportamento**: o PDF sai idêntico. O DOCX sai com o respiro que o PDF sempre teve, em
  vez do padrão de quem o abriu.
- **Dependências**: nenhuma.
- **Referência de design**: nenhuma de `claude-design/` — este é o documento do usuário, e
  a decisão vive em `lib/export/typography.ts`, como o próprio módulo declara.
