# app-shell-navigation Specification

## Purpose
O shell do aplicativo e a navegação entre as quatro etapas, mais a etapa 01 (importar) e a
etapa 04 (exportar) — o fio que liga o arquivo que o usuário envia ao arquivo que ele baixa.
## Requirements
### Requirement: Navegação entre as quatro etapas

O aplicativo SHALL apresentar quatro etapas — importar, atualizar, revisar e exportar — e
SHALL permitir avançar e voltar entre elas. A etapa atual SHALL ser indicada, e avançar além
da quarta ou voltar antes da primeira SHALL NOT ser possível.

#### Scenario: A etapa atual é indicada

- **WHEN** o aplicativo está numa etapa
- **THEN** o stepper indica qual é, e o conteúdo exibido é o dela

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
  stepper

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

### Requirement: Seleção de saídas na etapa 04

A etapa 04 SHALL permitir escolher idiomas (português e inglês) e formatos (PDF e DOCX), e
SHALL indicar quantos arquivos serão gerados. Com nenhuma combinação escolhida, a ação de
baixar SHALL NOT estar disponível. A contagem SHALL ser verificada onde ela aparece para o
usuário — no rótulo do botão de download —, e não numa função de estado que só o teste
chame.

#### Scenario: A contagem reflete idiomas vezes formatos

- **WHEN** o usuário marca dois idiomas e dois formatos
- **THEN** o botão de download anuncia quatro arquivos

#### Scenario: Sem seleção não há download

- **WHEN** nenhum idioma ou nenhum formato está marcado
- **THEN** a ação de baixar não está disponível

#### Scenario: Uma combinação gera um arquivo

- **WHEN** o usuário marca um idioma e um formato
- **THEN** o botão de download anuncia um arquivo

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
português e inglês, inclusive os rótulos acessíveis. Trocar o idioma da interface SHALL NOT
alterar o conteúdo do currículo nem as saídas escolhidas. O idioma escolhido SHALL
sobreviver ao recarregamento e à troca de página, no navegador em que foi escolhido.

#### Scenario: Rótulos do shell mudam com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** os nomes das etapas e as ações de navegação aparecem em inglês

#### Scenario: Trocar o idioma da interface não muda as saídas escolhidas

- **WHEN** o usuário escolhe exportar em português e troca o idioma da interface para inglês
- **THEN** a saída escolhida continua sendo português

#### Scenario: Nenhum texto fixo em componente no shell

- **WHEN** os componentes do shell, da etapa 01 e da etapa 04 são inspecionados
- **THEN** nenhum texto de interface aparece escrito diretamente no componente

#### Scenario: O rótulo acessível do caminho de volta muda com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** o rótulo acessível do caminho de volta à home aparece em inglês

#### Scenario: O idioma escolhido sobrevive a uma nova visita

- **WHEN** o usuário troca o idioma para inglês e volta ao app depois, numa nova visita
- **THEN** a interface aparece em inglês, sem que ele escolha de novo

### Requirement: O que foi digitado na etapa 02 alimenta o fluxo

O aplicativo SHALL manter o que o usuário digitou na etapa 02 e SHALL entregar às etapas 03 e
04 o **currículo em trabalho** — o importado mais o que foi digitado. Etapa 02 sem nada
digitado SHALL entregar o currículo importado inalterado. Voltar à etapa 02 e alterar o que
foi digitado SHALL recompor o currículo em trabalho a partir do importado, nunca somar ao
resultado anterior.

#### Scenario: O que foi digitado chega à revisão

- **WHEN** o usuário digita uma experiência na etapa 02 e avança para a etapa 03
- **THEN** o currículo exibido na revisão contém aquela experiência

#### Scenario: O que foi digitado chega à exportação

- **WHEN** o usuário digita uma formação e exporta
- **THEN** o currículo enviado à exportação contém aquela formação

#### Scenario: Etapa 02 vazia não muda o currículo

- **WHEN** o usuário passa pela etapa 02 sem digitar nada
- **THEN** o currículo que segue para as etapas seguintes é exatamente o importado

#### Scenario: Editar a etapa 02 recompõe sem acumular

