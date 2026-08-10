# export-translation Specification

## Purpose
Produzir o conteúdo do currículo final no idioma de saída que o usuário marcou, preservando
estrutura, ids, datas, números e os nomes próprios que não se traduzem, e renderizando o
período no formato de data daquele idioma.
## Requirements
### Requirement: Tradução do conteúdo para o idioma de saída

O sistema SHALL traduzir para o idioma marcado o cargo do cabeçalho, o resumo, o cargo de
cada experiência, os bullets, o curso de cada formação e as habilidades. A tradução SHALL
acontecer sobre o currículo final — depois das sugestões marcadas e da ordem definida — e
SHALL NOT acontecer em nenhum outro momento do fluxo.

#### Scenario: Bullets saem no idioma marcado

- **WHEN** um currículo em português é traduzido para inglês
- **THEN** os bullets do resultado estão em inglês

#### Scenario: Resumo, cargos, curso e habilidades também são traduzidos

- **WHEN** um currículo em português é traduzido para inglês
- **THEN** o resumo, o cargo do cabeçalho, o cargo de cada experiência, o curso de cada
  formação e as habilidades estão em inglês

#### Scenario: Seção ausente não é criada na tradução

- **WHEN** um currículo sem resumo e sem habilidades é traduzido
- **THEN** o resultado continua sem resumo e sem habilidades

### Requirement: Nomes próprios e datas não são traduzidos

O sistema SHALL NOT alterar o nome da pessoa, o contato, o nome da empresa, o nome da
instituição de ensino e os períodos. Esses campos SHALL sair da tradução idênticos ao
currículo de entrada.

#### Scenario: Nome da empresa atravessa intacto

- **WHEN** um currículo com a empresa "Fintech Kobo" é traduzido para inglês
- **THEN** a empresa continua "Fintech Kobo"

#### Scenario: Nome da pessoa e contato atravessam intactos

- **WHEN** um currículo é traduzido
- **THEN** o nome e o contato do cabeçalho são exatamente os de entrada

#### Scenario: Instituição de ensino atravessa intacta

- **WHEN** um currículo com a instituição "Universidade Federal Fluminense" é traduzido
- **THEN** a instituição continua com esse nome, mesmo que o curso tenha sido traduzido

#### Scenario: Período não é alterado pela tradução

- **WHEN** um currículo é traduzido
- **THEN** cada período conserva os mesmos início, fim e texto original

### Requirement: Estrutura preservada na tradução

A tradução SHALL preservar a estrutura do currículo: mesma quantidade de experiências,
bullets e formações, mesmos ids e mesma ordem. Resposta que acrescente, remova ou renomeie
item SHALL ser recusada, e a operação SHALL falhar em vez de entregar currículo alterado.

#### Scenario: Ids e contagens são os mesmos

- **WHEN** um currículo é traduzido
- **THEN** o resultado tem os mesmos ids de experiência, bullet e formação, na mesma ordem

#### Scenario: Resposta que perde um bullet é recusada

- **WHEN** a IA devolve a tradução sem um dos bullets do currículo
- **THEN** a operação falha com erro, e nenhum currículo traduzido é entregue

#### Scenario: Resposta que inventa item é recusada

- **WHEN** a IA devolve a tradução com uma experiência que não existe no currículo
- **THEN** a operação falha com erro

### Requirement: Números preservados na tradução

Os números presentes em cada trecho traduzido SHALL ser os mesmos do trecho de origem. O
sistema SHALL verificar isso por conta própria e SHALL recusar a tradução que altere,
acrescente ou perca número — um valor que muda na travessia vira dado falso no currículo.

#### Scenario: Percentual sobrevive à tradução

- **WHEN** o bullet "reduzi a latência p95 em 77%" é traduzido
- **THEN** o bullet traduzido continua trazendo 77

#### Scenario: Número alterado é recusado

- **WHEN** a tradução devolve 70 onde o original trazia 77
- **THEN** a operação falha com erro, e nenhum currículo traduzido é entregue

