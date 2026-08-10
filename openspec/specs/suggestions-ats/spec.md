# suggestions-ats Specification

## Purpose
Tratar o currículo como documento que será lido primeiro por máquina: propor reescrita do
resumo que não carrega termo pelo qual alguém procura e conversão das habilidades escritas
em marcação que o parser descarta, e projetar a pontuação de ATS sobre o conjunto de
sugestões que o usuário marcou.
## Requirements
### Requirement: Sugestão de resumo sem palavra-chave

O sistema SHALL propor reescrita do resumo quando ele descrever a pessoa por traços de
personalidade em vez de área de atuação, ferramenta, escala e resultado. A proposta SHALL
tratar da mesma trajetória descrita pelo usuário e SHALL ser ancorada no trecho do resumo.
Resumo que já traz esses elementos SHALL NOT receber sugestão.

#### Scenario: Resumo de adjetivos recebe proposta

- **WHEN** o resumo do currículo é "Profissional proativa, dinâmica e apaixonada por
  desafios, sempre em busca de novos aprendizados"
- **THEN** é produzida uma sugestão do tipo ats para o resumo, com texto proposto diferente
  do atual

#### Scenario: Resumo já indexável não recebe proposta

- **WHEN** o resumo já nomeia área de atuação, ferramentas e um resultado
- **THEN** nenhuma sugestão de resumo é produzida

#### Scenario: A proposta trata da mesma trajetória

- **WHEN** uma sugestão de resumo é produzida
- **THEN** o texto proposto continua descrevendo a mesma pessoa e a mesma área, sem trocar
  a profissão descrita

#### Scenario: Currículo sem resumo não recebe sugestão de resumo

- **WHEN** o currículo não tem resumo
- **THEN** nenhuma sugestão de resumo é produzida, e nenhum resumo é criado do nada

### Requirement: Sugestão de habilidades não indexáveis

O sistema SHALL propor a conversão das habilidades para lista corrida em texto quando elas
vierem acompanhadas de indicador de nível — barra, símbolo repetido, percentual ou rótulo de
proficiência. A proposta SHALL preservar todas as competências listadas e SHALL descartar
apenas o indicador de nível. Habilidades já em texto corrido SHALL NOT receber sugestão.

A ausência de indicador de nível no texto atual SHALL ser verificada **pelo código**, e não
confiada à instrução do prompt. Indicador de nível é artefato de formatação, e portanto
detectável; deixar a recusa por conta do modelo faz uma proposta gratuita custar pontos de
uma nota que ninguém consegue explicar depois.

#### Scenario: Símbolo de nível vira texto corrido

- **WHEN** as habilidades do currículo são "Go ★★★★☆ · Python ★★★☆☆ · AWS ★★★★★"
- **THEN** é produzida uma sugestão do tipo ats para as habilidades, com texto proposto sem
  os símbolos de nível

#### Scenario: Nenhuma competência se perde na conversão

- **WHEN** uma sugestão de habilidades é produzida
- **THEN** todas as competências que apareciam no texto atual continuam presentes no texto
  proposto

#### Scenario: Percentual de proficiência também é convertido

- **WHEN** as habilidades trazem "Excel — nível avançado (80%)"
- **THEN** a sugestão propõe a competência sem o percentual de proficiência

#### Scenario: Habilidades já em texto não recebem proposta

- **WHEN** as habilidades já são uma lista separada por vírgula, sem indicador de nível
- **THEN** nenhuma sugestão de habilidades é produzida

#### Scenario: Currículo sem habilidades não recebe sugestão de habilidades

- **WHEN** o currículo não tem habilidades
- **THEN** nenhuma sugestão de habilidades é produzida

### Requirement: Escopo das sugestões de ATS

As sugestões de ATS SHALL endereçar apenas o resumo e as habilidades. O sistema SHALL NOT
produzir sugestão de ATS para bullet ou para período, e SHALL NOT produzir sugestão para
característica de formatação que a geração do currículo final já normaliza por conta própria
— coluna única, ausência de tabela, fonte única, formato de data e texto selecionável no
PDF.

#### Scenario: Bullet não recebe sugestão de ATS

- **WHEN** a IA devolve uma sugestão de ats ancorada no bullet de uma experiência
- **THEN** ela é descartada, e as demais sugestões válidas são entregues

#### Scenario: Formatação que a geração conserta não vira sugestão

