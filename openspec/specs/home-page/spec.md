# home-page Specification

## Purpose
A página inicial do produto: o que ele faz, para quem serve, e o caminho para o fluxo de
quatro etapas — a porta de entrada que faltava no endereço do site.
## Requirements
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

### Requirement: Caminho para o fluxo sem interceptação

O caminho da home para o fluxo SHALL ser um link de verdade: SHALL funcionar com clique do
meio, abertura em nova aba e sem JavaScript, e a navegação SHALL NOT esperar animação nenhuma
para acontecer. A página de destino MAY animar a própria entrada.

#### Scenario: A chamada é um link navegável

- **WHEN** a chamada para ação da home é inspecionada
- **THEN** ela é um link com endereço próprio, e não um controle que navega por código

#### Scenario: Nada atrasa a navegação

- **WHEN** o usuário aciona a chamada para ação
- **THEN** a navegação começa no ato, sem transição de saída

### Requirement: A animação de entrada é desligável

A animação de entrada da home SHALL respeitar a preferência de movimento do sistema: quem
pede menos movimento SHALL ver a página sem transição, com todo o conteúdo no lugar.

#### Scenario: Menos movimento, sem transição na home

- **WHEN** o sistema pede menos movimento
- **THEN** a home não anima a entrada, e o conteúdo aparece no estado final

