## ADDED Requirements

### Requirement: As caixas de idioma e formato seguem o design system

As caixas de seleção de idioma e de formato da etapa 04 SHALL ser desenhadas pelo design
system — quadradas, raio 4px, cor de destaque quando marcadas — e SHALL NOT ser o controle
padrão do navegador. O elemento que recebe clique, foco e rótulo SHALL continuar sendo um
`input` de caixa de seleção, e marcar SHALL continuar mudando a contagem de saídas.

#### Scenario: As caixas da etapa 04 não são as do navegador

- **WHEN** a etapa 04 é exibida
- **THEN** cada caixa de idioma e de formato tem a forma do design system, com o `input`
  ainda recebendo o clique, o foco e o rótulo
