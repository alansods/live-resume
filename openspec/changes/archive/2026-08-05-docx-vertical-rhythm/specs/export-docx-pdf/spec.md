## ADDED Requirements

### Requirement: O ritmo vertical é declarado pelo documento

O DOCX SHALL declarar o espaçamento vertical de cada parágrafo e a entrelinha, e SHALL NOT
deixá-los a cargo do padrão do editor que abrir o arquivo. A escala de espaço SHALL ser a
mesma para os dois formatos e SHALL viver num único módulo, ao lado de tamanho, cor e
família — nenhum gerador SHALL manter escala própria.

#### Scenario: O DOCX declara o próprio espaçamento

- **WHEN** o DOCX é gerado e reaberto
- **THEN** os parágrafos trazem espaçamento e entrelinha declarados, e nenhum deles depende
  do padrão do editor

#### Scenario: Os dois formatos leem a mesma escala

- **WHEN** a escala de espaço é lida pelos geradores
- **THEN** ela vem de um único módulo, e nenhum gerador define a sua
