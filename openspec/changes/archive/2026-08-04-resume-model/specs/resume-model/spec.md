## Purpose

Define a estrutura canônica de um currículo no Currículo Vivo — o contrato único que
importação, análise pela IA, sugestões, organização de conteúdo, revisão e exportação
compartilham — incluindo os ids estáveis e os paths que ancoram cada sugestão ao seu
trecho mesmo quando a IA reordena o conteúdo, a geração do currículo final a partir do que
o usuário marcou, e o registro de origem que garante que texto gerado pela IA nunca
substitua o original sem essa marcação.

## ADDED Requirements

### Requirement: Estrutura canônica do currículo

O modelo canônico SHALL representar um currículo com cabeçalho (nome, cargo, contato),
resumo, lista de experiências (empresa, cargo, período, lista de bullets), lista de
formações (curso, instituição, período) e habilidades como um único texto — a
granularidade que o path `skills` endereça e a que o documento ATS-safe exige. O currículo
SHALL existir em um
único idioma — o do usuário — sem qualquer estrutura de par de idiomas.

#### Scenario: Currículo completo é aceito

- **WHEN** um objeto contém cabeçalho, resumo, ao menos uma experiência com bullets, ao
  menos uma formação e habilidades, todos no formato do modelo
- **THEN** a validação o aceita e devolve um currículo canônico tipado

#### Scenario: Seções opcionais ausentes

- **WHEN** um currículo não tem resumo, formações ou habilidades
- **THEN** a validação o aceita, com essas seções vazias ou ausentes, e nenhuma
  transformação posterior falha por causa disso

#### Scenario: Campo obrigatório ausente é rejeitado

- **WHEN** uma experiência não tem empresa, cargo ou período
- **THEN** a validação falha e o erro nomeia o caminho do campo faltante

#### Scenario: Modelo não admite conteúdo multilíngue

- **WHEN** um objeto informa qualquer campo de conteúdo como par de idiomas
- **THEN** a validação falha, nomeando o campo

### Requirement: Identidade estável de item

Cada experiência, bullet e formação SHALL receber um id opaco na criação. O id
SHALL ser único dentro do currículo, SHALL acompanhar o item por toda transformação e
SHALL nunca ser reaproveitado por outro item. Nenhum significado — ordem, tipo ou origem —
SHALL ser derivável do valor do id.

#### Scenario: Id sobrevive à transformação

- **WHEN** um currículo passa por aplicação de ordem, aplicação de patch e serialização
- **THEN** cada item conserva o id que tinha no início

#### Scenario: Ids duplicados são rejeitados

- **WHEN** um objeto informa dois itens com o mesmo id
- **THEN** a validação falha, nomeando o id repetido

#### Scenario: Id de item removido não retorna

- **WHEN** um item é removido de um currículo e um novo item é criado em seguida
- **THEN** o novo item recebe um id distinto do que foi removido

### Requirement: Paths de trecho por id

Todo trecho endereçável SHALL ter um path textual construído a partir de ids, não de
posições: `summary`, `skills`, `jobs.<jobId>.period`, `jobs.<jobId>.bullets.<bulletId>` e
`education.<eduId>.period`. Um path SHALL resolver para no máximo um trecho. Resolver um
path que não existe SHALL produzir erro explícito, nunca um valor vazio ou indefinido.

#### Scenario: Path resolve o trecho correspondente

- **WHEN** o path de um bullet específico é resolvido contra o currículo
- **THEN** o resultado é aquele bullet, qualquer que seja a posição dele na lista

#### Scenario: Path sobrevive à reordenação

- **WHEN** uma nova ordem é aplicada às experiências e aos bullets de um currículo
- **THEN** todos os paths existentes continuam resolvendo exatamente os mesmos trechos de
  antes

#### Scenario: Path de item inexistente é erro

- **WHEN** um path cita um id que não existe no currículo
- **THEN** a resolução falha com erro que cita o path, e não devolve valor indefinido

#### Scenario: Path malformado é erro

- **WHEN** um path que não corresponde a nenhuma forma endereçável do modelo é resolvido
- **THEN** a resolução falha com erro que cita o path

### Requirement: Ordem do conteúdo definida pela IA na geração

