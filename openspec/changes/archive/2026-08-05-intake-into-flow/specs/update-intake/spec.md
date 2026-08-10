## ADDED Requirements

### Requirement: Saída da etapa

A etapa SHALL emitir para quem a hospeda o conteúdo que o usuário digitou — formação,
experiência e habilidades — sempre que ele mudar, com o identificador estável de cada item. A
emissão SHALL conter apenas os itens já criados: rascunho de modal aberto SHALL NOT aparecer
nela. O identificador de um item SHALL ser o mesmo em todas as emissões enquanto o item
existir.

#### Scenario: Criar um item emite o conteúdo

- **WHEN** o usuário adiciona uma experiência pelo modal
- **THEN** a etapa emite o conteúdo digitado com aquela experiência

#### Scenario: Editar um item emite o conteúdo atualizado

- **WHEN** o usuário altera o cargo de uma experiência já criada
- **THEN** a etapa emite o conteúdo com o cargo novo, e o identificador daquele item é o
  mesmo de antes

#### Scenario: Remover um item emite o conteúdo sem ele

- **WHEN** o usuário remove uma das três formações digitadas
- **THEN** a etapa emite o conteúdo com as duas restantes

#### Scenario: Rascunho não é emitido

- **WHEN** o usuário abre o modal e digita sem confirmar
- **THEN** o conteúdo emitido não inclui nada do que está no rascunho

### Requirement: Fusão do que foi digitado com o currículo importado

O sistema SHALL produzir o **currículo em trabalho** a partir do currículo importado e do
conteúdo digitado na etapa 02: cada item digitado entra como item do currículo com origem
"digitado pelo usuário". A fusão SHALL NOT alterar nenhum trecho importado e SHALL NOT
depender de conteúdo gerado por IA. Refazer a fusão a partir do mesmo currículo importado
SHALL produzir o mesmo resultado, sem acumular nem duplicar itens.

#### Scenario: Formação digitada entra no currículo

- **WHEN** o usuário digita uma formação e o currículo em trabalho é produzido
- **THEN** ele traz aquela formação com curso, instituição e período

#### Scenario: Experiência digitada entra com as suas entregas

- **WHEN** o usuário digita uma experiência com duas linhas no campo de entregas
- **THEN** o currículo em trabalho traz aquela experiência com dois bullets, um por linha

#### Scenario: Habilidade digitada entra na linha de habilidades

- **WHEN** o usuário digita duas habilidades novas
- **THEN** a linha de habilidades do currículo em trabalho passa a conter as duas, sem perder
  as que vieram do arquivo

#### Scenario: Currículo sem habilidades ganha a linha

- **WHEN** o currículo importado não tem habilidades e o usuário digita a primeira
- **THEN** o currículo em trabalho passa a ter a linha de habilidades com aquela habilidade

#### Scenario: Origem do que foi digitado é o usuário

- **WHEN** o currículo em trabalho é inspecionado
- **THEN** todo trecho que veio da etapa 02 tem origem "digitado pelo usuário", e nenhum tem
  origem de proposta da IA

#### Scenario: Nenhum trecho importado é alterado

- **WHEN** o usuário digita itens novos
- **THEN** todo trecho que veio do arquivo continua com o mesmo texto, o mesmo identificador e
  a mesma origem

#### Scenario: Refazer a fusão não duplica

- **WHEN** o usuário volta à etapa 02, altera um item e o currículo em trabalho é produzido de
  novo
- **THEN** o resultado traz o item alterado uma única vez, sem cópia do estado anterior

#### Scenario: Data digitada vira período completo

- **WHEN** o usuário digita início `03/2022` e fim `12/2024` numa experiência
- **THEN** o período daquela experiência no currículo em trabalho é completo, com mês e ano
  dos dois lados

#### Scenario: Experiência em andamento vira fim em aberto

- **WHEN** o usuário marca a experiência como em andamento
- **THEN** o período dela no currículo em trabalho tem fim em aberto e é completo

#### Scenario: Item sem o essencial não entra no currículo

- **WHEN** o usuário digita uma experiência sem empresa
- **THEN** ela não vira experiência do currículo em trabalho, e o currículo continua válido

#### Scenario: O que não virou item volta como sobra

- **WHEN** uma experiência digitada não vira item por falta do essencial
- **THEN** o texto que o usuário digitou nela é devolvido como sobra, para não se perder

## MODIFIED Requirements

### Requirement: Conclusão dos períodos incompletos da importação

Quando o currículo importado tem períodos incompletos, a tela SHALL apresentá-los para o
usuário informar o que faltava, mostrando o texto original como veio do arquivo. Início e fim
SHALL ser apresentados como pendências independentes: uma data em que só um dos lados perdeu
o mês produz uma pendência, não duas. A conclusão SHALL carregar mês e ano — quando o arquivo
não trouxe nem o ano, o mês sozinho SHALL NOT completar a data. O sistema SHALL NOT preencher
o mês por conta própria, um período completado SHALL deixar de constar como pendente, e o
trecho concluído SHALL registrar origem "digitado pelo usuário".

#### Scenario: Períodos incompletos são apresentados

- **WHEN** a importação registrou dois períodos sem mês
- **THEN** a etapa 02 apresenta os dois, cada um com o texto original do arquivo

#### Scenario: Usuário completa o período

- **WHEN** o usuário informa o mês que faltava num período incompleto
- **THEN** aquele período passa a completo e deixa de aparecer como pendente

#### Scenario: Nenhum mês é assumido

- **WHEN** um período incompleto é exibido
- **THEN** o campo de mês está vazio, sem valor pré-preenchido

#### Scenario: Sem pendências, a seção não aparece

- **WHEN** a importação não deixou nenhum período incompleto
- **THEN** a etapa 02 não exibe a seção de períodos a completar

#### Scenario: Início e fim sem mês são duas pendências

- **WHEN** um período importado perdeu o mês no início e no fim
- **THEN** a etapa 02 apresenta duas pendências, uma para cada lado, cada uma identificando de
  qual lado se trata

#### Scenario: Sem ano conhecido, mês e ano são exigidos

- **WHEN** a importação não reconheceu nem o mês nem o ano de um lado da data
- **THEN** completar aquele lado exige mês e ano, e o ano informado é preservado

#### Scenario: Período completado passa a ser conteúdo do usuário

- **WHEN** o usuário completa um período que veio incompleto do arquivo
- **THEN** aquele período passa a ter origem "digitado pelo usuário", e o texto original
  continua registrado