- **WHEN** o usuário volta à etapa 02, remove uma experiência que tinha digitado e avança de
  novo
- **THEN** o currículo em trabalho já não contém aquela experiência

### Requirement: Material do usuário enviado às sugestões

O aplicativo SHALL enviar às rotas de sugestão, junto do currículo, o texto que o usuário
digitou na etapa 02 e que não virou item do currículo. Esse texto SHALL ser usado apenas como
material do usuário para conferir números propostos, e SHALL NOT entrar no currículo.

#### Scenario: Item sem empresa não é adicionado nem vira sobra

- **WHEN** o usuário tenta adicionar uma experiência sem empresa
- **THEN** o botão de adicionar fica desabilitado, nenhum item é criado e nenhum texto dele
  acompanha o pedido de sugestões

#### Scenario: Sem sobra, o pedido não carrega material extra

- **WHEN** tudo que o usuário digitou virou item do currículo
- **THEN** o pedido de sugestões não carrega material extra

### Requirement: Sugestão que já não resolve não chega à exportação

O aplicativo SHALL enviar à exportação apenas as sugestões marcadas cujo trecho ainda existe
no currículo em trabalho. Sugestão marcada sobre um item que o usuário depois removeu SHALL
ser descartada em silêncio, sem impedir a exportação.

#### Scenario: Sugestão de item removido não vai à exportação

- **WHEN** o usuário marca uma sugestão, volta à etapa 02 e remove o item que ela endereça
- **THEN** a exportação não recebe aquela sugestão e o download continua disponível

#### Scenario: Sugestão que ainda resolve continua indo

- **WHEN** existem sugestões marcadas sobre trechos que continuam no currículo
- **THEN** todas elas chegam à exportação

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

### Requirement: Caminho de volta à home na top bar

A top bar do aplicativo SHALL oferecer um caminho de volta à home, com ícone de seta à
esquerda e separado da marca por um divisor. Ele SHALL levar à raiz do site e SHALL ser
distinguível, para tecnologia assistiva, do "Voltar" da navegação de etapa — os dois exibem a
mesma palavra e têm destinos diferentes. Ele SHALL NOT alterar a etapa atual.

#### Scenario: A top bar leva de volta à home

- **WHEN** o aplicativo é exibido em qualquer etapa
- **THEN** a top bar apresenta um caminho para a raiz do site

#### Scenario: O caminho de volta é distinguível do voltar de etapa

- **WHEN** os controles do aplicativo são consultados pelo seu rótulo acessível
- **THEN** o caminho de volta à home e o "Voltar" da navegação de etapa têm rótulos
  acessíveis diferentes

#### Scenario: Voltar à home não muda a etapa

- **WHEN** o usuário está na etapa 03 e o caminho de volta à home é exibido
- **THEN** ele é um link para a raiz, e a etapa atual continua sendo a 03

### Requirement: Recusa do arquivo mantém a dropzone na tela

Quando a importação é recusada por causa do **arquivo enviado** — formato não suportado,
arquivo grande demais, documento que não é currículo, ou cota esgotada —, a etapa 01 SHALL
manter a dropzone na tela e exibir a recusa abaixo dela. Ela SHALL NOT trocar a dropzone por
um aviso com botão de nova tentativa.

O próximo passo dessas recusas é escolher outro arquivo, e a dropzone é onde isso se faz.
Substituí-la põe um clique entre a pessoa e a única coisa que ela precisa fazer — e ela
costuma já ter o arquivo certo à mão. As demais falhas continuam no desenho de
`async-progress-states`: rede fora e leitor de PDF que não subiu pedem "tente de novo", e
para essas o botão é o controle certo.

#### Scenario: A etapa 01 diz que o arquivo não é um currículo

- **WHEN** a rota de importação recusa o documento por não ser um currículo
- **THEN** a etapa 01 exibe a recusa e mantém a dropzone disponível, sem botão de nova
  tentativa

### Requirement: A recusa da importação é escrita no idioma da interface

