## Purpose

A tela da etapa 03: o currículo importado com marcadores numerados ancorados aos trechos, e
as sugestões como checklist — o usuário marca o que quer no currículo final, sem que nada
seja aplicado durante a revisão.

## ADDED Requirements

### Requirement: Currículo exibido como foi importado

A tela SHALL exibir o currículo importado com o seu texto e a sua ordem originais. Marcar,
desmarcar ou ignorar uma sugestão SHALL NOT alterar nenhum texto exibido no currículo, e a
tela SHALL NOT exibir texto proposto, trecho riscado ou selo de alteração no corpo do
currículo.

#### Scenario: O currículo mostra o texto importado

- **WHEN** a revisão é aberta para um currículo com sugestões
- **THEN** o corpo do currículo mostra o texto importado de cada trecho

#### Scenario: Marcar não altera o currículo exibido

- **WHEN** o usuário marca uma sugestão que propõe outro texto para um bullet
- **THEN** o bullet continua exibindo o texto importado

#### Scenario: Texto proposto não aparece no currículo

- **WHEN** existem sugestões com texto proposto
- **THEN** esse texto aparece apenas dentro do cartão da sugestão, nunca no corpo do
  currículo

### Requirement: Marcadores ancorados ao trecho

Cada sugestão SHALL ter um marcador numerado junto ao trecho que ela endereça, e a
numeração SHALL ser a mesma no marcador e no cartão. Trecho sem sugestão SHALL NOT receber
marcador.

#### Scenario: Cada sugestão tem marcador no seu trecho

- **WHEN** uma sugestão endereça um bullet
- **THEN** aquele bullet exibe um marcador, e os demais trechos sem sugestão não exibem

#### Scenario: Número do marcador é o número do cartão

- **WHEN** a revisão exibe três sugestões
- **THEN** o marcador de cada uma traz o mesmo número do seu cartão

#### Scenario: Sugestão de seção ancora na seção

- **WHEN** uma sugestão endereça o resumo ou as habilidades
- **THEN** o marcador aparece junto daquela seção, não junto de um bullet

### Requirement: Marcar é a única ação sobre o currículo final

Cada cartão SHALL oferecer marcação e desmarcação. O conjunto de sugestões marcadas SHALL
ser o que a exportação recebe, e sugestão não marcada SHALL NOT entrar no currículo final. A
tela SHALL NOT oferecer aplicar, desfazer, editar texto do currículo ou reordenar conteúdo.

#### Scenario: Marcar inclui a sugestão no conjunto

- **WHEN** o usuário marca uma sugestão
- **THEN** ela passa a constar do conjunto entregue para a geração, com o seu path e o seu
  texto proposto

#### Scenario: Desmarcar remove do conjunto

- **WHEN** o usuário desmarca uma sugestão que havia marcado
- **THEN** ela deixa de constar do conjunto entregue

#### Scenario: Marcar todas marca as pendentes

- **WHEN** o usuário aciona marcar todas
- **THEN** todas as sugestões não ignoradas passam a estar marcadas

#### Scenario: Nenhuma ação de desfazer ou editar é oferecida

- **WHEN** a revisão é inspecionada
- **THEN** não há controle de desfazer, de aplicar ao currículo, de edição de texto nem de
  reordenação

### Requirement: Ignorar remove a sugestão da revisão

Ignorar uma sugestão SHALL remover o seu cartão e o seu marcador da tela, e SHALL removê-la
do conjunto marcado se estivesse marcada. Ignorar SHALL ser distinto de desmarcar:
desmarcada, a sugestão continua listada.

#### Scenario: Sugestão ignorada some da tela

- **WHEN** o usuário ignora uma sugestão
- **THEN** o cartão e o marcador dela deixam de aparecer

#### Scenario: Ignorar uma sugestão marcada tira do conjunto

- **WHEN** o usuário ignora uma sugestão que estava marcada
- **THEN** ela deixa de constar do conjunto entregue para a geração

#### Scenario: Desmarcada continua listada

- **WHEN** o usuário desmarca uma sugestão
- **THEN** o cartão dela continua na lista, podendo ser marcado de novo

### Requirement: Foco e navegação entre marcador e cartão

