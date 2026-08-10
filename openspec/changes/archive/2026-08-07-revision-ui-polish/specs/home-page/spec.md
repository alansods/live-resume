## MODIFIED Requirements

### Requirement: Top bar compartilhada com o aplicativo

A top bar da home SHALL ser a mesma do aplicativo — mesma marca, mesmo toggle de idioma,
mesma aparência e o mesmo comportamento de acompanhar a rolagem. O caminho de volta à home
SHALL NOT aparecer na própria home.

#### Scenario: A home usa a top bar do produto

- **WHEN** a página inicial é aberta
- **THEN** ela apresenta a marca e o toggle de idioma da top bar comum

#### Scenario: A home não oferece caminho de volta para si mesma

- **WHEN** a página inicial é aberta
- **THEN** a top bar não exibe o caminho de volta à home

#### Scenario: A top bar da home acompanha a rolagem

- **WHEN** a página inicial é rolada
- **THEN** a top bar continua visível no topo da janela, como no aplicativo
