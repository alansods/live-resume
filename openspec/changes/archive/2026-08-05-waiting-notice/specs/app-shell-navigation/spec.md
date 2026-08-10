## ADDED Requirements

### Requirement: A espera é anunciada

Toda etapa que espera por uma chamada demorada SHALL exibir um aviso enquanto espera,
dizendo o que está acontecendo, quanto tempo aquilo costuma levar e que recarregar a página
faz o fluxo recomeçar do zero — não há armazenamento, e o arquivo é descartado. O aviso SHALL
ser anunciado a tecnologia assistiva.

O aviso SHALL NOT apresentar progresso que o sistema não conhece: nenhuma das chamadas
informa quanto falta, e a variação medida na mesma etapa foi de mais do que o dobro.

#### Scenario: A importação anuncia a espera

- **WHEN** um arquivo é enviado e a importação começa
- **THEN** a etapa 01 exibe o aviso de espera, com a duração típica e o alerta sobre
  recarregar

#### Scenario: A revisão anuncia a espera

- **WHEN** o usuário entra na etapa 03 pela primeira vez e as sugestões são pedidas
- **THEN** a etapa 03 exibe o aviso de espera

#### Scenario: A exportação anuncia a espera

- **WHEN** o usuário aciona o download
- **THEN** a etapa 04 exibe o aviso de espera, com a duração típica

#### Scenario: O aviso não promete progresso

- **WHEN** um aviso de espera é exibido
- **THEN** ele não apresenta barra de progresso nem contagem regressiva

#### Scenario: Sem espera, sem aviso

- **WHEN** nenhuma etapa está esperando por uma chamada
- **THEN** nenhum aviso de espera é exibido

### Requirement: Nada é acionável duas vezes durante a espera

Enquanto uma etapa espera por uma chamada, o aplicativo SHALL impedir que a mesma operação
seja disparada de novo e SHALL impedir a navegação entre etapas. A espera SHALL terminar
liberando tudo, inclusive quando a chamada falha.

#### Scenario: Não se navega durante o carregamento das sugestões

- **WHEN** as sugestões estão sendo pedidas
- **THEN** as ações de avançar, voltar e trocar de etapa pelo rail ficam indisponíveis

#### Scenario: Não se baixa duas vezes

- **WHEN** a exportação está em andamento
- **THEN** a ação de baixar fica indisponível até ela terminar

#### Scenario: Falha libera as ações

- **WHEN** uma chamada falha durante a espera
- **THEN** o aviso de espera some e as ações voltam a ficar disponíveis

## MODIFIED Requirements

### Requirement: Sugestões pedidas uma vez ao entrar na revisão

O aplicativo SHALL produzir as sugestões ao entrar na etapa 03 pela primeira vez e SHALL
reutilizá-las nas visitas seguintes. O conjunto SHALL reunir as três origens — métrica, ATS e
data —, sendo as duas primeiras pedidas às rotas de IA e a terceira calculada localmente, sem
serviço externo. Ir e voltar entre etapas SHALL NOT descartar as marcações do usuário.

Quando uma das rotas de IA falhar, a revisão SHALL informar que parte das sugestões não veio,
em vez de apresentar o conjunto incompleto como se fosse completo, e SHALL dizer que entrar na
etapa outra vez pede de novo.

#### Scenario: Sugestões são pedidas ao chegar na revisão

- **WHEN** o usuário entra na etapa 03 pela primeira vez
- **THEN** as sugestões são pedidas e exibidas

#### Scenario: Voltar e avançar não repete o pedido

- **WHEN** o usuário sai da etapa 03 e volta a ela
- **THEN** as sugestões já obtidas são reutilizadas, sem novo pedido

#### Scenario: Marcações sobrevivem à navegação

- **WHEN** o usuário marca sugestões, vai para outra etapa e retorna
- **THEN** as marcações continuam como estavam

#### Scenario: Sugestões de data entram no conjunto da revisão

- **WHEN** o currículo tem períodos sobrepostos ou período sem mês e o usuário entra na
  etapa 03
- **THEN** as sugestões de data aparecem na revisão junto das de métrica e de ATS

#### Scenario: Sugestões de data não pedem serviço externo

- **WHEN** as sugestões da revisão são produzidas
- **THEN** nenhuma requisição é feita para obter as de data

#### Scenario: A revisão avisa quando parte das sugestões não veio

- **WHEN** uma das rotas de sugestão falha e o usuário chega à revisão
- **THEN** a tela informa que parte das sugestões não pôde ser obtida e que entrar de novo na
  etapa tenta outra vez

#### Scenario: Sem falha, sem aviso de sugestão faltando

- **WHEN** as duas rotas de sugestão respondem
- **THEN** nenhum aviso de sugestão faltando é exibido