A ordem das experiências, dos bullets de cada experiência e das formações SHALL ser dado do
currículo, e SHALL ser definida pela IA **no momento da geração do
currículo final**, a partir de uma sequência de ids recebida de fora do modelo. O currículo
importado SHALL conservar a ordem em que veio do arquivo original enquanto está em revisão.
O modelo SHALL NOT decidir ordem por conta própria e SHALL NOT expor qualquer operação de
ordenação manual pelo usuário.

#### Scenario: Ordem recebida é aplicada na geração

- **WHEN** o currículo final é gerado com uma sequência de ids de experiência
- **THEN** as experiências do currículo final ficam naquela ordem, com todos os seus campos
  e ids intactos

#### Scenario: Currículo em revisão conserva a ordem do arquivo

- **WHEN** um currículo importado é exibido durante a revisão
- **THEN** a ordem dos seus itens é a do arquivo original, e nenhuma reordenação é aplicada
  antes da geração

#### Scenario: Geração sem ordem informada

- **WHEN** o currículo final é gerado sem sequência de ids
- **THEN** o currículo final conserva a ordem do currículo de origem

#### Scenario: Ordem incompleta é rejeitada

- **WHEN** a sequência informada omite o id de um item existente ou repete um id
- **THEN** a geração falha com erro, e nenhum currículo final é produzido

#### Scenario: Ordem com id desconhecido é rejeitada

- **WHEN** a sequência informada cita um id que não existe no currículo
- **THEN** a geração falha com erro nomeando o id

### Requirement: Geração do currículo final a partir de patches selecionados

O modelo SHALL produzir o currículo final numa única operação, a partir do currículo de
origem, do conjunto de patches que o usuário marcou e da ordem definida pela IA, sem
modificar o currículo de origem. Cada patch substitui o valor do trecho endereçado pelo seu
path. O currículo de origem SHALL permanecer sendo o que a revisão exibe: o modelo SHALL
NOT oferecer aplicação incremental sobre ele, nem reversão, nem histórico de edição. O
currículo final SHALL NOT carregar nenhuma marca de "antes e depois" — ele é um currículo,
não um diff.

#### Scenario: Conjunto selecionado gera o currículo final

- **WHEN** a geração recebe um currículo e um conjunto de patches selecionados
- **THEN** o currículo final contém todas as substituições, os trechos não endereçados
  ficam inalterados, e o currículo de origem permanece exatamente como estava

#### Scenario: Conjunto vazio

- **WHEN** a geração recebe um conjunto vazio de patches
- **THEN** o currículo final é equivalente ao de origem

#### Scenario: Currículo final não carrega antes e depois

- **WHEN** o currículo final é lido para exibição ou exportação
- **THEN** cada trecho tem um único texto — o final — sem valor anterior, sem marca de
  alteração e sem nada que renderize como diff; o registro de origem permanece como
  metadado interno, nunca como conteúdo do currículo

#### Scenario: Resultado independe da ordem do conjunto

- **WHEN** o mesmo conjunto de patches é aplicado em duas ordens diferentes
- **THEN** os dois currículos finais são equivalentes

#### Scenario: Dois patches no mesmo trecho são rejeitados

- **WHEN** o conjunto contém dois patches endereçando o mesmo path
- **THEN** a geração falha com erro nomeando o path, e nenhum currículo final é produzido

#### Scenario: Patch em path inexistente é rejeitado

- **WHEN** o conjunto contém um patch cujo path não resolve
- **THEN** a geração falha com erro e nenhum currículo final é produzido, nem parcialmente
  aplicado

#### Scenario: Não existe aplicação incremental nem reversão

- **WHEN** a superfície pública do modelo é inspecionada
- **THEN** não há operação que altere o currículo em revisão trecho a trecho, nem desfazer,
  reverter ou restaurar valor anterior, nem produzir comparação entre currículo de origem e
  final, e nenhum trecho carrega o valor que tinha antes de uma substituição

### Requirement: Registro de origem do conteúdo

Todo valor de trecho SHALL registrar a sua origem: importado do arquivo original, digitado
pelo usuário, ou proposto pela IA. Um valor de origem proposta SHALL registrar também se
foi confirmado pelo usuário. O modelo SHALL permitir distinguir, para qualquer trecho,
conteúdo do usuário de conteúdo gerado por máquina.

#### Scenario: Origem preservada na importação

- **WHEN** um currículo é construído a partir de um arquivo importado
- **THEN** todos os seus trechos têm origem "importado"

#### Scenario: Patch selecionado registra proposta confirmada

