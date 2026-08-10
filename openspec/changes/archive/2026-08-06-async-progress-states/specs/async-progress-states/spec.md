## Purpose

Dá às três operações assíncronas do fluxo (importar, analisar, exportar) um estado de
progresso próprio, nomeado por etapa conhecida, mais uma tela de conclusão para a
exportação — substituindo o aviso de espera genérico por um contrato de máquina de
estados reutilizável pela UI e, depois, por integração real de progresso do backend.

## ADDED Requirements

### Requirement: Máquina de estados por operação

Cada operação assíncrona (importar, analisar, exportar) SHALL ser modelada como uma
máquina de estados explícita com um modo (`idle`, `running`, `done` ou `error`) e, quando
`running`, um índice de etapa nomeada corrente dentre uma lista fixa de etapas da
operação. O componente SHALL sempre saber qual etapa está ativa; não SHALL existir
booleano solto de carregamento sem etapa associada.

#### Scenario: A etapa ativa é sempre conhecida
- **WHEN** uma operação está em `running`
- **THEN** existe uma etapa nomeada corrente, e o componente pode indicar qual é

#### Scenario: Concluída, a operação sai do modo de execução
- **WHEN** a última etapa nomeada de uma operação termina
- **THEN** a operação passa a `done` e o cartão de progresso correspondente sai de tela

### Requirement: Timer simulado por etapa nomeada

Cada etapa nomeada de cada operação SHALL avançar automaticamente a cada aproximadamente
620ms, no protótipo. O nome de cada etapa SHALL ser o mesmo identificador que a integração
real (SSE, polling ou stream do backend) usará para reportar progresso — a troca do timer
simulado pelo evento real SHALL NOT exigir mudança na UI que consome o estado.

#### Scenario: Etapas avançam sozinhas no protótipo
- **WHEN** uma operação está em `running` e nenhum evento real de backend existe
- **THEN** a etapa corrente avança para a próxima a cada ~620ms, até a última

### Requirement: Uma operação assíncrona por vez

Iniciar uma nova operação (import, análise ou exportação) SHALL cancelar o timer ou
assinatura de uma operação anterior ainda em `running`. Desmontar o componente que hospeda
uma operação em `running` SHALL limpar o timer, sem deixar intervalo pendente.

#### Scenario: Nova operação cancela a anterior
- **WHEN** uma operação está em `running` e uma nova é iniciada
- **THEN** o timer da anterior é cancelado antes do novo começar

#### Scenario: Desmontar limpa o timer
- **WHEN** um componente com uma operação em `running` é desmontado
- **THEN** nenhum timer da operação continua ativo depois disso

### Requirement: Progresso de importação por etapa nomeada

Ao selecionar ou soltar um arquivo na etapa 01, a dropzone SHALL ser substituída por um
cartão de progresso — não apenas desabilitada. O cartão SHALL exibir o nome do arquivo, o
percentual concluído alinhado à direita, uma barra de 10 segmentos (preenchidos
proporcionalmente às etapas concluídas, não uma barra contínua de largura livre) e um
checklist de 4 etapas nomeadas: extrair texto, separar cabeçalho/experiências/formação,
normalizar datas e cargos, marcar bullets sem métrica. Cada etapa do checklist SHALL
indicar seu estado — concluída, em andamento ou pendente — por ícone e cor de texto
distintos. Ao concluir, o cartão de progresso SHALL sair e o cartão de arquivo importado
mais o campo de área de atuação SHALL entrar.

#### Scenario: Selecionar arquivo troca a dropzone pelo progresso
- **WHEN** o usuário seleciona ou solta um arquivo válido
- **THEN** a dropzone desaparece e o cartão de progresso de importação aparece no lugar
  dela, não sobreposto nem desabilitado por cima

#### Scenario: O checklist de importação nomeia as quatro etapas
- **WHEN** o cartão de progresso de importação está visível
- **THEN** as quatro etapas — extrair texto, separar seções, normalizar datas e cargos,
  marcar bullets sem métrica — aparecem na ordem, cada uma com o ícone do seu estado

