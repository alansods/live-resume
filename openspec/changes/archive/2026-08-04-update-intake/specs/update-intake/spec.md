## Purpose

Coletar o que mudou na carreira do usuário desde o currículo importado — formação,
experiência, habilidades — e fechar as pendências que a importação deixou abertas, com uma
tela em que adicionar é sempre deliberado, nada digitado se perde e nenhuma data fica sem
mês.

## ADDED Requirements

### Requirement: Seções da etapa

A tela SHALL apresentar três seções empilhadas — Formação e certificações, Experiências e
promoções, Novas habilidades — cada uma com ícone, rótulo, contador de itens e ação de
adicionar. Uma seção sem itens SHALL exibir texto explicando que o conteúdo do arquivo
importado continua no currículo.

#### Scenario: As três seções aparecem

- **WHEN** a etapa 02 é exibida
- **THEN** as seções de formação, experiências e habilidades aparecem nessa ordem, cada uma
  com o seu contador e o seu botão de adicionar

#### Scenario: Contador acompanha os itens

- **WHEN** o usuário adiciona duas formações
- **THEN** o contador da seção de formação passa a indicar dois itens

#### Scenario: Lista vazia explica o vazio

- **WHEN** uma seção não tem nenhum item novo
- **THEN** ela exibe um texto dizendo que o que veio do arquivo importado segue no
  currículo, em vez de parecer que o currículo está vazio

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

Todo campo de data SHALL aceitar mês e ano no formato `mm/aaaa`. Data com mês fora de 1–12,
ano implausível ou formato irreconhecível SHALL ser recusada com mensagem visível. Fim
anterior ao início SHALL ser recusado. O fim SHALL poder ser declarado em aberto.

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

### Requirement: Conclusão dos períodos incompletos da importação

Quando o currículo importado tem períodos incompletos, a tela SHALL apresentá-los para o
usuário informar o mês que faltava, mostrando o texto original como veio do arquivo. O
sistema SHALL NOT preencher o mês por conta própria, e um período completado SHALL deixar
de constar como pendente.

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

### Requirement: Fidelidade ao design

A tela SHALL usar os tokens de `claude-design/styles.css` — cores, espaçamentos, raios e
sombras — sem redefinir valores. As medidas, estados e animações SHALL seguir o handoff: o
modal aparece com sobreposição escurecida e a caixa entra com escala, e a coluna de
conteúdo respeita a largura máxima especificada.

#### Scenario: Nenhuma cor fora do design system

- **WHEN** os componentes desta etapa são inspecionados
- **THEN** nenhum valor de cor literal aparece fora de `claude-design/styles.css`

#### Scenario: Modal segue a forma do handoff

- **WHEN** o modal é aberto
- **THEN** ele aparece sobre overlay escurecido, com caixa de largura fixa limitada pela
  largura da tela, cantos arredondados e a animação de entrada descrita no handoff

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
