## MODIFIED Requirements

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
