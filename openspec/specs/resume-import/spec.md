# resume-import Specification

## Purpose
Transformar o arquivo de currículo do usuário — DOCX ou PDF — no modelo canônico do
Currículo Vivo: o código extrai o texto em ordem de leitura correta, a IA o distribui nos
campos do modelo sem reescrever nada, e um relatório diz o que ficou em aberto. O arquivo é
descartado assim que o processamento termina.
## Requirements
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

### Requirement: Formação e habilidades ausentes na resposta da IA não falham a importação

Quando a IA estrutura o currículo e a resposta não traz a chave de formação ou a chave de
habilidades, o sistema SHALL tratá-las como vazias (`[]` para formação, ausência de
habilidades) em vez de falhar a importação — os dois campos podem legitimamente estar vazios
num currículo real, e a ausência da chave não deve ser tratada como resposta fora do esquema.

#### Scenario: Resposta sem formação estrutura currículo com lista vazia

- **WHEN** a IA estrutura um currículo e a resposta não traz a chave de formação
- **THEN** o currículo produzido tem a lista de formação vazia, e a importação não falha

#### Scenario: Resposta sem habilidades estrutura currículo com habilidades vazias

- **WHEN** a IA estrutura um currículo e a resposta não traz a chave de habilidades
- **THEN** o currículo produzido fica sem habilidades, e a importação não falha

### Requirement: A IA distribui o texto, não o reescreve

Na estruturação, todo texto do currículo produzido SHALL ter origem no texto extraído do
arquivo. O sistema SHALL verificar cada texto devolvido pela IA contra o texto extraído e
SHALL rejeitar o que não estiver lá. A IA SHALL NOT introduzir, reformular ou corrigir
conteúdo nesta etapa.

A comparação SHALL ser feita sobre as **palavras** do texto: espaços, marcador de lista,
aspas tipográficas e pontuação SHALL ser ignorados, porque trocam de forma sem trocar de
conteúdo — reunir duas seções do arquivo numa linha exige pontuação de ligação que o arquivo
não trazia. Palavra que não esteja no texto extraído SHALL continuar sendo recusada.

A verificação SHALL aceitar um campo que seja trecho contíguo do texto extraído. Quando não
for, ela SHALL quebrar o campo nos separadores de sentença e exigir que **cada fragmento**
seja trecho contíguo do texto extraído — é o que permite à IA reunir num campo material que o
arquivo trazia em lugares distantes, como habilidades e idiomas na mesma linha. Fragmento
curto demais SHALL NOT ser verificado isoladamente: ele SHALL ser reunido ao fragmento
anterior antes da conferência, para que um campo não possa ser montado com palavras soltas
colhidas pelo documento inteiro. A verificação SHALL NOT usar limiar de similaridade.

Habilidades SHALL ser verificadas **por palavra**, e não por trecho contíguo: o campo é, por
natureza, montado de fragmentos espalhados pelo arquivo — a IA coleciona "React" de um bullet e
"AWS" de outro. Cada palavra do campo SHALL existir no texto extraído; conectivos de ligação
("e", "ou", "com", "and", "or") SHALL ser ignorados. Palavra que não esteja no arquivo SHALL
continuar recusando o campo.

Recusada a resposta, o sistema SHALL pedir a estruturação **uma segunda vez**, informando ao
modelo qual campo foi recusado e de que natureza foi a divergência, antes de falhar a
importação. A segunda recusa SHALL falhar a importação. A repetição SHALL NOT afrouxar a
verificação nem aceitar conteúdo que não esteja no arquivo, e o registro de falha SHALL
identificar o campo e a natureza da divergência **sem conter texto do currículo**.

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

#### Scenario: Pontuação de ligação é aceita

- **WHEN** a IA reúne um título de seção com o texto seguinte e acrescenta um dois-pontos que
  o arquivo não trazia, sem alterar nenhuma palavra
- **THEN** a verificação o aceita

#### Scenario: Palavra trocada é recusada mesmo com a pontuação igual

