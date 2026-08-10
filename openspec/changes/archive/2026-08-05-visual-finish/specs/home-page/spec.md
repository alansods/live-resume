## MODIFIED Requirements

### Requirement: Caminho para o fluxo

A página inicial SHALL oferecer uma chamada para ação que leva à rota do fluxo de etapas,
acompanhada do ícone de seta à direita do handoff. O ícone SHALL ser decorativo: o rótulo da
chamada SHALL continuar sendo o seu texto.

#### Scenario: A chamada leva ao fluxo

- **WHEN** o usuário aciona a chamada para ação
- **THEN** ele é levado para a rota do aplicativo, onde começa a etapa 01

#### Scenario: A chamada é identificável

- **WHEN** a página inicial é aberta
- **THEN** existe exatamente uma chamada principal para ação, com rótulo próprio

#### Scenario: O ícone da chamada não vira o rótulo dela

- **WHEN** a chamada para ação é consultada pelo seu rótulo acessível
- **THEN** o rótulo é o texto da chamada, e o ícone não é anunciado

## ADDED Requirements

### Requirement: Top bar compartilhada com o aplicativo

A top bar da home SHALL ser a mesma do aplicativo — mesma marca, mesmo toggle de idioma e
mesma aparência. O caminho de volta à home SHALL NOT aparecer na própria home.

#### Scenario: A home usa a top bar do produto

- **WHEN** a página inicial é aberta
- **THEN** ela apresenta a marca e o toggle de idioma da top bar comum

#### Scenario: A home não oferece caminho de volta para si mesma

- **WHEN** a página inicial é aberta
- **THEN** a top bar não exibe o caminho de volta à home