- **WHEN** o currículo importado veio em duas colunas, com tabela e datas só com ano
- **THEN** nenhuma sugestão de ats é produzida sobre esses aspectos de formatação

#### Scenario: No máximo duas sugestões de ATS

- **WHEN** um conjunto de sugestões de ats é entregue
- **THEN** ele tem no máximo uma sugestão para o resumo e uma para as habilidades

### Requirement: Números não apoiados na reescrita de resumo

Uma sugestão de ATS SHALL declarar quais números do texto proposto não aparecem no currículo
importado nem no que o usuário digitou. O sistema SHALL NOT descartar a sugestão por causa
disso — SHALL apenas sinalizar, para que a revisão peça confirmação.

#### Scenario: Tempo de experiência inédito é sinalizado

- **WHEN** o resumo proposto traz "8 anos de experiência" e "8" não aparece no material do
  usuário
- **THEN** a sugestão é entregue com esse número na lista de não apoiados

#### Scenario: Número que o usuário escreveu não é sinalizado

- **WHEN** o resumo proposto usa um número que já constava do currículo importado ou do que
  o usuário digitou na etapa 02
- **THEN** aquele número não aparece na lista de não apoiados

#### Scenario: Conversão de habilidades não inventa número

- **WHEN** uma sugestão de habilidades é produzida
- **THEN** o texto proposto não introduz número que não estivesse no texto atual

### Requirement: Pontuação de ATS projetada sobre o conjunto marcado

O sistema SHALL calcular uma pontuação de 0 a 100 projetada sobre o **conjunto de sugestões**
e sobre quais delas o usuário marcou. A pontuação SHALL partir do máximo e descontar o peso
de cada sugestão pendente, SHALL subir a cada sugestão marcada, e SHALL NOT considerar
sugestões não marcadas. O cálculo SHALL ser determinístico e SHALL NOT chamar serviço externo.

A nota SHALL NOT ser derivada de uma leitura própria do currículo: o conjunto de sugestões
**é** a lista de defeitos que o app conhece, e cada ponto que falta SHALL ter um cartão
correspondente na tela. A consequência disso é uma obrigação, não uma folga — se a nota é a
contagem dos defeitos encontrados, então uma sugestão sem defeito correspondente é um ponto
descontado sem motivo, e o requisito "Sugestão só existe onde há defeito" é o que sustenta
esta pontuação.

#### Scenario: Sem marcação, a pontuação é a do currículo como está

- **WHEN** a pontuação é calculada com o conjunto marcado vazio
- **THEN** ela reflete apenas o currículo importado, sem contar nenhuma sugestão

#### Scenario: Currículos diferentes partem de pontuações diferentes

- **WHEN** dois currículos são pontuados sem nenhuma sugestão marcada, um com resumo
  indexável e outro sem
- **THEN** o que tem resumo indexável recebe pontuação maior

#### Scenario: Marcar uma sugestão sobe a pontuação

- **WHEN** uma sugestão é acrescentada ao conjunto marcado, e a pontuação anterior não está
  no piso
- **THEN** a pontuação resultante é maior que a anterior

#### Scenario: Marcar mais nunca baixa a pontuação

- **WHEN** sugestões são acrescentadas uma a uma ao conjunto marcado
- **THEN** a pontuação nunca diminui entre um passo e o seguinte

#### Scenario: Desmarcar devolve a pontuação anterior

- **WHEN** uma sugestão marcada é desmarcada
- **THEN** a pontuação volta exatamente ao valor que tinha antes de ela ser marcada

#### Scenario: Marcar tudo leva ao máximo

- **WHEN** todas as sugestões entregues são marcadas
- **THEN** a pontuação chega a 100

#### Scenario: Pontuação fica no intervalo

- **WHEN** todas as sugestões disponíveis são marcadas
- **THEN** a pontuação continua entre 0 e 100

#### Scenario: Mesma entrada, mesma pontuação

- **WHEN** a pontuação é calculada duas vezes para o mesmo currículo e o mesmo conjunto
  marcado
- **THEN** os dois resultados são iguais, e nenhuma chamada a serviço externo é feita

### Requirement: Sugestão só existe onde há defeito

Quando o defeito que uma sugestão alega for verificável de forma objetiva no texto atual, o
sistema SHALL verificá-lo antes de entregar a sugestão, e SHALL descartar a proposta cujo
trecho não apresenta aquele defeito. A verificação SHALL ser do código, e SHALL NOT depender
apenas da instrução dada ao modelo.