- **WHEN** o currículo final é gerado a partir de patches com texto proposto pela IA que o
  usuário marcou
- **THEN** os trechos resultantes têm origem "proposto" e ficam registrados como
  confirmados

#### Scenario: Conteúdo não confirmado é distinguível

- **WHEN** um currículo é consultado por trechos de origem proposta ainda não confirmados
- **THEN** a consulta devolve exatamente esses trechos, com os seus paths

### Requirement: A marcação do usuário é a única porta de entrada

Texto gerado pela IA SHALL substituir texto do currículo apenas através de um patch que
esteja no conjunto marcado pelo usuário. O modelo SHALL NOT aplicar sugestão não marcada em
nenhuma circunstância, e SHALL NOT alterar por conta própria qualquer trecho de origem
importada ou digitada pelo usuário.

#### Scenario: Sugestão não marcada não deixa rastro no currículo final

- **WHEN** o currículo final é gerado com um subconjunto das sugestões existentes
- **THEN** os trechos das sugestões não marcadas conservam exatamente o valor e a origem
  que tinham no currículo de origem

#### Scenario: Conteúdo original não é substituído sem marcação

- **WHEN** o currículo final é gerado
- **THEN** todo trecho cujo path não está no conjunto marcado conserva o texto de origem
  importada ou digitada pelo usuário, sem nenhuma reescrita

#### Scenario: Proposta marcada pode conter conteúdo novo

- **WHEN** um patch marcado propõe um texto que a IA gerou, introduzindo número, resultado
  ou formulação que não constava do currículo importado
- **THEN** a geração o aplica, porque a marcação do usuário é a confirmação exigida, e
  registra o trecho como proposto e confirmado

### Requirement: Período com mês e ano

Um período SHALL ser representado por início e fim, cada um com mês e ano, com o fim
podendo ser aberto ("atual"). Um período importado sem mês SHALL ser marcado como
incompleto, preservando o texto original, e o mês SHALL NOT ser inferido pelo sistema. Um
período incompleto SHALL ser completável pelo usuário. Períodos completos SHALL ser
comparáveis entre si, para permitir detecção de sobreposição.

#### Scenario: Formato completo é normalizado

- **WHEN** um período é informado como `03/2022 – 12/2024` ou com fim em aberto
- **THEN** ele é normalizado para início e fim com mês e ano, e o texto original permanece
  acessível

#### Scenario: Período sem mês fica incompleto

- **WHEN** um período informa apenas anos, como `2018 - 2019`
- **THEN** ele é marcado como incompleto, o texto original é preservado, nenhum mês é
  atribuído, e a validação do currículo não falha por causa disso

#### Scenario: Usuário completa o período

- **WHEN** o usuário informa o mês faltante de um período incompleto
- **THEN** o período passa a completo com mês e ano, e deixa de estar marcado como
  incompleto

#### Scenario: Formato não reconhecido

- **WHEN** um período não corresponde a nenhum formato reconhecido
- **THEN** ele é preservado como texto original e marcado como incompleto

#### Scenario: Renderização em mm/aaaa

- **WHEN** um período completo é renderizado
- **THEN** o resultado usa `mm/aaaa` em início e fim, e o fim aberto usa o rótulo de
  interface do idioma ativo

#### Scenario: Comparação de períodos

- **WHEN** dois períodos completos são comparados
- **THEN** é possível determinar qual começa antes e se as suas faixas se sobrepõem

#### Scenario: Período incompleto não é comparado silenciosamente

- **WHEN** uma comparação envolve um período incompleto
- **THEN** a operação sinaliza que a comparação não é possível, em vez de assumir um mês

### Requirement: Serialização validada

O currículo canônico SHALL ser serializável para um formato de transporte e
desserializável de volta, sem perda de estrutura, ids, ordem, origem de conteúdo ou estado
de completude dos períodos. A desserialização SHALL validar o
conteúdo recebido antes de produzir um currículo.

#### Scenario: Ida e volta preserva o currículo

- **WHEN** um currículo com patches aplicados, ordem aplicada e períodos incompletos é
  serializado e desserializado
- **THEN** o resultado é equivalente ao original, e todos os paths resolvem os mesmos
  trechos

#### Scenario: Payload inválido é rejeitado na fronteira

- **WHEN** um payload que não corresponde ao modelo é desserializado
- **THEN** a operação falha com erro que nomeia os campos inválidos, e nenhum currículo
  parcial é produzido
