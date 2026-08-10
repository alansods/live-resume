## ADDED Requirements

### Requirement: Cota esgotada é um motivo de falha próprio

Quando o modelo recusa a chamada por limite de uso esgotado, o sistema SHALL falhar com um
motivo próprio, distinguível da falha de comunicação. A rota SHALL responder com o status de
limite excedido, e não com o status de falha do serviço. O sistema SHALL NOT repetir a
chamada automaticamente nesse caso, e SHALL NOT usar o intervalo de nova tentativa sugerido
pela API, que descreve a janela por minuto e não a janela diária.

#### Scenario: Limite de uso vira motivo de cota

- **WHEN** a chamada ao modelo é recusada com status de limite excedido
- **THEN** a falha tem motivo de cota esgotada, distinto do motivo de falha de comunicação

#### Scenario: Outras falhas da API continuam falha de comunicação

- **WHEN** a chamada ao modelo falha por qualquer outro motivo, com ou sem status
- **THEN** a falha tem motivo de comunicação, e não de cota

#### Scenario: A rota responde limite excedido

- **WHEN** a importação falha por cota esgotada
- **THEN** a rota responde com o status de limite excedido e o código do motivo de cota

### Requirement: A mensagem da falha de IA é escrita para o usuário

Toda mensagem de falha de IA que chega ao usuário SHALL ser texto escrito para ele. Ela
SHALL NOT conter o corpo da resposta da API, JSON, identificador de cota, status HTTP nem
qualquer trecho repassado do serviço. O detalhe bruto da falha SHALL ser registrado no
servidor, uma vez, no ponto em que a falha acontece.

#### Scenario: A resposta da API não chega à tela

- **WHEN** o modelo falha com um corpo de erro extenso
- **THEN** a mensagem da falha não contém nenhum trecho desse corpo

#### Scenario: O detalhe bruto vai para o registro do servidor

- **WHEN** a chamada ao modelo falha
- **THEN** o servidor registra o motivo e o detalhe da falha, sem conteúdo do currículo
