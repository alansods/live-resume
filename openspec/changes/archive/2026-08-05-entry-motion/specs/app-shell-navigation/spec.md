## ADDED Requirements

### Requirement: A animação de entrada das etapas é desligável

A animação com que cada etapa entra SHALL respeitar a preferência de movimento do sistema:
quem pede menos movimento SHALL ver a etapa sem transição, com todo o conteúdo no lugar.
Nenhuma etapa SHALL depender da animação para ficar legível.

#### Scenario: Menos movimento, sem transição de etapa

- **WHEN** o sistema pede menos movimento
- **THEN** as etapas do aplicativo não animam a entrada, e o conteúdo aparece no estado final

#### Scenario: A revisão também obedece

- **WHEN** o sistema pede menos movimento e a etapa 03 é aberta
- **THEN** o currículo e o painel de sugestões aparecem sem transição
