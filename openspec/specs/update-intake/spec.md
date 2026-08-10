# update-intake Specification

## Purpose
Coletar o que mudou na carreira do usuário desde o currículo importado — formação,
experiência, habilidades —, com uma tela em que adicionar é sempre deliberado e nada digitado
se perde. Período que a importação deixou sem mês é resolvido depois, na revisão, como
sugestão de data.
## Requirements
### Requirement: Seções da etapa

A tela SHALL apresentar três seções empilhadas — Formação e certificações, Experiências e
promoções, Novas habilidades — cada uma com ícone, rótulo e contador de itens. O contador
SHALL concordar em número com a quantidade de itens.

A ação de adicionar SHALL existir **uma única vez por seção**: no cabeçalho quando a seção
tem ao menos um item, e dentro do bloco de estado vazio quando não tem nenhum. Seção vazia
SHALL NOT exibir os dois — o bloco vazio já é o convite, e repetir o botão acima dele dá
duas portas para a mesma coisa.

O cabeçalho SHALL reservar altura mínima para que a linha não encolha quando o botão sai.

#### Scenario: As três seções aparecem

- **WHEN** a etapa 02 é exibida
- **THEN** as seções de formação, experiências e habilidades aparecem nessa ordem, cada uma
  com o seu contador

#### Scenario: Contador acompanha os itens

- **WHEN** o usuário adiciona duas formações
- **THEN** o contador da seção de formação passa a indicar dois itens

#### Scenario: Contador concorda em número

- **WHEN** uma seção tem exatamente um item
- **THEN** o contador diz "1 item", no singular, e passa ao plural a partir de dois

#### Scenario: Seção vazia não repete o botão de adicionar

- **WHEN** uma seção não tem nenhum item
- **THEN** o botão de adicionar aparece só dentro do bloco vazio, e não no cabeçalho da
  seção

#### Scenario: Seção com item traz o botão no cabeçalho

- **WHEN** o primeiro item de uma seção é criado
- **THEN** o bloco vazio sai de tela e o botão de adicionar passa a aparecer no cabeçalho

### Requirement: Bloco de estado vazio

Uma seção sem itens SHALL exibir um bloco de contorno tracejado com: o ícone da seção, uma
frase dizendo que não há item novo, uma frase de apoio explicando o que entra ali, e o botão
de adicionar daquele tipo. O fundo do bloco SHALL ser mais escuro que o do cartão de item —
é espaço a preencher, não conteúdo.

A frase de apoio SHALL dizer o que a pessoa deve registrar naquela seção, e no caso da
formação SHALL deixar claro que o que veio do arquivo importado continua no currículo.

#### Scenario: Lista vazia explica o vazio

- **WHEN** uma seção não tem nenhum item novo
- **THEN** ela exibe o bloco tracejado com a frase de que não há item novo e a frase de
  apoio, em vez de parecer que o currículo está vazio

#### Scenario: O vazio da formação preserva o que foi importado

- **WHEN** a seção de formação não tem nenhum item novo
- **THEN** a frase de apoio diz que as do arquivo importado seguem no currículo

### Requirement: Adicionar por modal

Adicionar item SHALL acontecer sempre por modal, nunca por linha em branco inline. O modal
SHALL trazer o título correspondente ao tipo, os campos daquele tipo e as ações Cancelar e
Adicionar. Ele SHALL fechar ao clicar no overlay e SHALL NOT fechar ao clicar dentro da
caixa. Cancelar SHALL descartar o rascunho sem criar item.

#### Scenario: Modal abre com o tipo certo

- **WHEN** o usuário aciona "Adicionar experiência"
- **THEN** o modal abre com o título de nova experiência e os campos de empresa, cargo,
  início, fim e entregas

#### Scenario: Adicionar cria o item

- **WHEN** o usuário preenche o modal e confirma
- **THEN** o modal fecha e o item aparece na sua seção, ao fim da lista

#### Scenario: Cancelar não cria nada

- **WHEN** o usuário preenche o modal e cancela
- **THEN** o modal fecha, nenhum item é criado, e reabrir o modal apresenta campos vazios

#### Scenario: Clique no overlay fecha

- **WHEN** o usuário clica na área escurecida em volta da caixa
- **THEN** o modal fecha sem criar item

#### Scenario: Clique dentro da caixa não fecha

- **WHEN** o usuário clica em qualquer ponto de dentro da caixa do modal
- **THEN** o modal continua aberto

#### Scenario: Não existe linha em branco inline

