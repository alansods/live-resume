## ADDED Requirements

### Requirement: Cota esgotada é anunciada como tal

Quando uma etapa que chama IA recebe resposta de limite de uso excedido, ela SHALL exibir um
aviso dizendo que o limite gratuito de uso da IA acabou e que ele renova em cerca de 24
horas. O aviso SHALL ser distinguível da falha genérica, SHALL vir do dicionário de interface
nos dois idiomas, e SHALL NOT exibir mensagem repassada do serviço. A etapa SHALL continuar
onde está e SHALL liberar as ações, para que a pessoa possa tentar de novo quando quiser.

#### Scenario: A importação avisa que a cota acabou

- **WHEN** a rota de importação responde limite de uso excedido
- **THEN** a etapa 01 exibe o aviso de cota com o prazo de cerca de 24 horas, e não a mensagem
  do serviço

#### Scenario: Falha que não é de cota mantém o aviso genérico

- **WHEN** a rota de importação falha por outro motivo
- **THEN** a etapa 01 exibe o aviso de falha comum, sem prometer renovação de limite

#### Scenario: A revisão distingue cota de sugestão faltando

- **WHEN** as rotas de sugestão respondem limite de uso excedido
- **THEN** a etapa 03 exibe o aviso de cota, as sugestões de data continuam na tela, e o aviso
  de parte das sugestões não vir não é exibido

#### Scenario: A exportação avisa que a cota acabou

- **WHEN** a rota de exportação responde limite de uso excedido
- **THEN** a etapa 04 exibe o aviso de cota e o botão de download volta a ficar acionável
