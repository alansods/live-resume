# content-organization Specification

## Purpose
Produzir a ordem do conteúdo do currículo final: a IA decide a sequência das experiências,
dos bullets de cada experiência e das formações, como permutação de ids validada contra o
currículo, com ordem cronológica de recurso quando a chamada falha.
## Requirements
### Requirement: Ordem do conteúdo produzida pela IA

O sistema SHALL obter da IA a ordem das experiências, dos bullets de cada experiência e das
formações, na forma de permutação de ids do próprio currículo. A ordem obtida SHALL ser
entregue no formato que a geração consome, e SHALL NOT ser decidida por regra do app quando a
IA responde.

#### Scenario: Ordem das experiências vem da IA

- **WHEN** a organização é pedida para um currículo com três experiências e a IA devolve uma
  ordem diferente da do arquivo
- **THEN** o resultado traz as experiências naquela ordem, e não na do arquivo

#### Scenario: Bullets são ordenados dentro da própria experiência

- **WHEN** a IA devolve uma ordem para os bullets de uma experiência
- **THEN** o resultado traz essa ordem associada àquela experiência, sem misturar bullets de
  experiências diferentes

#### Scenario: Formações também são ordenadas

- **WHEN** o currículo tem mais de uma formação e a IA devolve uma ordem para elas
- **THEN** o resultado traz as formações naquela ordem

#### Scenario: Currículo sem experiência e sem formação não chama a IA

- **WHEN** o currículo não tem experiência nem formação
- **THEN** a operação devolve ordem vazia sem chamar a IA

### Requirement: Ausência de formação na ordem devolvida pela IA não falha a organização

Quando a IA devolve a ordem do conteúdo e a resposta não traz a chave de formações — por
exemplo, um currículo sem formação cadastrada —, o sistema SHALL tratá-la como lista vazia em
vez de recusar a ordem inteira e cair para a ordem cronológica só por essa chave.

#### Scenario: Ordem sem chave de formação é aceita como lista vazia

- **WHEN** a IA devolve a ordem do conteúdo sem a chave de formações
- **THEN** a ordem é aceita com a lista de formações vazia, sem cair para ordem cronológica

### Requirement: Permutação validada contra o currículo

A ordem devolvida pela IA SHALL ser verificada contra os ids do currículo antes de ser
usada. Ordem que cite id inexistente, repita um id ou deixe item de fora SHALL ser recusada
por inteiro — o sistema SHALL NOT reordenar parcialmente o currículo.

#### Scenario: Ordem com id desconhecido é recusada

- **WHEN** a IA devolve uma ordem que cita um id de experiência que não existe no currículo
- **THEN** aquela ordem é recusada, e a organização recorre à ordem cronológica

#### Scenario: Ordem que repete id é recusada

- **WHEN** a IA devolve uma ordem que cita o mesmo id duas vezes
- **THEN** aquela ordem é recusada, e a organização recorre à ordem cronológica

#### Scenario: Ordem incompleta é recusada

- **WHEN** a IA devolve uma ordem que deixa uma experiência de fora
- **THEN** aquela ordem é recusada, e a organização recorre à ordem cronológica

#### Scenario: Ordem válida é aceita inteira

- **WHEN** a IA devolve uma permutação que cita cada id do currículo exatamente uma vez
- **THEN** ela é aceita e entregue como está

### Requirement: Organizar não altera conteúdo

A organização SHALL apenas ordenar. Nenhum texto, id, período ou origem de trecho SHALL ser
alterado, criado ou removido, e o conjunto de itens SHALL ser o mesmo antes e depois.

#### Scenario: Nenhum item some ou aparece na organização

- **WHEN** a ordem é aplicada a um currículo
- **THEN** o currículo resultante tem exatamente os mesmos itens, com os mesmos ids

#### Scenario: Texto e origem sobrevivem à ordenação

- **WHEN** a ordem é aplicada a um currículo com trechos importados e trechos confirmados
- **THEN** cada trecho conserva o seu texto e a sua origem

#### Scenario: A IA não reescreve ao organizar

- **WHEN** a resposta da IA traz qualquer campo além de ids de ordenação
- **THEN** esse conteúdo é ignorado, e nenhum texto do currículo é substituído

### Requirement: Ordem cronológica de recurso

Quando a IA falhar ou devolver ordem inválida, o sistema SHALL produzir uma ordem
cronológica inversa por data de início — experiência em curso primeiro, depois a mais
recente — em vez de interromper a geração. A ordem dos bullets SHALL ser conservada como
está nesse caso, por não haver critério para reordená-los sem julgamento.

#### Scenario: Falha de comunicação não interrompe a geração

- **WHEN** a chamada à IA falha ou expira durante a organização
- **THEN** a operação devolve a ordem cronológica de recurso, sem lançar erro

#### Scenario: Experiências saem da mais recente para a mais antiga

- **WHEN** a ordem cronológica de recurso é produzida para experiências que começam em
  `01/2020`, `03/2022` e `01/2025`
- **THEN** elas saem na ordem `01/2025`, `03/2022`, `01/2020`

#### Scenario: Experiência em curso vem primeiro

- **WHEN** uma experiência tem fim em aberto e outra, já encerrada, começou depois dela
- **THEN** a que está em curso vem primeiro

#### Scenario: Período incompleto é ordenado pelo ano

- **WHEN** uma experiência tem período com ano e sem mês
- **THEN** ela é ordenada pelo ano que tem, sem que nenhum mês seja assumido

#### Scenario: Bullets conservam a ordem no recurso

- **WHEN** a ordem cronológica de recurso é produzida
- **THEN** os bullets de cada experiência conservam a ordem em que estavam

### Requirement: Currículo em revisão não é reordenado

A organização SHALL acontecer apenas na geração do currículo final. O currículo exibido na
revisão SHALL conservar a ordem do arquivo importado, e nenhuma operação de ordenação SHALL
ser oferecida ao usuário.

#### Scenario: A revisão continua na ordem do arquivo

- **WHEN** as sugestões são geradas e a revisão é montada
- **THEN** a ordem dos itens do currículo é a do arquivo importado

#### Scenario: Organizar não muda o currículo de origem

- **WHEN** a organização é pedida para um currículo
- **THEN** o currículo de entrada continua exatamente como estava

### Requirement: Testes de organização sem a IA real

A organização SHALL ser isolada atrás da mesma fronteira de IA do projeto, para que nenhum
teste dependa da API real.

#### Scenario: Nenhuma chamada real de organização na suíte

- **WHEN** a suíte de testes é executada
- **THEN** as ordens vêm de respostas gravadas, e nenhuma chamada a API de provedor é feita