#### Scenario: Concluída, a importação troca o progresso pela confirmação
- **WHEN** a quarta etapa do checklist de importação termina
- **THEN** o cartão de progresso sai e entram o cartão de arquivo importado e o campo de
  área de atuação

### Requirement: Progresso de análise por IA com painel de revisão bloqueado

Clicar em "Avançar" na etapa 02 SHALL levar imediatamente à etapa 03 já em estado de
análise. O painel de revisão (currículo e sugestões) SHALL NOT renderizar enquanto a
análise está em andamento — a condição de exibição é `reviewReady = step === 3 &&
!analysing`. A tela de análise SHALL exibir um checklist de 5 etapas nomeadas: ler versão
importada, incorporar atualizações, procurar resultados sem número, checar datas
sobrepostas e formatos, aplicar regras de leitura automática — cada uma com uma nota
lateral de contagem (número de experiências, itens novos, bullets, conflitos, itens ATS).
Abaixo do checklist, um bloco de skeleton com três barras SHALL exibir animação de
shimmer.

#### Scenario: Avançar já entra em estado de análise
- **WHEN** o usuário clica em "Avançar" na etapa 02
- **THEN** a etapa 03 é exibida imediatamente em estado de análise, e o realce do rail
  permanece na etapa 03

#### Scenario: O painel de revisão não aparece durante a análise
- **WHEN** `step === 3` e a análise ainda está em andamento
- **THEN** o painel de revisão (currículo e sugestões) não é renderizado

#### Scenario: O painel de revisão aparece quando a análise termina
- **WHEN** `step === 3` e a análise termina
- **THEN** `reviewReady` se torna verdadeiro e o painel de revisão é renderizado

#### Scenario: O checklist de análise nomeia as cinco etapas com contagem
- **WHEN** a tela de análise está visível
- **THEN** as cinco etapas aparecem na ordem, cada uma com ícone de estado e uma nota
  lateral de contagem

### Requirement: Progresso de exportação por arquivo

Ao clicar em baixar na etapa 04, o formulário inteiro (seleção de idioma e formato, campo
de nome de arquivo, checklist de garantias) SHALL sair de tela, e apenas o cartão de
progresso de exportação SHALL permanecer. O cartão SHALL exibir um contador "N de M"
alinhado à direita do título e uma lista de arquivos derivada da combinação de idiomas e
formatos selecionados pelo usuário, com o nome de download real de cada arquivo (por
exemplo `curriculo-<nome>-pt.pdf`, `resume-<nome>-en.docx`). Cada arquivo da lista SHALL
ter um dos três estados de ícone, com no máximo um arquivo "em andamento" por vez. O
rótulo do botão de download SHALL contar as seleções antes de disparar a geração: nenhuma
seleção desabilita o botão com o texto de "selecione idioma e formato"; uma seleção mostra
"baixar 1 arquivo"; mais de uma mostra "baixar N arquivos".

#### Scenario: Clicar em baixar substitui o formulário pelo progresso
- **WHEN** o usuário aciona o download com ao menos uma combinação de idioma e formato
  marcada
- **THEN** o formulário de seleção sai de tela e o cartão de progresso de exportação
  aparece sozinho

#### Scenario: A lista de arquivos reflete a seleção do usuário
- **WHEN** o cartão de progresso de exportação está visível
- **THEN** a lista mostra um item por combinação de idioma × formato marcada, com o nome
  de download real de cada arquivo

#### Scenario: Só um arquivo está em andamento por vez
- **WHEN** o cartão de progresso de exportação está gerando os arquivos
- **THEN** no máximo um item da lista está no estado "em andamento" a cada momento

#### Scenario: O rótulo do botão de download conta a seleção
- **WHEN** o usuário ainda não acionou o download
- **THEN** o rótulo do botão é "selecione idioma e formato" (desabilitado) sem seleção,
  "baixar 1 arquivo" com uma combinação, ou "baixar N arquivos" com mais de uma