O marcador SHALL abrir, ao passar o ponteiro, um resumo com o tipo, o número, o título e o
texto proposto da sugestão. Acionar o marcador ou o "ver detalhes" SHALL levar ao cartão
correspondente e destacá-lo.

#### Scenario: O resumo do marcador traz o essencial

- **WHEN** o ponteiro entra num marcador
- **THEN** aparece o tipo, o número, o título e o texto proposto daquela sugestão

#### Scenario: Acionar o marcador foca o cartão

- **WHEN** o usuário aciona o marcador de uma sugestão
- **THEN** o cartão correspondente recebe destaque de foco

#### Scenario: O resumo fecha ao sair do marcador

- **WHEN** o ponteiro deixa o marcador
- **THEN** o resumo deixa de ser exibido

### Requirement: Filtro por tipo e contagem de pendências

A tela SHALL permitir filtrar as sugestões por tipo — todas, métrica, datas e ATS — e SHALL
exibir quantas sugestões continuam pendentes. Filtrar SHALL NOT alterar marcações nem
remover sugestões do conjunto.

#### Scenario: Filtro por tipo mostra só aquele tipo

- **WHEN** o usuário filtra por datas
- **THEN** apenas os cartões de sugestões de data são listados

#### Scenario: Filtro não altera o conjunto marcado

- **WHEN** o usuário marca uma sugestão e depois filtra por outro tipo
- **THEN** a sugestão marcada continua no conjunto entregue

#### Scenario: Pendências contam o que não foi tratado

- **WHEN** há cinco sugestões e o usuário marca duas
- **THEN** a contagem de pendências mostra três

#### Scenario: Filtro sem resultado informa

- **WHEN** o filtro selecionado não tem nenhuma sugestão
- **THEN** a tela informa que não há sugestões daquele tipo

### Requirement: Pontuação de ATS projetada na tela

A tela SHALL exibir a pontuação de ATS calculada sobre o conjunto marcado, e ela SHALL subir
conforme o usuário marca sugestões.

#### Scenario: Pontuação sobe ao marcar

- **WHEN** o usuário marca uma sugestão
- **THEN** a pontuação exibida é maior que a anterior

#### Scenario: Pontuação reflete o conjunto marcado, não o total

- **WHEN** existem sugestões não marcadas
- **THEN** a pontuação exibida é a do conjunto marcado, e não a de todas as sugestões

### Requirement: Aviso de datas organizadas na revisão

Quando a geração de sugestões de data tiver indicado inferência, a tela SHALL exibir o aviso
de que as datas foram organizadas. Sem inferência, o aviso SHALL NOT ser exibido.

#### Scenario: Inferência exibe o aviso na tela

- **WHEN** a revisão recebe o resultado de datas indicando que o aviso é necessário
- **THEN** o aviso de datas organizadas é exibido

#### Scenario: Sem inferência, sem aviso na tela

- **WHEN** o resultado de datas não exige o aviso
- **THEN** nenhum aviso de datas é exibido

### Requirement: Interface bilíngue, currículo intocado

Todo texto de interface desta etapa SHALL vir do módulo de i18n, em português e inglês.
Trocar o idioma da interface SHALL NOT alterar nenhum texto do currículo nem das sugestões.

#### Scenario: Rótulos da revisão mudam com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** os rótulos, filtros e ações da revisão aparecem em inglês

#### Scenario: Conteúdo do currículo não é traduzido na revisão

- **WHEN** o idioma da interface é trocado
- **THEN** o texto do currículo e o texto das sugestões permanecem como estão

#### Scenario: Nenhum texto fixo em componente na revisão

- **WHEN** os componentes desta etapa são inspecionados
- **THEN** nenhum texto de interface aparece escrito diretamente no componente

### Requirement: Vazio e ausência de sugestões

Quando não houver sugestão alguma, a tela SHALL informar isso e SHALL continuar exibindo o
currículo.

#### Scenario: Sem sugestões, o currículo continua visível

- **WHEN** a revisão é aberta para um currículo sem nenhuma sugestão
- **THEN** o currículo é exibido, sem marcadores, e a tela informa que não há sugestões