O texto que a pessoa lê para uma recusa da importação SHALL vir do dicionário de interface,
escolhido pelo **código** que a rota devolve, nos dois idiomas. A mensagem que a rota manda
junto é escrita no servidor e sempre em português — ela SHALL servir apenas de último recurso,
para um código que a tela ainda não conheça.

Com a interface em inglês, a mensagem do servidor aparecia em português no meio de tudo o
mais traduzido. O limite de tamanho citado no texto SHALL vir da constante real, e não ser
escrito à mão, para a mensagem não envelhecer se o limite mudar.

#### Scenario: A recusa da importação é escrita no idioma da interface

- **WHEN** a interface está em inglês e a rota recusa o arquivo com uma mensagem em português
- **THEN** a etapa 01 exibe o texto em inglês, do dicionário, e não a mensagem do servidor

### Requirement: Fidelidade ao design do shell

As telas do shell SHALL usar os tokens de `claude-design/styles.css` — cores, espaçamentos,
raios e sombras — sem redefinir valores, e SHALL apresentar os ícones do handoff nos seus
lugares: dropzone, confirmação de importação, navegação de etapa e seleção de saídas. Todo
ícone SHALL ser decorativo: o rótulo de um controle SHALL continuar sendo o seu texto, nunca
o ícone.

#### Scenario: Nenhuma cor fora do design system no shell

- **WHEN** os componentes e estilos do shell são inspecionados
- **THEN** nenhum valor de cor literal aparece fora de `claude-design/styles.css`

#### Scenario: Os ícones do handoff estão nos seus lugares

- **WHEN** as etapas 01 e 04 e a navegação de etapa são exibidas
- **THEN** a dropzone, a navegação de etapa e o botão de download apresentam os seus ícones

#### Scenario: Ícone não vira rótulo de controle

- **WHEN** os controles do shell são consultados pelo seu rótulo acessível
- **THEN** cada rótulo é o texto do controle, e os ícones não são anunciados

### Requirement: Uma única top bar no produto

A top bar do aplicativo e a da home SHALL ser a mesma — mesma marca, mesmo toggle de idioma e
mesma aparência. Uma diferença de estilo entre as duas SHALL ser tratada como defeito.

#### Scenario: As duas telas usam a mesma top bar

- **WHEN** a home e o aplicativo são exibidos
- **THEN** as duas apresentam a mesma marca e o mesmo toggle de idioma, com a mesma aparência

### Requirement: Stepper horizontal no topo do conteúdo

A navegação entre etapas SHALL ser um stepper **horizontal**, no topo da área de conteúdo e
na mesma largura dela, com os quatro passos em linha. Ele SHALL NOT ter faixa própria — nem
fundo, nem borda, nem sombra: flutua sobre o fundo da página. Cada passo SHALL exibir um
círculo com o ícone da etapa e um rótulo numerado na mesma string (`1. Importar`), sem zero à
esquerda e sem cor ou tamanho próprios para o número. O passo já cumprido SHALL trocar o
ícone por um check, e o conector entre dois passos SHALL indicar percurso concluído apenas
quando **ambos** já tiverem sido cumpridos — o conector que chega no passo atual é caminho em
curso, não percorrido.

Era uma coluna lateral de 236px, que tirava largura de todas as etapas para mostrar quatro
palavras. Em linha, o stepper custa uma faixa de altura e devolve a página inteira ao
conteúdo, e o percurso passa a ser lido no sentido em que acontece.

#### Scenario: Os quatro passos aparecem em linha, numerados no rótulo

- **WHEN** o aplicativo é exibido
- **THEN** os quatro passos aparecem em ordem, cada um rotulado com o seu número e o seu
  nome numa única string

#### Scenario: O stepper não tem faixa própria em volta

- **WHEN** o estilo do stepper é inspecionado
- **THEN** ele não declara fundo, borda nem sombra próprios

#### Scenario: Passo cumprido é marcado como cumprido

- **WHEN** o aplicativo está numa etapa posterior à primeira
- **THEN** o passo já cumprido é apresentado de forma distinta do que ainda não foi, e só o
  passo atual é anunciado como o atual

### Requirement: Coluna de conteúdo comum às etapas

