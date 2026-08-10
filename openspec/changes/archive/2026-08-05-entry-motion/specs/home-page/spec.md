## ADDED Requirements

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