- **WHEN** a IA devolve um texto com a mesma pontuação do original e uma palavra diferente
- **THEN** a verificação o recusa

#### Scenario: Campo reunido de partes distantes é aceito

- **WHEN** a IA devolve as habilidades reunindo a seção de habilidades e a de idiomas, que
  aparecem em lugares diferentes do arquivo, sem alterar nenhuma palavra
- **THEN** a verificação o aceita, porque cada fragmento existe no texto extraído

#### Scenario: Fragmento reformulado derruba o campo inteiro

- **WHEN** um campo tem vários fragmentos e apenas um deles foi reescrito
- **THEN** a verificação recusa o campo, e a importação falha

#### Scenario: Colagem de palavras soltas em prosa é recusada

- **WHEN** a IA devolve um campo de prosa formado por muitos fragmentos curtos colhidos em
  pontos distantes do arquivo
- **THEN** a verificação o recusa, porque fragmento curto não é verificado isoladamente

#### Scenario: Colagem de palavras soltas em habilidades é aceita

- **WHEN** a IA devolve o campo de habilidades com palavras que existem em pontos distantes do
  arquivo, como um currículo que lista cada habilidade numa linha própria
- **THEN** a verificação o aceita, contanto que toda palavra venha do arquivo

#### Scenario: Resposta recusada é pedida uma segunda vez

- **WHEN** a primeira resposta da IA é recusada pela verificação e a segunda passa
- **THEN** a importação conclui com o currículo da segunda resposta, sem erro para o usuário

#### Scenario: A segunda tentativa diz o que foi recusado

- **WHEN** a estruturação é pedida uma segunda vez
- **THEN** o pedido informa o campo recusado e a natureza da divergência, e não repete o
  primeiro pedido inalterado

#### Scenario: Duas recusas falham a importação

- **WHEN** as duas respostas da IA são recusadas pela verificação
- **THEN** a importação falha, e nenhum currículo é produzido

#### Scenario: Não há terceira tentativa

- **WHEN** as duas respostas da IA são recusadas
- **THEN** a IA foi chamada exatamente duas vezes

#### Scenario: O registro da falha não contém texto do currículo

- **WHEN** uma recusa é registrada
- **THEN** o registro identifica o campo e a natureza da divergência, e nenhum trecho do
  currículo aparece nele

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

### Requirement: Documento que não é currículo é recusado

A estruturação SHALL devolver, junto do currículo distribuído, um veredito sobre que
documento foi enviado. Quando o veredito for "não é um currículo", a importação SHALL falhar
com motivo próprio e distinguível, SHALL NOT produzir currículo parcial e SHALL NOT tentar de
novo — arquivo errado não melhora numa segunda chamada, e a cota diária é finita.

O veredito vem **no mesmo pedido** da estruturação, e não numa chamada própria: o modelo já
lê o documento inteiro para distribuir o texto, então perguntar custa zero requisição a mais.
Ele SHALL ser conferido **antes** da trava anti-reescrita: num documento que não é currículo
a IA não tem o que distribuir, tende a inventar, e a trava classificaria como "a IA reescreveu
conteúdo" um caso que é, na verdade, arquivo errado.

O veredito SHALL ser conservador: na dúvida, aceitar. Recusar o currículo real de alguém por
ele ser curto, sem experiência, de outra área ou mal formatado é um erro muito pior do que
aceitar um documento estranho — o primeiro fecha a porta, e o segundo a pessoa percebe na
tela seguinte.

Sem isto, o caminho terminava em um de dois lugares errados: a IA devolvia nome vazio e o
modelo canônico estourava num 500 genérico, que culpa o servidor por um problema do arquivo;
ou ela preenchia o cabeçalho com o primeiro nome que encontrasse e a pessoa seguia para a
etapa 02 com um currículo em branco.

#### Scenario: Documento que não é currículo é recusado

- **WHEN** a estruturação devolve o veredito de que o documento não é um currículo
- **THEN** a importação falha com motivo próprio, distinguível dos demais motivos de recusa

