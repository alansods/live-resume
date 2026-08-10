## Purpose

Transformar o arquivo de currículo do usuário — DOCX ou PDF — no modelo canônico do
Currículo Vivo: o código extrai o texto em ordem de leitura correta, a IA o distribui nos
campos do modelo sem reescrever nada, e um relatório diz o que ficou em aberto. O arquivo é
descartado assim que o processamento termina.

## ADDED Requirements

### Requirement: Extração de DOCX

O sistema SHALL aceitar um arquivo DOCX e extrair o seu texto preservando a ordem dos
blocos, a separação entre parágrafos e a marcação de itens de lista, porque é o que
distingue um bullet de entrega de uma linha corrida.

#### Scenario: Itens de lista são preservados como itens

- **WHEN** um DOCX descreve as entregas de uma experiência como itens de lista
- **THEN** cada item é extraído como um bloco de lista próprio, na ordem do documento

#### Scenario: Parágrafo corrido não vira lista

- **WHEN** um DOCX traz as entregas num parágrafo corrido, sem lista
- **THEN** o conteúdo é extraído como parágrafo, sem ser dividido em itens

#### Scenario: Títulos são preservados como títulos

- **WHEN** um DOCX usa estilos de título para as seções
- **THEN** esses blocos são extraídos marcados como título, na ordem do documento

### Requirement: Extração de PDF

O sistema SHALL aceitar um PDF com camada de texto e extrair o seu conteúdo usando a
posição dos itens na página para reconstruir linhas, unindo as páginas na ordem em que
aparecem.

#### Scenario: Linhas são reconstruídas pela posição

- **WHEN** uma linha do PDF chega quebrada em vários fragmentos de texto
- **THEN** os fragmentos da mesma linha são reunidos num texto só, sem espaço perdido nem
  duplicado

#### Scenario: Marcadores de lista são reconhecidos

- **WHEN** linhas do PDF começam com marcador de lista (•, -, –, ▪ ou equivalente)
- **THEN** cada uma é extraída como bloco de lista, sem o marcador no texto

#### Scenario: Páginas são unidas na ordem

- **WHEN** um currículo em PDF ocupa mais de uma página
- **THEN** o texto sai na ordem das páginas, e cada bloco registra a página de origem

### Requirement: Ordem de leitura em layout de múltiplas colunas

O sistema SHALL detectar quando o arquivo usa duas ou mais colunas e SHALL separar o texto
por coluna **antes** de reconstruir as linhas. O sistema SHALL NOT produzir texto que
misture conteúdo de colunas diferentes numa mesma linha, e SHALL sinalizar o layout
detectado.

#### Scenario: Currículo em duas colunas é detectado

- **WHEN** um PDF distribui o conteúdo em duas colunas separadas por uma calha vertical
- **THEN** o resultado sinaliza layout de múltiplas colunas, e cada bloco registra a coluna
  de origem

#### Scenario: Colunas não são intercaladas

- **WHEN** um currículo em duas colunas tem, na mesma altura da página, uma habilidade à
  esquerda e um bullet de experiência à direita
- **THEN** nenhum bloco extraído contém os dois textos juntos

#### Scenario: Coluna única não é sinalizada

- **WHEN** um currículo de coluna única é importado
- **THEN** o resultado não sinaliza múltiplas colunas, e nenhum bloco registra coluna

#### Scenario: Conteúdo de todas as colunas é preservado

- **WHEN** um currículo em duas colunas é importado
- **THEN** todo o texto das duas colunas está presente no resultado, sem perda

### Requirement: Estruturação do modelo pela IA

O sistema SHALL entregar o texto extraído à IA, que SHALL devolver o modelo canônico
preenchido — cabeçalho, resumo, experiências com empresa, cargo, período e bullets,
formações e habilidades. A resposta SHALL ser validada contra o esquema do currículo antes
de ser aceita, e uma resposta inválida SHALL falhar a importação em vez de produzir um
currículo parcial.

#### Scenario: Texto extraído vira currículo canônico

- **WHEN** o texto de um currículo é entregue à IA
- **THEN** o resultado é um currículo válido segundo `resume-model`, com id em cada
  experiência, bullet e formação, e origem "importado" em todos os trechos

#### Scenario: Conteúdo de múltiplas colunas é remontado em ordem

- **WHEN** o texto vem de um currículo de duas colunas, agrupado por coluna
- **THEN** o currículo produzido tem cada bullet na sua experiência e cada seção no seu
  lugar, independentemente da coluna em que o texto estava

#### Scenario: Resposta fora do esquema é rejeitada

- **WHEN** a IA devolve uma resposta que não corresponde ao esquema do currículo
- **THEN** a importação falha com erro, e nenhum currículo parcial é produzido

#### Scenario: Falha de comunicação com a IA

- **WHEN** a chamada à IA falha ou expira
- **THEN** a importação falha com erro distinguível de erro de arquivo

#### Scenario: Configuração ausente

- **WHEN** a credencial da IA não está configurada
- **THEN** a importação falha com erro de configuração explícito, em vez de devolver um
  currículo vazio

### Requirement: A IA distribui o texto, não o reescreve

Na estruturação, todo texto do currículo produzido SHALL ter origem no texto extraído do
arquivo. O sistema SHALL verificar cada texto devolvido pela IA contra o texto extraído e
SHALL rejeitar o que não estiver lá. A IA SHALL NOT introduzir, reformular ou corrigir
conteúdo nesta etapa.

#### Scenario: Texto inventado é rejeitado

