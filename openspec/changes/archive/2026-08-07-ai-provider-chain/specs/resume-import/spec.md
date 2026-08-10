## MODIFIED Requirements

### Requirement: Cota esgotada é um motivo de falha próprio

Quando **todos** os provedores de IA disponíveis recusam a chamada por limite de uso
esgotado, o sistema SHALL falhar com um motivo próprio, distinguível da falha de comunicação.
A rota SHALL responder com o status de limite excedido, e não com o status de falha do
serviço. O sistema SHALL NOT repetir a chamada no mesmo provedor que recusou, e SHALL NOT
usar o intervalo de nova tentativa sugerido pela API, que descreve a janela por minuto e não
a janela diária.

Passar a vez para **outro** provedor não é repetir a chamada: a cota é de cada serviço, e o
provedor seguinte tem a dele intacta. Essa passagem é regida pela capability `ai-providers`;
aqui vale o que sobra quando ela se esgota. O motivo de cota SHALL prevalecer sobre os demais
quando qualquer provedor da cadeia tiver recusado por limite de uso — é o único motivo que
muda o conselho dado ao usuário.

#### Scenario: Limite de uso vira motivo de cota

- **WHEN** a chamada ao modelo é recusada com status de limite excedido
- **THEN** a falha tem motivo de cota esgotada, distinto do motivo de falha de comunicação

#### Scenario: Outras falhas da API continuam falha de comunicação

- **WHEN** a chamada ao modelo falha por qualquer outro motivo, com ou sem status
- **THEN** a falha tem motivo de comunicação, e não de cota

#### Scenario: A rota responde limite excedido

- **WHEN** a importação falha por cota esgotada
- **THEN** a rota responde com o status de limite excedido e o código do motivo de cota
