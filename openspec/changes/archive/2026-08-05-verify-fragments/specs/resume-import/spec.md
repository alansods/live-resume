## MODIFIED Requirements

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

#### Scenario: Colagem de palavras soltas é recusada

- **WHEN** a IA devolve um campo formado por muitos fragmentos curtos colhidos em pontos
  distantes do arquivo
- **THEN** a verificação o recusa, porque fragmento curto não é verificado isoladamente