- **WHEN** a tela é inspecionada em qualquer seção
- **THEN** não há campo de item vazio fora do modal esperando preenchimento

### Requirement: Campos controlados

Todo campo de item SHALL ser controlado por estado. Editar um campo SHALL alterar apenas o
item correspondente, e remover um item SHALL apagar exatamente aquele item, preservando o
que foi digitado nos demais.

#### Scenario: Edição atinge só o item editado

- **WHEN** existem três experiências e o usuário altera o cargo da segunda
- **THEN** apenas a segunda muda, e as outras duas permanecem como estavam

#### Scenario: Remover apaga o item certo

- **WHEN** existem três formações preenchidas e o usuário remove a do meio
- **THEN** restam as duas outras, com o conteúdo intacto

#### Scenario: Remover não embaralha o que foi digitado

- **WHEN** o usuário digita em várias experiências e remove uma delas
- **THEN** nenhum texto migra de um item para outro

### Requirement: Campos por tipo de item

Cada tipo SHALL ter os seus campos: formação com curso, instituição, início e conclusão;
experiência com empresa, cargo, início, fim e o que foi entregue; habilidade com o nome da
habilidade.

#### Scenario: Campos da formação

- **WHEN** um item de formação é exibido
- **THEN** ele apresenta curso, instituição, início e conclusão

#### Scenario: Campos da experiência

- **WHEN** um item de experiência é exibido
- **THEN** ele apresenta empresa, cargo, início, fim e uma área de texto para o que foi
  entregue, com indicação de que números ajudam

#### Scenario: Campo da habilidade

- **WHEN** um item de habilidade é exibido
- **THEN** ele apresenta o nome da habilidade e a ação de removê-lo

### Requirement: Datas com mês e ano

Todo campo de data SHALL aceitar mês e ano no formato `mm/aaaa` — a convenção do português —
e também o mês por extenso em inglês (`Mar 2022`, `March 2022`, `mar/2022`), que é a
convenção do currículo em inglês. Data com mês fora de 1–12, ano implausível ou formato
irreconhecível SHALL ser recusada com mensagem visível. Fim anterior ao início SHALL ser
recusado. O fim SHALL poder ser declarado em aberto.

#### Scenario: Data válida é aceita

- **WHEN** o usuário informa `03/2022` como início
- **THEN** o campo é aceito sem mensagem de erro

#### Scenario: Mês inválido é recusado

- **WHEN** o usuário informa `13/2022`
- **THEN** o campo exibe mensagem de erro e o item não é aceito enquanto ela existir

#### Scenario: Ano solto é recusado

- **WHEN** o usuário informa apenas `2018` num campo de data
- **THEN** o campo exibe mensagem pedindo mês e ano, e nenhum mês é assumido

#### Scenario: Fim antes do início é recusado

- **WHEN** o usuário informa início `03/2022` e fim `01/2021`
- **THEN** o campo de fim exibe mensagem de erro

#### Scenario: Fim em aberto é aceito

- **WHEN** o usuário marca a experiência como em andamento
- **THEN** o fim é aceito como em aberto, sem exigir data

#### Scenario: Formato em inglês é aceito

- **WHEN** o usuário informa `Mar 2022` como início
- **THEN** o campo é aceito sem mensagem de erro

#### Scenario: Nome de mês em inglês desconhecido é recusado

- **WHEN** o usuário informa `Foo 2022` num campo de data
- **THEN** o campo exibe mensagem de formato inválido

### Requirement: Adicionar exige o essencial

O botão Adicionar do modal SHALL ficar desabilitado enquanto faltar identificador
obrigatório — empresa ou cargo na experiência, curso ou instituição na formação, nome na
habilidade — ou enquanto uma data estiver vazia ou preenchida com valor inválido: o item só
nasce com o período completo. Fim anterior ao início SHALL manter o botão desabilitado.
Experiência em andamento SHALL NOT exigir o fim, já que o campo dele fica desabilitado.

Enquanto se digita, o campo de data SHALL formatar os dígitos no formato `mm/aaaa`, inserindo
a barra depois do mês. Nomes de mês em inglês, aceitos pela importação, SHALL passar sem
reescrita.

#### Scenario: Experiência sem empresa ou cargo não pode ser adicionada

- **WHEN** o modal de experiência está aberto sem empresa ou cargo preenchidos
- **THEN** o botão Adicionar fica desabilitado

#### Scenario: Formação sem curso ou instituição não pode ser adicionada

- **WHEN** o modal de formação está aberto sem curso ou instituição preenchidos
- **THEN** o botão Adicionar fica desabilitado

