## MODIFIED Requirements

### Requirement: Sugestões pedidas uma vez ao entrar na revisão

O aplicativo SHALL produzir as sugestões ao entrar na etapa 03 pela primeira vez e SHALL
reutilizá-las nas visitas seguintes. O conjunto SHALL reunir as três origens — métrica, ATS e
data —, sendo as duas primeiras pedidas às rotas de IA e a terceira calculada localmente, sem
serviço externo. Ir e voltar entre etapas SHALL NOT descartar as marcações do usuário.

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

### Requirement: Exportação recebe as sugestões marcadas

A exportação SHALL receber o currículo e as sugestões que o usuário marcou na etapa 03, de
qualquer uma das três origens, e SHALL NOT receber sugestão não marcada.

#### Scenario: O que foi marcado chega à exportação

- **WHEN** o usuário marca duas sugestões e exporta
- **THEN** a exportação recebe exatamente essas duas, com o seu path e o seu texto proposto

#### Scenario: O que não foi marcado não chega

- **WHEN** existem sugestões não marcadas
- **THEN** elas não constam do que a exportação recebe

#### Scenario: Correção de data marcada chega à exportação

- **WHEN** o usuário marca uma sugestão de data e exporta
- **THEN** a exportação recebe o período proposto para aquele trecho

## ADDED Requirements

### Requirement: Aviso de datas organizadas propagado à revisão

O aplicativo SHALL exigir o aviso de datas organizadas na etapa 03 quando, e somente quando, o
cálculo das sugestões de data indicar que **inferiu** algum mês. Mês derivado de uma data que
o próprio usuário forneceu SHALL NOT acionar o aviso — o aviso existe para ser específico
sobre o que o app escolheu.

#### Scenario: Mês inferido pelo app aciona o aviso

- **WHEN** o currículo tem um período cujo mês o app precisou inferir e o usuário entra na
  etapa 03
- **THEN** a revisão exibe o aviso de datas organizadas

#### Scenario: Mês derivado do usuário não aciona o aviso

- **WHEN** todas as datas propostas foram derivadas de datas que o usuário forneceu
- **THEN** a revisão não exibe o aviso de datas organizadas

#### Scenario: Currículo sem defeito de data não exibe aviso

- **WHEN** todos os períodos do currículo têm mês e ano e nenhum se sobrepõe
- **THEN** a revisão não exibe o aviso de datas organizadas

### Requirement: Sugestões de data resistem à falha da IA

Quando as rotas de sugestão da IA falharem, o aplicativo SHALL continuar apresentando as
sugestões de data, que não dependem delas. A falha de uma rota SHALL NOT descartar as
sugestões já produzidas por outra origem.

#### Scenario: Rotas de IA que falham não apagam as sugestões de data

- **WHEN** as duas rotas de sugestão da IA respondem com erro e o currículo tem defeito de
  data
- **THEN** a revisão abre com as sugestões de data, em vez de vazia

#### Scenario: Falha de uma rota preserva o que a outra devolveu

- **WHEN** uma das rotas de sugestão falha e a outra responde
- **THEN** a revisão exibe as sugestões da que respondeu
