## Purpose

A página inicial do produto: o que ele faz, para quem serve, e o caminho para o fluxo de
quatro etapas — a porta de entrada que faltava no endereço do site.

## ADDED Requirements

### Requirement: A raiz apresenta o produto

A rota raiz SHALL exibir a página inicial com a manchete do produto, a explicação do que ele
faz e a chamada para ação. A rota raiz SHALL NOT ficar vazia.

#### Scenario: A raiz mostra a manchete e a explicação

- **WHEN** a página inicial é aberta
- **THEN** ela exibe a manchete do produto e o parágrafo que explica o que ele faz

#### Scenario: A raiz não é uma página em branco

- **WHEN** a página inicial é aberta
- **THEN** ela tem conteúdo visível, e não apenas o fundo do tema

### Requirement: Caminho para o fluxo

A página inicial SHALL oferecer uma chamada para ação que leva à rota do fluxo de etapas.

#### Scenario: A chamada leva ao fluxo

- **WHEN** o usuário aciona a chamada para ação
- **THEN** ele é levado para a rota do aplicativo, onde começa a etapa 01

#### Scenario: A chamada é identificável

- **WHEN** a página inicial é aberta
- **THEN** existe exatamente uma chamada principal para ação, com rótulo próprio

### Requirement: As quatro etapas são apresentadas

A página inicial SHALL apresentar as quatro etapas do fluxo — importar, atualizar, revisar e
exportar —, cada uma numerada e com um resumo do que faz.

#### Scenario: Os quatro cards aparecem numerados

- **WHEN** a página inicial é aberta
- **THEN** ela exibe quatro cards, numerados de 01 a 04, com título e resumo

#### Scenario: Os cards descrevem o que cada etapa faz

- **WHEN** os cards do fluxo são lidos
- **THEN** cada um traz o nome da etapa e uma descrição do que acontece nela

### Requirement: Interface bilíngue na home

Todo texto da página inicial SHALL vir do módulo de i18n, em português e inglês, e o idioma
SHALL poder ser trocado na própria página.

#### Scenario: A home muda de idioma

- **WHEN** o idioma da interface passa para inglês na página inicial
- **THEN** a manchete, a explicação, a chamada e os cards aparecem em inglês

#### Scenario: Nenhum texto fixo em componente na home

- **WHEN** os componentes da página inicial são inspecionados
- **THEN** nenhum texto de interface aparece escrito diretamente no componente
