## ADDED Requirements

### Requirement: A top bar acompanha a rolagem

A top bar SHALL permanecer visível no topo da janela durante a rolagem da página, em
qualquer etapa. Ela SHALL reservar o próprio espaço no fluxo — nenhum conteúdo SHALL
começar coberto por ela. Na sobreposição, a top bar SHALL ficar acima do papel do currículo
e do resumo do marcador, e SHALL NOT cobrir um modal.

#### Scenario: A top bar continua visível ao rolar

- **WHEN** o conteúdo de uma etapa é mais alto que a janela e a página é rolada
- **THEN** a top bar continua no topo da janela, com a pontuação de ATS e o caminho de volta
  ao alcance

#### Scenario: A top bar não cobre o começo do conteúdo

- **WHEN** a página é exibida sem rolagem
- **THEN** o primeiro conteúdo abaixo da top bar aparece inteiro, sem ficar sob ela

#### Scenario: O modal fica acima da top bar

- **WHEN** um modal é aberto com a página rolada
- **THEN** o modal e o seu fundo cobrem a top bar
