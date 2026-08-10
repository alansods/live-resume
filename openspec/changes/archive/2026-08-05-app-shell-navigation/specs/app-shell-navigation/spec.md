## Purpose

O shell do aplicativo e a navegação entre as quatro etapas, mais a etapa 01 (importar) e a
etapa 04 (exportar) — o fio que liga o arquivo que o usuário envia ao arquivo que ele baixa.

## ADDED Requirements

### Requirement: Navegação entre as quatro etapas

O aplicativo SHALL apresentar quatro etapas — importar, atualizar, revisar e exportar — e
SHALL permitir avançar e voltar entre elas. A etapa atual SHALL ser indicada, e avançar além
da quarta ou voltar antes da primeira SHALL NOT ser possível.

#### Scenario: A etapa atual é indicada

- **WHEN** o aplicativo está numa etapa
- **THEN** o rail indica qual é, e o conteúdo exibido é o dela

#### Scenario: Voltar não passa da primeira

- **WHEN** o aplicativo está na etapa 01
- **THEN** a ação de voltar não está disponível

#### Scenario: Avançar não passa da última

- **WHEN** o aplicativo está na etapa 04
- **THEN** a ação de avançar não está disponível

### Requirement: Avançar exige o passo anterior

O aplicativo SHALL NOT permitir sair da etapa 01 sem um currículo importado. As etapas
seguintes SHALL ficar indisponíveis enquanto não houver currículo.

#### Scenario: Sem currículo, não se avança

- **WHEN** nenhum currículo foi importado
- **THEN** avançar não está disponível, e as etapas 02, 03 e 04 não podem ser abertas pelo
  rail

#### Scenario: Com currículo, o fluxo abre

- **WHEN** um currículo é importado
- **THEN** avançar passa a estar disponível e as demais etapas ficam acessíveis

### Requirement: Importação do arquivo na etapa 01

A etapa 01 SHALL aceitar um arquivo por seleção e por arraste, SHALL enviá-lo para a
importação e SHALL indicar que está processando enquanto espera. Concluída, SHALL exibir a
confirmação com o nome do arquivo.

#### Scenario: Arquivo selecionado é importado

- **WHEN** o usuário seleciona um arquivo válido
- **THEN** o currículo importado passa a alimentar o fluxo, e a confirmação exibe o nome do
  arquivo

#### Scenario: Arquivo arrastado é importado

- **WHEN** o usuário solta um arquivo sobre a área de arraste
- **THEN** ele é importado como se tivesse sido selecionado

#### Scenario: Enquanto importa, a espera é informada

- **WHEN** a importação está em andamento
- **THEN** a etapa informa que está processando, e não aceita um segundo arquivo ao mesmo
  tempo

#### Scenario: Falha de importação é informada e não avança

- **WHEN** a importação falha
- **THEN** a etapa exibe a mensagem do erro, continua na etapa 01 e permite tentar outro
  arquivo

### Requirement: Sugestões pedidas uma vez ao entrar na revisão

O aplicativo SHALL pedir as sugestões ao entrar na etapa 03 pela primeira vez e SHALL
reutilizá-las nas visitas seguintes. Ir e voltar entre etapas SHALL NOT descartar as
marcações do usuário.

#### Scenario: Sugestões são pedidas ao chegar na revisão

- **WHEN** o usuário entra na etapa 03 pela primeira vez
- **THEN** as sugestões são pedidas e exibidas

#### Scenario: Voltar e avançar não repete o pedido

- **WHEN** o usuário sai da etapa 03 e volta a ela
- **THEN** as sugestões já obtidas são reutilizadas, sem novo pedido

#### Scenario: Marcações sobrevivem à navegação

- **WHEN** o usuário marca sugestões, vai para outra etapa e retorna
- **THEN** as marcações continuam como estavam

### Requirement: Seleção de saídas na etapa 04

A etapa 04 SHALL permitir escolher idiomas (português e inglês) e formatos (PDF e DOCX), e
SHALL indicar quantos arquivos serão gerados. Com nenhuma combinação escolhida, a ação de
baixar SHALL NOT estar disponível.

#### Scenario: A contagem reflete idiomas vezes formatos

- **WHEN** o usuário marca dois idiomas e dois formatos
- **THEN** a tela indica quatro arquivos

#### Scenario: Sem seleção não há download

- **WHEN** nenhum idioma ou nenhum formato está marcado
- **THEN** a ação de baixar não está disponível

#### Scenario: Uma combinação gera um arquivo

- **WHEN** o usuário marca um idioma e um formato
- **THEN** a tela indica um arquivo

### Requirement: Exportação recebe as sugestões marcadas

A exportação SHALL receber o currículo importado e as sugestões que o usuário marcou na
etapa 03, e SHALL NOT receber sugestão não marcada.

#### Scenario: O que foi marcado chega à exportação

- **WHEN** o usuário marca duas sugestões e exporta
- **THEN** a exportação recebe exatamente essas duas, com o seu path e o seu texto proposto

#### Scenario: O que não foi marcado não chega

- **WHEN** existem sugestões não marcadas
- **THEN** elas não constam do que a exportação recebe

### Requirement: Falha parcial da exportação é informada

Quando a exportação relatar falhas por saída, o aplicativo SHALL informá-las ao usuário,
mesmo tendo entregue os arquivos que deram certo.

#### Scenario: Falha de um idioma é exibida

- **WHEN** a exportação devolve arquivos e relata que uma saída falhou
- **THEN** o aplicativo entrega o download e exibe o aviso da saída que falhou

#### Scenario: Sem falha, sem aviso

- **WHEN** a exportação não relata falha
- **THEN** nenhum aviso de falha é exibido

### Requirement: Interface bilíngue no shell

Todo texto de interface do shell, da etapa 01 e da etapa 04 SHALL vir do módulo de i18n, em
português e inglês. Trocar o idioma da interface SHALL NOT alterar o conteúdo do currículo
nem as saídas escolhidas.

#### Scenario: Rótulos do shell mudam com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** os nomes das etapas e as ações de navegação aparecem em inglês

#### Scenario: Trocar o idioma da interface não muda as saídas escolhidas

- **WHEN** o usuário escolhe exportar em português e troca o idioma da interface para inglês
- **THEN** a saída escolhida continua sendo português

#### Scenario: Nenhum texto fixo em componente no shell

- **WHEN** os componentes do shell, da etapa 01 e da etapa 04 são inspecionados
- **THEN** nenhum texto de interface aparece escrito diretamente no componente
