## ADDED Requirements

### Requirement: A extração de PDF funciona no servidor em execução

A biblioteca que lê PDF carrega o seu worker por caminho de módulo em tempo de execução, e
SHALL NOT ser empacotada pelo servidor: empacotá-la reescreve esse caminho e o worker deixa
de ser encontrado, o que faz todo PDF — válido ou não — ser recusado como arquivo corrompido.
A configuração do servidor SHALL declarar essa dependência como externa.

#### Scenario: A dependência que lê PDF é declarada externa

- **WHEN** a configuração do servidor é inspecionada
- **THEN** a biblioteca de leitura de PDF consta entre os pacotes que o servidor não empacota

#### Scenario: Falha de worker não é atribuída ao arquivo do usuário

- **WHEN** a leitura de um PDF falha por não encontrar o worker da biblioteca
- **THEN** o motivo registrado identifica a falha de carregamento, e não acusa o arquivo do
  usuário de estar corrompido