#### Scenario: Habilidade sem nome não pode ser adicionada

- **WHEN** o modal de habilidade está aberto sem nome preenchido
- **THEN** o botão Adicionar fica desabilitado

#### Scenario: Data inválida ou vazia bloqueia

- **WHEN** um campo de data tem valor inválido, e quando ele está vazio
- **THEN** o valor inválido desabilita o botão Adicionar, e o vazio também

#### Scenario: Data vazia segura o Adicionar até as duas virem

- **WHEN** o início está preenchido mas a conclusão ainda não
- **THEN** o botão Adicionar fica desabilitado até a segunda data vir

#### Scenario: Nenhuma data preenchida também segura o Adicionar

- **WHEN** o modal está aberto sem nenhuma das datas preenchidas
- **THEN** o botão Adicionar fica desabilitado

#### Scenario: Em andamento dispensa o fim

- **WHEN** a experiência está marcada como em andamento
- **THEN** o fim não participa da validação do botão Adicionar

#### Scenario: Formata os dígitos enquanto se digita

- **WHEN** o usuário digita `032022` num campo de data
- **THEN** o campo mostra `03/2022`

#### Scenario: Já formatado, passa sem reescrita

- **WHEN** o usuário digita ou cola `03/2022` num campo de data
- **THEN** o campo mantém `03/2022` sem alteração

#### Scenario: Nome de mês em inglês não é engolido

- **WHEN** o usuário digita `March 2022` num campo de data
- **THEN** o campo mantém o texto exatamente como digitado

#### Scenario: Fim antes do início bloqueia

- **WHEN** o fim informado é anterior ao início
- **THEN** o botão Adicionar fica desabilitado

#### Scenario: Em andamento ignora o fim

- **WHEN** a experiência está marcada como em andamento
- **THEN** o fim não participa da validação do botão Adicionar

### Requirement: Fidelidade ao design

A tela SHALL usar os tokens de `claude-design/styles.css` — cores, espaçamentos, raios e
sombras — sem redefinir valores. As medidas, estados e animações SHALL seguir o handoff: o
modal aparece com sobreposição escurecida e a caixa entra com escala, e a coluna de
conteúdo respeita a largura máxima especificada.

Os controles de formulário SHALL **compor as classes de componente do design system**
(`field`, `input`), como o botão já compõe `btn`, e SHALL NOT manter uma declaração local
concorrente da mesma forma. Componente que redeclara altura, fundo, raio ou borda de um
controle cria uma segunda fonte de verdade, e as duas divergem sem que nada acuse: foi assim
que o campo passou a sair mais baixo que a medida do sistema e com fundo mais escuro que o
cartão que o contém, invertendo a hierarquia de superfícies — o campo é a superfície mais
clara, e o cartão, a mais escura.

#### Scenario: Nenhuma cor fora do design system

- **WHEN** os componentes desta etapa são inspecionados
- **THEN** nenhum valor de cor literal aparece fora de `claude-design/styles.css`

#### Scenario: Os campos compõem a classe do design system

- **WHEN** um campo de texto ou uma área de texto desta etapa é renderizado
- **THEN** ele carrega a classe `input` do design system, e o módulo local não declara para
  ele altura, fundo, raio nem borda próprios

#### Scenario: O campo é mais claro que o cartão que o contém

- **WHEN** um item preenchido é exibido
- **THEN** o fundo do campo é a superfície do design system e o do cartão é a do cartão, com
  o campo mais claro que o cartão

#### Scenario: Modal segue a forma do handoff

- **WHEN** o modal é aberto
- **THEN** ele aparece centralizado na tela — horizontal e verticalmente —, sobre overlay
  escurecido, com caixa de largura fixa limitada pela largura da tela, cantos arredondados
  e a animação de entrada descrita no handoff

### Requirement: Interface bilíngue, conteúdo intocado

Todo texto de interface desta etapa SHALL vir do módulo de i18n, em português e inglês.
Trocar o idioma da interface SHALL NOT alterar nenhum texto que o usuário digitou nem
nenhum conteúdo do currículo.

#### Scenario: Rótulos mudam com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** os rótulos, botões e textos de estado vazio aparecem em inglês

#### Scenario: Conteúdo do usuário não é traduzido

- **WHEN** o usuário digita uma experiência em português e troca o idioma da interface
- **THEN** o texto digitado permanece exatamente como foi escrito

#### Scenario: Nenhum texto fixo em componente

- **WHEN** os componentes desta etapa são inspecionados
- **THEN** nenhum texto de interface aparece escrito diretamente no componente

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


