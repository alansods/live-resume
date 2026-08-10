## ADDED Requirements

### Requirement: Período em texto livre não ocupa a coluna da data

Quando o período de uma experiência ou formação não está completo, o papel SHALL exibir o
texto do arquivo em linha própria abaixo do título do item, quebrando em quantas linhas
precisar, e SHALL NOT colocá-lo na coluna da data ao lado do título. O texto SHALL NOT
transbordar do papel. O marcador numerado da sugestão que incide sobre aquele período SHALL
continuar junto do texto. Período completo SHALL continuar ao lado do título.

#### Scenario: Período em texto livre não espreme o título

- **WHEN** um item tem período incompleto cujo texto do arquivo é longo
- **THEN** o texto aparece em linha própria abaixo do título, e não na coluna da data

#### Scenario: Período completo continua ao lado do título

- **WHEN** um item tem período com mês e ano
- **THEN** a data aparece na coluna ao lado do título, como antes

#### Scenario: O marcador acompanha o período em texto livre

- **WHEN** uma sugestão incide sobre um período incompleto
- **THEN** o marcador numerado aparece junto do texto do arquivo, e clicar nele abre a
  sugestão

### Requirement: A caixa de marcar a sugestão segue o design system

O controle de marcar uma sugestão SHALL ser desenhado pelo design system — quadrado, raio
4px, cor de destaque quando marcado — e SHALL NOT ser o controle padrão do navegador. O
elemento que recebe clique, foco e rótulo SHALL continuar sendo um `input` de caixa de
seleção.

#### Scenario: A caixa da sugestão não é a do navegador

- **WHEN** o cartão de uma sugestão é exibido
- **THEN** o controle de marcar tem a forma do design system, e o `input` continua sendo o
  que recebe o clique, o foco e o rótulo
