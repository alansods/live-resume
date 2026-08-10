## ADDED Requirements

### Requirement: Verificação de fumaça contra a API real

O projeto SHALL oferecer uma verificação de fumaça, acionada por um comando próprio, que
exercita o fluxo inteiro contra a API do modelo de verdade: importar um currículo, obter as
sugestões e exportar os arquivos. Ela SHALL falhar com código de saída diferente de zero e
mensagem legível quando qualquer etapa não responder, e SHALL relatar quantas chamadas ao
modelo custa uma execução.

#### Scenario: A verificação de fumaça existe e é acionável

- **WHEN** o projeto é inspecionado
- **THEN** existe um comando próprio para a verificação de fumaça, apontando para um script
  que percorre importação, sugestões e exportação

#### Scenario: A fumaça declara o que custa

- **WHEN** a verificação de fumaça é lida
- **THEN** ela diz quantas chamadas ao modelo gasta e qual é o limite diário do plano
  gratuito

### Requirement: A fumaça vive fora da suíte

A verificação de fumaça SHALL NOT ser executada pela suíte de testes: nenhum teste SHALL
chamá-la, e o comando de teste SHALL NOT dispará-la. A regra de que a suíte nunca chama a API
do modelo SHALL continuar valendo.

#### Scenario: A suíte não dispara a fumaça

- **WHEN** a suíte de testes roda
- **THEN** o script de fumaça não é executado, e nenhum teste o importa
