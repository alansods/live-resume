## Context

Ver `proposal.md — Why`. O que condiciona a solução:

- `documentLines(resume, locale)` já é a fonte única do **conteúdo** e da ordem; os dois
  geradores a consomem. O que não existe é o equivalente para a **forma**.
- `docx` aplica estilo nativo por `HeadingLevel`, e `styles.default` aceita sobrescrever
  `title` e `heading1` — é o gancho que resolve sem abrir mão do estilo nativo.
- `@react-pdf/renderer` traz Helvetica, Times e Courier embutidas. Qualquer outra família
  exigiria registrar e embutir um arquivo de fonte.
- Os dois artefatos são inspecionáveis depois de gerados: o DOCX é um zip com `styles.xml`, e
  o PDF devolve o tamanho de cada trecho pelo próprio extrator que a importação usa. É o que
  permite testar reabrindo o arquivo, como a regra do projeto exige.

## Goals / Non-Goals

**Goals:**

- Uma escala só, num lugar só, consumida pelos dois geradores.
- Documento sem cor de tema e com uma família de fonte.

**Non-Goals:**

- Igualdade ao pixel entre DOCX e PDF. Motores de layout diferentes.
- Escolher tipografia "bonita". O alvo é convencional e legível por máquina.

## Decisions

### 1. A escala mora em `lib/export/typography.ts`

Um objeto com os tamanhos em pontos e a família por formato. Os dois geradores leem dali.

A divergência de hoje não aconteceu por descuido de alguém: aconteceu porque **não havia
onde escrever a decisão**. Cada gerador tinha a sua, e nenhuma estava errada isoladamente.
Centralizar é o que torna a próxima divergência impossível sem editar o arquivo comum.

### 2. Arial no DOCX, Helvetica no PDF

Metricamente equivalentes: mesmas larguras de caractere, então o texto quebra nos mesmos
pontos e os dois arquivos ficam sobreponíveis na prática. Nenhuma precisa ser embutida —
Helvetica é nativa do gerador de PDF, Arial existe em qualquer instalação do Word.

Alternativa descartada: Calibri nos dois, embutindo a fonte no PDF. Traz licenciamento e
peso para resolver uma diferença que Arial e Helvetica já não têm.

Alternativa descartada: Helvetica declarada no DOCX. Em Windows sem Helvetica o Word
substitui por conta própria, e a substituição não é previsível — Arial é a escolha que já é o
resultado da substituição.

### 3. Os estilos nativos ficam, sobrescritos

`styles.default.title` e `styles.default.heading1` recebem `font`, `size` e `color`
explícitos. O DOCX continua com títulos de estilo nativo — estrutura navegável e legível por
ATS —, e o cenário que verifica isso não muda. O que sai é a bagagem do tema.

Alternativa descartada: abandonar `HeadingLevel` e formatar título como parágrafo em negrito.
Resolveria a cor e quebraria o requisito atual, que existe por um motivo melhor.

### 4. O tamanho do nome cai de 28pt (DOCX) e 20pt (PDF) para 16pt

Vinte e oito pontos quebram o nome deste currículo em duas linhas, e um nome ocupando duas
linhas no topo é ruído no lugar mais importante da página. Dezesseis é maior que o corpo o
bastante para ser o primeiro elemento lido, e pequeno o bastante para caber.

O cenário "O nome não domina a página" fixa isso como regra e não como gosto: maior que o
corpo, menor que o dobro dele.

### 5. A régua sob o título de seção fica, nos dois

É borda de parágrafo, não tabela nem caixa de texto — não conflita com o modelo padrão, e
ajuda quem lê com os olhos a achar as seções. O DOCX ganha a que já existia no PDF, em vez de
o PDF perder a sua.

## Risks / Trade-offs

- **Quem já exportou terá arquivos diferentes dos de antes** → não há histórico nem
  versionamento; o arquivo é descartado após o download. Ninguém tem o que comparar.
- **Arial é considerada datada por designers** → e é exatamente por isso que ATS e leitores
  automáticos a processam sem surpresa. O documento não é peça de portfólio.
- **A régua depende de o leitor suportar borda de parágrafo** → todo editor de texto suporta,
  e um que ignore a borda apenas deixa de desenhá-la, sem afetar o texto.