Todas as etapas SHALL desenhar o conteúdo na **mesma coluna**: mesma largura máxima, mesmo
recuo e centralizada na área de conteúdo. A medida SHALL viver num único lugar, e cada etapa
SHALL compô-la — nenhuma SHALL declarar largura ou recuo próprios de coluna. O rodapé de
navegação SHALL acompanhar essa coluna, com a régua casando com a largura do conteúdo.

Cada etapa tinha a sua largura, e nenhuma era centralizada: trocar de etapa mexia a coluna de
lugar e de tamanho no meio de um fluxo que é uma coisa só. Uma etapa que precise de mais
espaço SHALL rearranjar o próprio conteúdo dentro da coluna, e não alargar a coluna.

#### Scenario: As etapas partilham a mesma coluna

- **WHEN** o conteúdo de cada etapa é inspecionado
- **THEN** todas usam a mesma classe de coluna, definida uma única vez, e nenhuma delas
  declara largura máxima ou recuo de coluna próprios

#### Scenario: O rodapé acompanha a coluna

- **WHEN** o rodapé de navegação é exibido
- **THEN** ele é centralizado com a mesma largura do conteúdo da coluna, e a régua do topo
  não ultrapassa esse limite

#### Scenario: A revisão empilha currículo e sugestões

- **WHEN** a etapa 03 é exibida
- **THEN** o currículo ocupa a linha inteira e o painel de sugestões vem abaixo dele, dentro
  da mesma coluna das demais etapas

### Requirement: A animação de entrada das etapas é desligável

A animação com que cada etapa entra SHALL respeitar a preferência de movimento do sistema:
quem pede menos movimento SHALL ver a etapa sem transição, com todo o conteúdo no lugar.
Nenhuma etapa SHALL depender da animação para ficar legível.

#### Scenario: Menos movimento, sem transição de etapa

- **WHEN** o sistema pede menos movimento
- **THEN** as etapas do aplicativo não animam a entrada, e o conteúdo aparece no estado final

#### Scenario: A revisão também obedece

- **WHEN** o sistema pede menos movimento e a etapa 03 é aberta
- **THEN** o currículo e o painel de sugestões aparecem sem transição

### Requirement: A espera é anunciada

Toda etapa que espera por uma chamada demorada SHALL exibir um aviso enquanto espera,
dizendo o que está acontecendo e que recarregar a página faz o fluxo recomeçar do zero —
não há armazenamento, e o arquivo é descartado. O aviso SHALL ser anunciado a tecnologia
assistiva.

O aviso SHALL apresentar progresso por etapa nomeada e concluída, quando a operação tiver
etapas conhecidas — é o caso das três operações cobertas pela capability
`async-progress-states` (importar, analisar, exportar). O aviso SHALL NOT apresentar
progresso estimado por tempo: nem contagem regressiva, nem percentual calculado sobre
duração esperada. A distinção é entre duas categorias diferentes de "quanto falta" —
quantas etapas nomeadas já terminaram (conhecido, e por isso mostrável) e quanto tempo
resta (desconhecido, porque a variação medida na mesma etapa foi de mais do que o dobro, e
por isso continua fora da tela).

#### Scenario: A importação anuncia a espera
- **WHEN** um arquivo é enviado e a importação começa
- **THEN** a etapa 01 exibe o cartão de progresso com a etapa nomeada corrente e o alerta
  sobre recarregar

#### Scenario: A revisão anuncia a espera
- **WHEN** o usuário entra na etapa 03 pela primeira vez e a análise começa
- **THEN** a etapa 03 exibe o cartão de progresso com a etapa nomeada corrente

#### Scenario: A exportação anuncia a espera
- **WHEN** o usuário aciona o download
- **THEN** a etapa 04 exibe o cartão de progresso com o contador de arquivos e a etapa
  nomeada corrente

#### Scenario: O aviso não promete progresso
- **WHEN** um cartão de progresso da capability `async-progress-states` é exibido
- **THEN** ele não apresenta contagem regressiva nem percentual calculado sobre duração
  esperada — o que ele mostra é etapa nomeada concluída, não tempo restante

#### Scenario: Sem espera, sem aviso
- **WHEN** nenhuma etapa está esperando por uma operação
- **THEN** nenhum cartão de progresso é exibido