- **WHEN** a IA devolve um bullet com texto que não aparece no arquivo importado
- **THEN** a importação falha com erro que identifica o texto não encontrado, e nenhum
  currículo é produzido

#### Scenario: Reformulação é rejeitada

- **WHEN** a IA devolve um bullet com o mesmo sentido do original, porém reescrito
- **THEN** a verificação o recusa, porque o texto não corresponde ao extraído

#### Scenario: Normalização de espaços é aceita

- **WHEN** a IA devolve um texto que só difere do extraído por espaços em branco ou por
  remoção de marcador de lista
- **THEN** a verificação o aceita

#### Scenario: Divisão de bloco é aceita

- **WHEN** a IA divide um parágrafo extraído em dois bullets, cada um contido no texto
  original
- **THEN** a verificação aceita os dois

### Requirement: Períodos importados

Os períodos SHALL ser normalizados pelo parser de `resume-model`. Período sem mês SHALL
ficar incompleto, com o texto original preservado — o sistema SHALL NOT arbitrar mês.

#### Scenario: Período completo é normalizado

- **WHEN** uma experiência do arquivo informa o período como `03/2022 – 12/2024`
- **THEN** o período é normalizado com mês e ano de início e fim

#### Scenario: Período sem mês fica incompleto

- **WHEN** uma experiência do arquivo informa o período como `2018 - 2019`
- **THEN** o período fica incompleto, com o texto original preservado e sem mês atribuído,
  e o relatório o inclui na lista de períodos a completar

### Requirement: Relatório de importação

Toda importação SHALL produzir um relatório com: quantidade de experiências, formações e
bullets; bullets sem número; períodos incompletos; períodos sobrepostos; e o texto extraído
que não foi aproveitado em nenhum campo do currículo. O relatório SHALL ser descritivo —
SHALL NOT propor correção nem alterar o currículo.

#### Scenario: Contagens do que foi reconhecido

- **WHEN** um currículo com quatro experiências, duas formações e sete bullets é importado
- **THEN** o relatório informa exatamente esses números

#### Scenario: Bullets sem número

- **WHEN** o currículo tem bullets sem nenhum valor numérico no texto
- **THEN** o relatório lista esses bullets pelos seus paths

#### Scenario: Períodos incompletos e sobrepostos

- **WHEN** o currículo tem um período sem mês e dois períodos que se sobrepõem
- **THEN** o relatório lista o período incompleto e o par sobreposto, cada um pelo seu path

#### Scenario: Texto extraído não aproveitado

- **WHEN** um bloco do arquivo não é usado em nenhum campo do currículo
- **THEN** ele aparece no relatório como texto não aproveitado, com o conteúdo legível

#### Scenario: Relatório não altera o currículo

- **WHEN** o relatório aponta bullets sem número e períodos incompletos
- **THEN** o currículo produzido é exatamente o que a estruturação devolveu, sem nenhuma
  correção aplicada, e nenhum trecho tem origem diferente de "importado"

### Requirement: Arquivos que não podem ser processados

O sistema SHALL recusar, com erro explícito e distinguível por tipo, arquivo em formato não
suportado, arquivo corrompido, PDF sem camada de texto e arquivo acima do limite de
tamanho. Nenhum currículo parcial SHALL ser produzido, e a IA SHALL NOT ser chamada nesses
casos.

#### Scenario: Formato não suportado

- **WHEN** o usuário envia um arquivo que não é DOCX nem PDF
- **THEN** a importação falha com erro que identifica o formato recebido, e a IA não é
  chamada

#### Scenario: Arquivo corrompido

- **WHEN** o arquivo tem a extensão certa mas o conteúdo não pode ser lido
- **THEN** a importação falha com erro que distingue corrupção de formato não suportado

#### Scenario: PDF sem camada de texto

- **WHEN** um PDF digitalizado, apenas com imagem, é importado
- **THEN** a importação falha com erro específico dizendo que o PDF não tem texto
  selecionável, em vez de devolver um currículo vazio

#### Scenario: Arquivo grande demais

- **WHEN** o arquivo excede o limite de tamanho aceito
- **THEN** a importação falha com erro que informa o limite, antes de processar o conteúdo

### Requirement: Arquivo descartado após o processamento

O arquivo enviado SHALL ser processado em memória e descartado ao fim da requisição. O
sistema SHALL NOT gravá-lo em disco, SHALL NOT persistir o seu conteúdo e SHALL NOT
registrar o conteúdo do currículo em log.

#### Scenario: Nada é gravado em disco

- **WHEN** uma importação é processada do começo ao fim
- **THEN** nenhum arquivo é criado no sistema de arquivos

#### Scenario: Conteúdo não vai para log

- **WHEN** uma importação falha e o erro é registrado
- **THEN** o registro descreve o tipo de falha sem incluir texto do currículo

### Requirement: Extração determinística

A extração de texto SHALL ser determinística: o mesmo arquivo SHALL produzir o mesmo texto
extraído, sem depender de serviço externo. A estruturação pela IA SHALL ser isolada atrás
de uma fronteira que os testes substituem, para que nenhum teste dependa da API real.

#### Scenario: Mesma entrada, mesmo texto extraído

- **WHEN** o mesmo arquivo é extraído duas vezes
- **THEN** os dois resultados são idênticos

#### Scenario: Testes não chamam a IA real

- **WHEN** a suíte de testes é executada
- **THEN** nenhuma chamada à API do Gemini é feita, e a estruturação usa respostas gravadas
