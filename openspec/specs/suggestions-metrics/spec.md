# suggestions-metrics Specification

## Purpose
Propor melhorias de conteúdo nos bullets do currículo — transformar atividade em resultado
mensurável e verbo genérico em entrega — entregando cada proposta ancorada ao seu trecho,
única por trecho, e com os números que não puderam ser apoiados no material do usuário
devidamente sinalizados para confirmação.
## Requirements
### Requirement: Modelo de sugestão

Uma sugestão SHALL ter: identificador único, tipo, path do trecho que ela endereça, local
em linguagem de usuário, título, texto atual, texto proposto, justificativa e rótulo da
ação. O texto proposto SHALL estar no idioma do currículo, sem par de idiomas. A ação SHALL
ser um identificador do conjunto conhecido — aplicar, corrigir data, normalizar, reescrever
e converter em texto — nunca o rótulo exibido, que vem do i18n na tela.

#### Scenario: Sugestão traz o que o cartão precisa exibir

- **WHEN** uma sugestão é produzida
- **THEN** ela tem id, tipo, path, local, título, texto atual, texto proposto,
  justificativa e rótulo de ação, todos preenchidos

#### Scenario: Texto atual corresponde ao trecho

- **WHEN** uma sugestão endereça um bullet do currículo
- **THEN** o seu texto atual é exatamente o texto daquele bullet no momento da geração

#### Scenario: Ids são únicos no conjunto

- **WHEN** um conjunto de sugestões é produzido
- **THEN** nenhum identificador se repete

#### Scenario: Ação fora do conjunto conhecido é rejeitada

- **WHEN** uma sugestão é produzida com uma ação que não está no conjunto conhecido
- **THEN** ela não valida contra o modelo de sugestão

### Requirement: Sugestão de métrica ausente

O sistema SHALL propor reescrita para bullets que descrevem atividade sem resultado
mensurável. A proposta SHALL preservar o sentido do que o usuário escreveu e SHALL
acrescentar resultado, escala ou prazo.

#### Scenario: Bullet sem número recebe proposta

- **WHEN** o currículo tem um bullet que descreve uma entrega sem nenhum resultado
  mensurável
- **THEN** é produzida uma sugestão de métrica para aquele bullet, com texto proposto
  diferente do atual

#### Scenario: Bullet que já tem métrica não recebe proposta de métrica

- **WHEN** um bullet já traz número, percentual ou valor
- **THEN** nenhuma sugestão de métrica ausente é produzida para ele

#### Scenario: O sentido do bullet é preservado

- **WHEN** uma sugestão de métrica é produzida para um bullet
- **THEN** o texto proposto continua tratando da mesma entrega, sem trocar a atividade
  descrita

### Requirement: Sugestão de verbo genérico

O sistema SHALL propor reescrita para bullets que começam por construções que descrevem
cargo em vez de entrega — "responsável por", "participei de", "trabalhei com", "atuei em"
e equivalentes. A proposta SHALL começar por verbo de ação.

O texto atual SHALL ser verificado antes da entrega: bullet que já começa por verbo de ação
SHALL NOT receber sugestão de verbo genérico, pela mesma razão que bullet com número não
recebe sugestão de métrica ausente — a sugestão alega um defeito que aquele trecho não tem, e
a pontuação desconta por ela.

#### Scenario: Verbo genérico recebe proposta

- **WHEN** um bullet começa por "Participei da melhoria da qualidade do código"
- **THEN** é produzida uma sugestão de verbo genérico para aquele bullet

#### Scenario: Proposta começa por verbo de ação

- **WHEN** uma sugestão de verbo genérico é produzida
- **THEN** o texto proposto não começa por nenhuma das construções genéricas conhecidas

#### Scenario: Bullet que já começa por verbo de ação recusa proposta de verbo

- **WHEN** a IA devolve uma sugestão de verbo genérico para um bullet que já começa por verbo
  de ação
- **THEN** a sugestão é descartada, e o conjunto entregue não traz sugestão para aquele bullet

### Requirement: Ancoragem validada

Toda sugestão SHALL endereçar um path que resolve no currículo. Sugestão com path que não
resolve, ou que endereça um trecho que não é bullet, SHALL ser descartada antes de ser
entregue — SHALL NOT ser exibida nem contabilizada.

#### Scenario: Path inexistente é descartado

- **WHEN** a IA devolve uma sugestão para um id de bullet que não existe no currículo
- **THEN** ela é descartada, e as demais sugestões válidas são entregues

#### Scenario: Path malformado é descartado

- **WHEN** a IA devolve uma sugestão com path fora das formas endereçáveis do modelo
- **THEN** ela é descartada sem interromper a geração das outras

#### Scenario: Todas as sugestões entregues resolvem

- **WHEN** um conjunto de sugestões é entregue
- **THEN** cada path nele resolve um trecho do currículo

### Requirement: No máximo uma sugestão por trecho

