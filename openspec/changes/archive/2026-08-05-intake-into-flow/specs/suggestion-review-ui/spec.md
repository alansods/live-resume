## RENAMED Requirements

- FROM: `### Requirement: Currículo exibido como foi importado`
- TO: `### Requirement: Currículo exibido sem nenhuma sugestão aplicada`

## MODIFIED Requirements

### Requirement: Currículo exibido sem nenhuma sugestão aplicada

A tela SHALL exibir o currículo em trabalho — o importado mais o que o usuário digitou na
etapa 02 — com o texto e a ordem de cada trecho como eles estão, sem nenhuma sugestão
aplicada. Marcar, desmarcar ou ignorar uma sugestão SHALL NOT alterar nenhum texto exibido no
currículo, e a tela SHALL NOT exibir texto proposto, trecho riscado ou selo de alteração no
corpo do currículo.

#### Scenario: O currículo mostra o texto importado

- **WHEN** a revisão é aberta para um currículo com sugestões
- **THEN** o corpo do currículo mostra o texto importado de cada trecho

#### Scenario: Marcar não altera o currículo exibido

- **WHEN** o usuário marca uma sugestão que propõe outro texto para um bullet
- **THEN** o bullet continua exibindo o texto importado

#### Scenario: Texto proposto não aparece no currículo

- **WHEN** existem sugestões com texto proposto
- **THEN** esse texto aparece apenas dentro do cartão da sugestão, nunca no corpo do
  currículo

#### Scenario: O que o usuário digitou aparece no currículo em revisão

- **WHEN** o usuário digitou uma experiência na etapa 02 e abre a revisão
- **THEN** o corpo do currículo mostra aquela experiência com o texto exatamente como ele a
  escreveu
