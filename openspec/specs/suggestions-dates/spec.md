# suggestions-dates Specification

## Purpose
Encontrar os defeitos de data do currículo — períodos que se sobrepõem e períodos sem mês —
e organizá-los no formato que os sistemas de recrutamento leem, distinguindo o que foi
derivado das datas do próprio usuário do que foi inferido pelo app, e avisando o usuário
sempre que houver inferência.
## Requirements
### Requirement: Detecção de períodos sobrepostos

O sistema SHALL comparar os períodos das experiências entre si e SHALL produzir uma sugestão
para cada par que se sobrepõe, informando a quantidade de meses de sobreposição. Períodos
incompletos SHALL NOT ser comparados — um mês desconhecido não pode ser assumido para
calcular sobreposição.

#### Scenario: Par sobreposto vira sugestão

- **WHEN** uma experiência vai de `01/2020` a `12/2022` e outra começa em `03/2022`
- **THEN** é produzida uma sugestão do tipo datas para esse par, informando 10 meses de
  sobreposição

#### Scenario: Períodos sem sobreposição não geram sugestão

- **WHEN** duas experiências não têm nenhum mês em comum
- **THEN** nenhuma sugestão de sobreposição é produzida para elas

#### Scenario: Período incompleto não é comparado

- **WHEN** uma das experiências tem período sem mês
- **THEN** nenhuma sugestão de sobreposição é produzida envolvendo ela, e nenhum mês é
  assumido

#### Scenario: Experiência em curso sobrepõe as posteriores

- **WHEN** uma experiência tem fim em aberto e outra começa depois do início dela
- **THEN** a sobreposição é detectada

#### Scenario: Local nomeia as duas experiências

- **WHEN** uma sugestão de sobreposição é produzida
- **THEN** o seu local identifica as duas empresas envolvidas

### Requirement: Correção de sobreposição derivada das datas do usuário

A correção proposta para uma sobreposição SHALL ser derivada de datas já presentes no
currículo — o fim da experiência anterior passa a ser o mês imediatamente antes do início da
seguinte. A justificativa SHALL dizer de onde a data saiu, e a sugestão SHALL ser marcada
como derivada.

#### Scenario: Fim proposto é o mês anterior ao início seguinte

- **WHEN** a experiência seguinte começa em `03/2022` e a anterior termina em `12/2022`
- **THEN** a correção proposta encerra a anterior em `02/2022`

#### Scenario: A justificativa cita a data de origem

- **WHEN** uma correção de sobreposição é proposta
- **THEN** a justificativa menciona a data que serviu de base para o cálculo

#### Scenario: Correção incide sobre a experiência anterior

- **WHEN** duas experiências se sobrepõem
- **THEN** a sugestão endereça o período da que começou antes, não o da que começou depois

#### Scenario: Sem base para derivar, não há proposta de data

- **WHEN** a sobreposição não permite derivar um fim válido, porque o início da seguinte é
  anterior ou igual ao início da anterior
- **THEN** nenhuma correção de data é proposta para aquele par

#### Scenario: Correção derivada não é marcada como inferida

- **WHEN** uma correção de sobreposição é proposta a partir do início da experiência seguinte
- **THEN** ela é marcada como derivada, e não conta como data inferida pelo app

### Requirement: Organização de períodos incompletos

O sistema SHALL produzir, para cada período sem mês, uma sugestão com o período completo em
`mm/aaaa`, preservando os anos que o arquivo trazia. Quando o mês não puder ser derivado de
datas vizinhas, o sistema SHALL inferir um mês plausível e SHALL marcar a sugestão como
inferida. O texto original SHALL continuar visível na sugestão.

#### Scenario: Período sem mês recebe proposta completa

- **WHEN** o currículo tem um período com o texto original `2018 - 2019`
- **THEN** é produzida uma sugestão de datas com início e fim em `mm/aaaa`, preservando os
  anos 2018 e 2019, e mostrando o texto original

#### Scenario: Mês inferido é marcado como tal

- **WHEN** o mês de um período incompleto não pode ser derivado de nenhuma data vizinha
- **THEN** a sugestão é marcada como inferida, e o mês proposto aparece na lista de datas
  que o app escolheu

#### Scenario: Mês derivado de vizinho não é inferido

- **WHEN** um período incompleto termina no mesmo ano em que a experiência seguinte começa,
  e o mês de início dela é conhecido
- **THEN** o fim proposto é derivado desse início, e a sugestão não é marcada como inferida

#### Scenario: Período completo não é apontado

- **WHEN** todos os períodos do currículo têm mês e ano
- **THEN** nenhuma sugestão de organização de data é produzida

#### Scenario: Formação incompleta também é organizada

- **WHEN** uma formação tem período sem mês
- **THEN** ela também recebe sugestão com período completo

### Requirement: Aviso de datas organizadas

Quando alguma data proposta tiver sido inferida pelo app, o resultado SHALL indicar que a
revisão precisa exibir um aviso, com texto dizendo que as datas foram organizadas para o
formato que os sistemas de recrutamento leem, que não precisam ser exatamente as reais, e
que cabe ao usuário conferir. Sem inferência, o aviso SHALL NOT ser exigido.

#### Scenario: Inferência exige o aviso

- **WHEN** ao menos uma data proposta foi inferida pelo app
- **THEN** o resultado indica que o aviso deve ser exibido, e lista quais períodos tiveram
  mês inferido

#### Scenario: Sem inferência, sem aviso

- **WHEN** todas as datas propostas foram derivadas do material do usuário
- **THEN** o resultado não exige o aviso

#### Scenario: Currículo sem defeito de data não exige aviso

- **WHEN** o currículo não tem período sobreposto nem incompleto
- **THEN** nenhuma sugestão de data é produzida e o aviso não é exigido

### Requirement: Detecção determinística

A detecção de defeitos de data SHALL ser determinística e SHALL NOT depender de serviço
externo. O mesmo currículo SHALL produzir as mesmas sugestões de data.

#### Scenario: Mesmo currículo, mesmas sugestões

- **WHEN** as sugestões de data são geradas duas vezes para o mesmo currículo
- **THEN** os dois resultados são iguais, exceto pelos identificadores

#### Scenario: Nenhuma chamada de IA

- **WHEN** as sugestões de data são geradas
- **THEN** nenhuma chamada a serviço externo é feita

### Requirement: Sugestões de data respeitam o contrato comum

As sugestões de data SHALL usar o mesmo modelo das demais, com tipo `dates`, e SHALL
respeitar a regra de no máximo uma sugestão por trecho. Gerar sugestões SHALL NOT alterar o
currículo.

#### Scenario: Modelo comum é respeitado

- **WHEN** uma sugestão de data é produzida
- **THEN** ela valida contra o modelo de sugestão, com tipo `dates` e ação de correção de
  data

#### Scenario: Um trecho, uma sugestão de data

- **WHEN** uma mesma experiência se sobrepõe a duas outras e também está incompleta
- **THEN** apenas uma sugestão de data é produzida para o período dela

#### Scenario: O que o usuário informou tem precedência

- **WHEN** o usuário já completou o mês de um período na etapa 02
- **THEN** aquele período não recebe sugestão de organização de data

#### Scenario: Currículo permanece intacto ao sugerir datas

- **WHEN** as sugestões de data são geradas
- **THEN** o currículo continua exatamente como estava

