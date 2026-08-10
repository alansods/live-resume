## ADDED Requirements

### Requirement: Tipografia comum às duas saídas

As duas saídas SHALL desenhar o currículo com a mesma escala tipográfica — nome, contato,
título de seção, cargo, período e corpo —, de modo que o mesmo currículo em DOCX e em PDF
seja o mesmo documento, e não dois. Cada documento SHALL usar **uma única família de fonte**,
e as famílias das duas saídas SHALL ser metricamente equivalentes, para que as quebras de
linha coincidam sem que nenhuma fonte precise ser embutida.

Nenhum estilo de título SHALL trazer cor herdada do tema do editor: o texto do documento
SHALL ser preto, com a linha de contato em cinza escuro. O estilo de hiperlink fica de fora —
link azul é convenção universal, e forçá-lo a preto tornaria um link indistinguível de texto
comum para quem abrir o arquivo depois.

#### Scenario: O tamanho de cada elemento é o mesmo nos dois formatos

- **WHEN** o mesmo currículo é exportado em DOCX e em PDF e os dois arquivos são reabertos
- **THEN** o nome, o título de seção e o corpo têm o mesmo tamanho em pontos nos dois

#### Scenario: Uma única família de fonte por documento

- **WHEN** cada arquivo gerado é reaberto
- **THEN** todo o texto usa uma família só, e não há uma fonte para o corpo e outra para os
  títulos

#### Scenario: Nenhuma cor de tema nos títulos

- **WHEN** os estilos do DOCX gerado são inspecionados
- **THEN** nenhum estilo de título traz a cor de destaque do tema do editor, e todos saem em
  preto

#### Scenario: O nome não domina a página

- **WHEN** o currículo é exportado
- **THEN** o nome é maior que o corpo do texto sem chegar ao dobro dele, e cabe numa linha

## MODIFIED Requirements

### Requirement: DOCX no modelo padrão

O DOCX gerado SHALL usar estilos nativos de parágrafo para os títulos de seção e SHALL NOT
conter tabela, caixa de texto, cabeçalho ou rodapé com conteúdo, nem coluna lateral. O
conteúdo SHALL sair em coluna única.

Os estilos nativos SHALL ser sobrescritos com a fonte, o tamanho e a cor do padrão: estilo
nativo do editor traz consigo família, corpo e cor do tema, e herdá-los produz um documento
com mais de uma fonte — o que o modelo padrão proíbe.

#### Scenario: Títulos de seção usam estilo nativo

- **WHEN** o DOCX gerado é reaberto
- **THEN** os títulos de seção aparecem como parágrafos de estilo de título, não como texto
  em negrito

#### Scenario: DOCX não contém tabela

- **WHEN** o documento interno do DOCX gerado é inspecionado
- **THEN** ele não contém nenhum elemento de tabela

#### Scenario: DOCX não contém caixa de texto nem coluna

- **WHEN** o documento interno do DOCX gerado é inspecionado
- **THEN** ele não contém caixa de texto nem definição de múltiplas colunas

#### Scenario: Estilo nativo não impõe a tipografia do tema

- **WHEN** os estilos do DOCX gerado são inspecionados
- **THEN** o estilo do nome e o do título de seção declaram a fonte e o tamanho do padrão, em
  vez de herdá-los do editor