### Requirement: Nada é acionável duas vezes durante a espera

Enquanto uma etapa espera por uma chamada, o aplicativo SHALL impedir que a mesma operação
seja disparada de novo e SHALL impedir a navegação entre etapas. A espera SHALL terminar
liberando tudo, inclusive quando a chamada falha.

#### Scenario: Não se navega durante o carregamento das sugestões

- **WHEN** as sugestões estão sendo pedidas
- **THEN** as ações de avançar, voltar e trocar de etapa pelo stepper ficam indisponíveis

#### Scenario: Não se baixa duas vezes

- **WHEN** a exportação está em andamento
- **THEN** a ação de baixar fica indisponível até ela terminar

#### Scenario: Falha libera as ações

- **WHEN** uma chamada falha durante a espera
- **THEN** o aviso de espera some e as ações voltam a ficar disponíveis

### Requirement: Cota esgotada é anunciada como tal

Quando uma etapa que chama IA recebe resposta de limite de uso excedido, ela SHALL exibir um
aviso dizendo que o limite de uso gratuito acabou e convidando a tentar de novo mais tarde. O
aviso SHALL NOT prometer prazo: o mesmo 429 cobre janelas diferentes — por minuto, por dia,
por gasto —, e o que a resposta traz de documentado é só o status. Dizer "24 horas" a quem
estourou o limite por minuto manda a pessoa embora por um dia inteiro sem motivo. O aviso
SHALL ser distinguível da falha genérica, SHALL vir do dicionário de interface nos dois
idiomas, e SHALL NOT exibir mensagem repassada do serviço. A etapa SHALL continuar onde está
e SHALL liberar as ações, para que a pessoa possa tentar de novo quando quiser.

O aviso de cota SHALL ser apresentado como **atenção**, e não como falha: ícone de atenção e
paleta âmbar do design system, distinta da paleta de destaque usada nos avisos de falha.
Cota esgotada não é algo que quebrou — é um limite alcançado —, e vestir as duas coisas igual
apaga a diferença justamente onde ela muda o que a pessoa deve fazer a seguir.

Um aviso exibido dentro da coluna de uma etapa SHALL respeitar o recuo lateral dessa coluna,
sem somar recuo próprio, e SHALL manter distância do elemento acima dele. Ele SHALL ocupar a
**mesma largura** do bloco que o precede na coluna: aviso encolhido ao tamanho do próprio
texto termina numa borda direita que não coincide com a de nada, e a tela passa a ter duas
larguras onde deveria ter uma.

#### Scenario: A importação avisa que a cota acabou

- **WHEN** a rota de importação responde limite de uso excedido
- **THEN** a etapa 01 exibe o aviso de cota, sem prometer prazo e sem a mensagem do serviço

#### Scenario: Falha que não é de cota mantém o aviso genérico

- **WHEN** a rota de importação falha por outro motivo
- **THEN** a etapa 01 exibe o aviso de falha comum, sem prometer renovação de limite

#### Scenario: O aviso de cota tem tom de atenção

- **WHEN** o aviso de cota é exibido
- **THEN** ele usa a paleta de atenção do design system, distinta da paleta do aviso de
  falha exibido no mesmo lugar quando a importação falha por outro motivo

#### Scenario: O aviso tem a mesma largura do bloco acima

- **WHEN** o aviso de cota aparece abaixo da dropzone na etapa 01
- **THEN** as duas caixas têm a mesma largura, alinhadas pela esquerda e pela direita, e o
  aviso não encolhe até o tamanho do seu texto

#### Scenario: O aviso não encosta no que está acima dele

- **WHEN** o aviso de cota aparece abaixo da dropzone na etapa 01
- **THEN** há espaço entre os dois, e o aviso começa no mesmo recuo lateral da dropzone,
  sem somar o recuo da coluna da etapa

#### Scenario: A revisão distingue cota de sugestão faltando

- **WHEN** as rotas de sugestão respondem limite de uso excedido
- **THEN** a etapa 03 exibe o aviso de cota, as sugestões de data continuam na tela, e o aviso
  de parte das sugestões não vir não é exibido