#### Scenario: Número inventado é recusado

- **WHEN** a tradução acrescenta um número que não existia no trecho de origem
- **THEN** a operação falha com erro

#### Scenario: Trecho sem número não é afetado pela verificação

- **WHEN** um trecho sem nenhum número é traduzido
- **THEN** ele passa na verificação normalmente

### Requirement: Currículo já no idioma de saída não é traduzido

O sistema SHALL identificar o idioma do currículo na mesma chamada da tradução. Quando o
idioma identificado for igual ao idioma de saída, o sistema SHALL entregar o currículo de
entrada como está e SHALL descartar o conteúdo devolvido pela IA.

#### Scenario: Idioma coincidente devolve o original

- **WHEN** um currículo em português é pedido em português
- **THEN** o resultado é idêntico ao currículo de entrada, campo por campo

#### Scenario: Resposta é descartada quando o idioma coincide

- **WHEN** a IA identifica o idioma como igual ao de saída e ainda assim devolve texto
  reescrito
- **THEN** esse texto é descartado, e nenhum trecho do currículo muda

### Requirement: Falha de tradução é erro

Falha de comunicação, resposta fora do esquema e resposta que não passa na verificação SHALL
produzir erro. O sistema SHALL NOT entregar o currículo de origem no lugar da tradução — um
arquivo marcado como de um idioma que sai em outro é pior que arquivo nenhum.

#### Scenario: Falha de comunicação na tradução é distinguível

- **WHEN** a chamada à IA falha ou expira durante a tradução
- **THEN** o erro identifica falha de comunicação, e nenhum currículo é devolvido

#### Scenario: Tradução não degrada para o original

- **WHEN** a tradução falha por qualquer motivo
- **THEN** a operação lança erro, em vez de devolver o currículo no idioma de origem

### Requirement: Data renderizada no formato do idioma

O período SHALL ser renderizado no formato do idioma de saída: `mm/aaaa` em português, com
o fim aberto como `atual`; mês abreviado por extenso em inglês, com o fim aberto como
`Present`. Período incompleto SHALL sair com o texto original do arquivo, em qualquer
idioma.

#### Scenario: Data em português usa mm/aaaa

- **WHEN** o período de `03/2022` a `12/2024` é renderizado em português
- **THEN** o resultado é `03/2022 – 12/2024`

#### Scenario: Data em inglês usa mês abreviado

- **WHEN** o período de `03/2022` a `12/2024` é renderizado em inglês
- **THEN** o resultado é `Mar 2022 – Dec 2024`

#### Scenario: Fim aberto usa o rótulo do idioma

- **WHEN** um período em curso é renderizado em português e em inglês
- **THEN** o fim sai como `atual` e como `Present`, respectivamente

#### Scenario: Período incompleto sai com o texto do arquivo

- **WHEN** um período sem mês é renderizado em qualquer idioma
- **THEN** o resultado é o texto original do arquivo, sem mês inventado

### Requirement: Origem do texto traduzido

Todo trecho traduzido SHALL registrar origem de conteúdo de máquina confirmado pelo usuário,
para que conteúdo humano e conteúdo de máquina continuem distinguíveis no currículo
exportado.

#### Scenario: Trecho traduzido registra origem de máquina

- **WHEN** um bullet importado é traduzido
- **THEN** o trecho resultante registra origem proposta e confirmada, não mais importada

#### Scenario: Trecho não traduzido conserva a origem

- **WHEN** o nome da empresa atravessa a tradução sem mudar
- **THEN** nenhuma origem de trecho não traduzido é alterada

### Requirement: Testes de tradução sem a IA real

A tradução SHALL ser isolada atrás da mesma fronteira de IA do projeto, para que nenhum
teste dependa da API real.

#### Scenario: Nenhuma chamada real de tradução na suíte

- **WHEN** a suíte de testes é executada
- **THEN** as traduções vêm de respostas gravadas, e nenhuma chamada a API de provedor é feita