#### Scenario: Documento que não é currículo não é pedido duas vezes

- **WHEN** o veredito recusa o documento
- **THEN** a IA é chamada uma única vez

#### Scenario: O veredito não vaza para o currículo montado

- **WHEN** a estruturação de um currículo legítimo é montada no modelo canônico
- **THEN** o veredito não aparece como campo do currículo

#### Scenario: A rota recusa documento que não é currículo

- **WHEN** a rota de importação recebe um documento que não é currículo
- **THEN** ela responde 422 com o motivo próprio e a mensagem escrita para o usuário

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
- **THEN** nenhuma chamada a API de provedor é feita, e a estruturação usa respostas gravadas

### Requirement: A extração de PDF funciona no servidor em execução

A biblioteca que lê PDF carrega o seu worker por caminho de módulo em tempo de execução, e
SHALL NOT ser empacotada pelo servidor: empacotá-la reescreve esse caminho e o worker deixa
de ser encontrado, o que faz todo PDF — válido ou não — ser recusado como arquivo corrompido.
A configuração do servidor SHALL declarar essa dependência como externa.

#### Scenario: A dependência que lê PDF é declarada externa

- **WHEN** a configuração do servidor é inspecionada
- **THEN** a biblioteca de leitura de PDF consta entre os pacotes que o servidor não empacota

#### Scenario: Falha de worker não é atribuída ao arquivo do usuário

- **WHEN** a leitura de um PDF falha por não encontrar o worker da biblioteca
- **THEN** o motivo registrado identifica a falha de carregamento, e não acusa o arquivo do
  usuário de estar corrompido

### Requirement: Cota esgotada é um motivo de falha próprio

Quando **todos** os provedores de IA disponíveis recusam a chamada por limite de uso
esgotado, o sistema SHALL falhar com um motivo próprio, distinguível da falha de comunicação.
A rota SHALL responder com o status de limite excedido, e não com o status de falha do
serviço. O sistema SHALL NOT repetir a chamada no mesmo provedor que recusou, e SHALL NOT
usar o intervalo de nova tentativa sugerido pela API, que descreve a janela por minuto e não
a janela diária.

Passar a vez para **outro** provedor não é repetir a chamada: a cota é de cada serviço, e o
provedor seguinte tem a dele intacta. Essa passagem é regida pela capability `ai-providers`;
aqui vale o que sobra quando ela se esgota. O motivo de cota SHALL prevalecer sobre os demais
quando qualquer provedor da cadeia tiver recusado por limite de uso — é o único motivo que
muda o conselho dado ao usuário.

#### Scenario: Limite de uso vira motivo de cota

- **WHEN** a chamada ao modelo é recusada com status de limite excedido
- **THEN** a falha tem motivo de cota esgotada, distinto do motivo de falha de comunicação

#### Scenario: Outras falhas da API continuam falha de comunicação

- **WHEN** a chamada ao modelo falha por qualquer outro motivo, com ou sem status
- **THEN** a falha tem motivo de comunicação, e não de cota

#### Scenario: A rota responde limite excedido

- **WHEN** a importação falha por cota esgotada
- **THEN** a rota responde com o status de limite excedido e o código do motivo de cota

### Requirement: A mensagem da falha de IA é escrita para o usuário

Toda mensagem de falha de IA que chega ao usuário SHALL ser texto escrito para ele. Ela
SHALL NOT conter o corpo da resposta da API, JSON, identificador de cota, status HTTP nem
qualquer trecho repassado do serviço. O detalhe bruto da falha SHALL ser registrado no
servidor, uma vez, no ponto em que a falha acontece.

#### Scenario: A resposta da API não chega à tela

- **WHEN** o modelo falha com um corpo de erro extenso
- **THEN** a mensagem da falha não contém nenhum trecho desse corpo

#### Scenario: O detalhe bruto vai para o registro do servidor

- **WHEN** a chamada ao modelo falha
- **THEN** o servidor registra o motivo e o detalhe da falha, sem conteúdo do currículo