#### Scenario: A exportação avisa que a cota acabou

- **WHEN** a rota de exportação responde limite de uso excedido
- **THEN** a etapa 04 exibe o aviso de cota e o botão de download volta a ficar acionável

### Requirement: As caixas de idioma e formato seguem o design system

As caixas de seleção de idioma e de formato da etapa 04 SHALL ser desenhadas pelo design
system — quadradas, raio 4px, cor de destaque quando marcadas — e SHALL NOT ser o controle
padrão do navegador. O elemento que recebe clique, foco e rótulo SHALL continuar sendo um
`input` de caixa de seleção, e marcar SHALL continuar mudando a contagem de saídas.

#### Scenario: As caixas da etapa 04 não são as do navegador

- **WHEN** a etapa 04 é exibida
- **THEN** cada caixa de idioma e de formato tem a forma do design system, com o `input`
  ainda recebendo o clique, o foco e o rótulo

### Requirement: A top bar acompanha a rolagem

A top bar SHALL permanecer visível no topo da janela durante a rolagem da página, em
qualquer etapa. Ela SHALL reservar o próprio espaço no fluxo — nenhum conteúdo SHALL
começar coberto por ela. Na sobreposição, a top bar SHALL ficar acima do papel do currículo
e do resumo do marcador, e SHALL NOT cobrir um modal.

#### Scenario: A top bar continua visível ao rolar

- **WHEN** o conteúdo de uma etapa é mais alto que a janela e a página é rolada
- **THEN** a top bar continua no topo da janela, com a pontuação de ATS e o caminho de volta
  ao alcance

#### Scenario: A top bar não cobre o começo do conteúdo

- **WHEN** a página é exibida sem rolagem
- **THEN** o primeiro conteúdo abaixo da top bar aparece inteiro, sem ficar sob ela

#### Scenario: O modal fica acima da top bar

- **WHEN** um modal é aberto com a página rolada
- **THEN** o modal e o seu fundo cobrem a top bar

### Requirement: Só a preferência de idioma é guardada no navegador

O aplicativo SHALL guardar no navegador exclusivamente o idioma da interface. Currículo
importado, texto digitado na etapa 02, sugestões marcadas ou ignoradas, etapa atual e
saídas escolhidas SHALL NOT ser guardados — eles morrem com a aba, como antes. A
preferência guardada SHALL ser local e anônima, SHALL NOT criar conta, sessão ou
identificação de usuário, e SHALL NOT viajar para o servidor.

Preferência ausente, ilegível ou de idioma que não existe SHALL resultar no idioma padrão,
e armazenamento indisponível SHALL NOT impedir o uso do app nem a troca de idioma na
sessão em curso.

#### Scenario: Nada do currículo é guardado no navegador

- **WHEN** o usuário importa um currículo, digita atualizações, aceita sugestões e recarrega
  a página
- **THEN** o app volta ao começo do fluxo, sem currículo, sem o que foi digitado e sem
  sugestões aceitas — só o idioma permanece

#### Scenario: Preferência guardada inválida não derruba a interface

- **WHEN** o que está guardado não corresponde a nenhum idioma oferecido
- **THEN** a interface aparece no idioma padrão

#### Scenario: Armazenamento indisponível não impede o uso

- **WHEN** o navegador não permite guardar a preferência
- **THEN** o app funciona normalmente e a troca de idioma vale enquanto a aba estiver aberta

### Requirement: Falha total da exportação é sinalizada em atenção

Quando a exportação não entregar nenhum arquivo — seja porque o servidor relatou que não
gerou saída, seja por falha de rede — o aplicativo SHALL exibir o aviso no tom de atenção
(o mesmo já usado para a cota de IA esgotada), não no tom de falha usado por importação e
análise. O aviso SHALL continuar oferecendo tentar de novo.

#### Scenario: Nenhum arquivo gerado usa o tom de atenção

- **WHEN** a exportação não entrega nenhum arquivo
- **THEN** o aviso exibido usa o mesmo tom da cota de IA esgotada, com ícone, e o botão de
  tentar de novo continua disponível