São objetivamente verificáveis: bullet que já traz número (métrica ausente), bullet que já
começa por verbo de ação (verbo genérico) e habilidades sem indicador de nível. O resumo
fica de fora — "este texto carrega palavra-chave" é julgamento de linguagem que varia por
profissão, e é o tipo de decisão que o projeto delega ao modelo de propósito.

A razão é a pontuação: ela desconta por sugestão pendente, então uma proposta gratuita sobre
um trecho bom rebaixa a nota de um currículo que não tem aquele defeito. Um currículo sem
defeito algum SHALL alcançar o máximo, e não uma nota que insinua um problema que o app não
sabe nomear.

#### Scenario: Habilidades sem indicador de nível recusam proposta da IA

- **WHEN** a IA devolve uma sugestão de habilidades para um texto que já é lista corrida, sem
  barra, símbolo repetido, percentual nem rótulo de proficiência
- **THEN** a sugestão é descartada, e o conjunto entregue não traz sugestão de habilidades

#### Scenario: A nota de um currículo sem defeito é o máximo

- **WHEN** um currículo não apresenta nenhum dos defeitos verificáveis e a IA ainda assim
  propõe reescrita para os trechos que já estão bons
- **THEN** as propostas sem defeito correspondente são descartadas, e a nota resultante é o
  máximo

#### Scenario: Currículo já revisado não reapresenta os mesmos defeitos

- **WHEN** todas as sugestões de um currículo são aplicadas e o resultado é submetido de novo
  à geração de sugestões
- **THEN** nenhum dos defeitos verificáveis reaparece — datas continuam completas e sem
  sobreposição, bullets com número não recebem métrica, bullets com verbo de ação não recebem
  verbo, e habilidades em texto corrido não recebem conversão

### Requirement: Sugestões de ATS respeitam o contrato comum

As sugestões de ATS SHALL usar o mesmo modelo das demais, com tipo `ats` e ação de reescrita
ou de conversão para texto. Todo path entregue SHALL resolver no currículo, e gerar
sugestões SHALL NOT alterar o currículo.

#### Scenario: Modelo comum é respeitado nas sugestões de ATS

- **WHEN** uma sugestão de ats é produzida
- **THEN** ela valida contra o modelo de sugestão, com tipo `ats` e ação de reescrita ou de
  conversão para texto

#### Scenario: Texto atual corresponde ao trecho endereçado

- **WHEN** uma sugestão de ats endereça o resumo
- **THEN** o seu texto atual é exatamente o texto do resumo no momento da geração

#### Scenario: Path que não resolve é descartado na geração de ATS

- **WHEN** a IA devolve uma sugestão de ats com path fora das formas endereçáveis do modelo
- **THEN** ela é descartada sem interromper a entrega das demais

#### Scenario: Currículo permanece intacto ao sugerir ATS

- **WHEN** as sugestões de ats são geradas
- **THEN** o currículo continua exatamente como estava, com os mesmos textos, ids e origens

### Requirement: Falhas da IA na geração de sugestões de ATS

Resposta fora do esquema, falha de comunicação e credencial ausente SHALL produzir erros
distinguíveis. Uma falha SHALL NOT devolver lista vazia como se não houvesse sugestão.
Currículo sem resumo e sem habilidades SHALL NOT gerar chamada à IA.

#### Scenario: Resposta de ATS fora do esquema é rejeitada

- **WHEN** a IA devolve uma resposta que não corresponde ao esquema de sugestões de ats
- **THEN** a operação falha com erro, em vez de devolver lista vazia

#### Scenario: Falha de comunicação na geração de ATS é distinguível

- **WHEN** a chamada à IA falha ou expira
- **THEN** o erro identifica falha de comunicação, distinta de configuração ausente

#### Scenario: Currículo sem resumo e sem habilidades não chama a IA

- **WHEN** o currículo não tem resumo nem habilidades
- **THEN** a operação devolve lista vazia sem chamar a IA

### Requirement: Testes de ATS sem a IA real

A geração de sugestões de ATS SHALL ser isolada atrás da mesma fronteira de IA do projeto,
para que nenhum teste dependa da API real.

#### Scenario: Nenhuma chamada real de ATS na suíte

- **WHEN** a suíte de testes é executada
- **THEN** as sugestões de ats vêm de respostas gravadas, e nenhuma chamada a API de provedor
  é feita