### Requirement: Tela de conclusão da exportação

Ao terminar a geração de todos os arquivos, a tela de conclusão SHALL substituir por
completo o formulário e o cartão de progresso — as duas SHALL ser mutuamente exclusivas. A
tela SHALL exibir: um círculo de confirmação com ícone de check; um título de conclusão;
um parágrafo de agradecimento citando a quantidade de arquivos baixados; um bloco listando
cada arquivo gerado; um bloco de orientação de uso antes de enviar o currículo; e três
ações — baixar de novo (repete a geração), ajustar e exportar outra versão (volta à etapa
03 e limpa o estado de conclusão) e começar um novo currículo (volta à etapa 01,
descartando a importação e as sugestões aceitas/dispensadas).

#### Scenario: A conclusão substitui form e progresso
- **WHEN** a geração de todos os arquivos termina
- **THEN** nem o formulário de seleção nem o cartão de progresso são exibidos — só a tela
  de conclusão

#### Scenario: A conclusão lista os arquivos gerados
- **WHEN** a tela de conclusão é exibida
- **THEN** o bloco de arquivos lista cada arquivo que foi gerado nesta exportação

#### Scenario: Baixar de novo repete a geração
- **WHEN** o usuário aciona "baixar de novo" na tela de conclusão
- **THEN** a geração é repetida com a mesma seleção de idioma e formato

#### Scenario: Ajustar e exportar outra versão volta à revisão
- **WHEN** o usuário aciona "ajustar e exportar outra versão"
- **THEN** o fluxo volta à etapa 03 e o estado de conclusão da exportação é limpo

#### Scenario: Começar um novo currículo reseta o fluxo
- **WHEN** o usuário aciona "começar um novo currículo"
- **THEN** o fluxo volta à etapa 01, e a importação e as sugestões aceitas/dispensadas são
  descartadas

### Requirement: Erro e nova tentativa por operação

Cada uma das três operações assíncronas (importar, analisar, exportar) SHALL ter um
estado de erro próprio que substitui o cartão de progresso quando a operação falha,
explica o que falhou em linguagem do usuário — não a mensagem repassada do serviço — e
oferece uma ação de tentar de novo que reinicia a mesma operação do zero.

#### Scenario: Falha na importação oferece nova tentativa
- **WHEN** a operação de importação falha
- **THEN** o cartão de progresso de importação é substituído por um aviso de erro com
  ação de tentar de novo, e a dropzone volta a ficar disponível ao tentar

#### Scenario: Falha na análise oferece nova tentativa
- **WHEN** a operação de análise falha
- **THEN** a tela de análise é substituída por um aviso de erro com ação de tentar de novo

#### Scenario: Falha na exportação oferece nova tentativa
- **WHEN** a operação de exportação falha
- **THEN** o cartão de progresso de exportação é substituído por um aviso de erro com
  ação de tentar de novo, e o formulário de seleção volta a ficar disponível

### Requirement: Acessibilidade do progresso

Cada cartão de progresso SHALL ter `role="status"` e conter uma região
`aria-live="polite"` que anuncia a etapa nomeada corrente quando ela muda. Quando
`prefers-reduced-motion: reduce` está ativo, o spinner e a animação de shimmer SHALL ser
desligados, mas o texto da etapa corrente SHALL continuar visível como indicador de
progresso.

#### Scenario: A etapa corrente é anunciada
- **WHEN** a etapa nomeada corrente de uma operação muda
- **THEN** a região `aria-live="polite"` do cartão anuncia a nova etapa

#### Scenario: Redução de movimento desliga spinner e shimmer sem esconder o texto
- **WHEN** `prefers-reduced-motion: reduce` está ativo e uma operação está em `running`
- **THEN** o spinner e o shimmer não animam, e o nome da etapa corrente continua visível