O conjunto entregue SHALL ter no máximo uma sugestão por path. Quando a IA propõe mais de
uma para o mesmo trecho, o sistema SHALL manter uma e descartar as demais.

#### Scenario: Duas propostas para o mesmo bullet viram uma

- **WHEN** a IA devolve duas sugestões para o mesmo path
- **THEN** o conjunto entregue contém apenas uma delas

#### Scenario: Paths distintos convivem

- **WHEN** a IA devolve sugestões para bullets diferentes
- **THEN** todas são entregues

### Requirement: Números não apoiados são sinalizados

Uma sugestão SHALL declarar quais números do texto proposto não aparecem no currículo
importado nem no que o usuário digitou. O sistema SHALL NOT descartar a sugestão por causa
disso — SHALL apenas sinalizar, para que a revisão peça confirmação em vez de deixar o
número passar como fato.

Além de declarar a lista, o sistema SHALL escrever cada um desses números **precedido de
`~`** no texto proposto — "reduzi a fila de tickets em ~20%" —, e SHALL NOT marcar assim os
números que o material do usuário sustenta. A marca é aproximação, não enfeite: o número que
a IA propôs é uma estimativa a confirmar, e ele segue para o currículo exportado se o usuário
marcar a sugestão. Sem a marca, uma estimativa chegaria ao recrutador com a mesma cara de um
dado medido. A marcação SHALL ser feita pelo código a partir da comparação com o material do
usuário, não pedida à IA — quem inventou o número não é quem deve declarar que o inventou —,
e SHALL NOT duplicar o `~` que a proposta já traga.

#### Scenario: Número inédito é sinalizado

- **WHEN** o texto proposto traz "reduziu a latência em 77%" e "77" não aparece em lugar
  nenhum do material do usuário
- **THEN** a sugestão é entregue com esse número na lista de não apoiados

#### Scenario: Número que o usuário escreveu não é sinalizado

- **WHEN** o texto proposto usa um número que já constava do currículo importado ou do que
  o usuário digitou na etapa 02
- **THEN** aquele número não aparece na lista de não apoiados

#### Scenario: Proposta sem número não sinaliza nada

- **WHEN** o texto proposto não contém número algum
- **THEN** a lista de não apoiados vem vazia

#### Scenario: Sinalização não impede a sugestão

- **WHEN** todos os números de uma proposta são inéditos
- **THEN** a sugestão é entregue normalmente, apenas sinalizada

#### Scenario: Número inédito sai marcado com til no texto proposto

- **WHEN** o texto proposto traz "reduzi a fila de tickets em 20%" e "20" não aparece no
  material do usuário
- **THEN** o texto proposto entregue é "reduzi a fila de tickets em ~20%"

#### Scenario: Número apoiado não recebe til

- **WHEN** o texto proposto usa um número que o material do usuário sustenta
- **THEN** aquele número aparece no texto proposto sem `~`

#### Scenario: Til que a IA já escreveu não é duplicado

- **WHEN** a proposta já vem com "~20%" e "20" é inédito
- **THEN** o texto entregue traz "~20%", com um único `~`

### Requirement: Sugerir não altera o currículo

A geração de sugestões SHALL NOT modificar o currículo. O currículo devolvido ou observado
após a geração SHALL ser idêntico ao de entrada, e nenhum trecho SHALL mudar de origem.

#### Scenario: Currículo permanece intacto

- **WHEN** as sugestões são geradas para um currículo
- **THEN** o currículo continua exatamente como estava, com os mesmos textos, ids e origens

#### Scenario: Nenhuma sugestão vem aplicada

- **WHEN** um conjunto de sugestões é entregue
- **THEN** nenhum trecho do currículo contém o texto proposto por qualquer uma delas

### Requirement: Falhas da IA na geração de sugestões

Resposta fora do esquema, falha de comunicação e credencial ausente SHALL produzir erros
distinguíveis. Uma falha SHALL NOT devolver lista vazia como se não houvesse sugestão.

#### Scenario: Resposta fora do esquema é rejeitada

- **WHEN** a IA devolve uma resposta que não corresponde ao esquema de sugestões
- **THEN** a operação falha com erro, em vez de devolver lista vazia

#### Scenario: Falha de comunicação é distinguível

- **WHEN** a chamada à IA falha ou expira
- **THEN** o erro identifica falha de comunicação, distinta de configuração ausente

#### Scenario: Currículo sem bullets não é erro

- **WHEN** o currículo não tem nenhum bullet
- **THEN** a operação devolve lista vazia sem chamar a IA

### Requirement: Testes sem a IA real

A geração SHALL ser isolada atrás da mesma fronteira de IA do projeto, para que nenhum
teste dependa da API real.

#### Scenario: Nenhuma chamada real na suíte

- **WHEN** a suíte de testes é executada
- **THEN** as sugestões vêm de respostas gravadas, e nenhuma chamada a API de provedor é
  feita

