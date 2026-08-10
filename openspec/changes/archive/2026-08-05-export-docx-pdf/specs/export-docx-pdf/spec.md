## Purpose

Produzir os arquivos finais do currículo — DOCX e PDF, em português e inglês — no modelo
padrão de coluna única que sistemas de recrutamento leem corretamente, com nome padronizado
e empacotamento em `.zip` quando o usuário marca mais de uma saída.

## ADDED Requirements

### Requirement: DOCX no modelo padrão

O DOCX gerado SHALL usar estilos nativos de parágrafo para os títulos de seção e SHALL NOT
conter tabela, caixa de texto, cabeçalho ou rodapé com conteúdo, nem coluna lateral. O
conteúdo SHALL sair em coluna única.

#### Scenario: Títulos de seção usam estilo nativo

- **WHEN** o DOCX gerado é reaberto
- **THEN** os títulos de seção aparecem como parágrafos de estilo de título, não como texto
  em negrito

#### Scenario: DOCX não contém tabela

- **WHEN** o documento interno do DOCX gerado é inspecionado
- **THEN** ele não contém nenhum elemento de tabela

#### Scenario: DOCX não contém caixa de texto nem coluna

- **WHEN** o documento interno do DOCX gerado é inspecionado
- **THEN** ele não contém caixa de texto nem definição de múltiplas colunas

### Requirement: PDF com texto selecionável

O PDF gerado SHALL conter o texto do currículo como texto extraível, nunca como imagem.

#### Scenario: Texto do PDF é extraível

- **WHEN** o PDF gerado é reaberto por um extrator de texto
- **THEN** o nome, os cargos e os bullets do currículo são extraídos como texto

#### Scenario: PDF não é imagem

- **WHEN** o PDF gerado é reaberto
- **THEN** a extração devolve texto não vazio, sem depender de reconhecimento de imagem

### Requirement: Conteúdo completo nas saídas

Cada arquivo gerado SHALL conter todo o conteúdo do currículo final: nome, contato, resumo,
cada experiência com empresa, cargo, período e bullets, cada formação e as habilidades.
Seção ausente no currículo SHALL NOT aparecer com título vazio.

#### Scenario: Todo o conteúdo aparece no DOCX

- **WHEN** um currículo completo é exportado em DOCX e reaberto
- **THEN** o nome, o contato, o resumo, cada empresa, cada cargo, cada bullet, cada formação
  e as habilidades estão no texto do arquivo

#### Scenario: Todo o conteúdo aparece no PDF

- **WHEN** um currículo completo é exportado em PDF e reaberto
- **THEN** o nome, cada empresa, cada cargo e cada bullet estão no texto extraído

#### Scenario: Seção ausente não vira título vazio

- **WHEN** um currículo sem resumo e sem habilidades é exportado
- **THEN** o arquivo não traz título de resumo nem de habilidades

### Requirement: Data no formato do idioma da saída

O período SHALL ser renderizado no arquivo no formato do idioma daquela saída: `mm/aaaa` em
português, mês abreviado por extenso em inglês.

#### Scenario: Arquivo em português traz data numérica

- **WHEN** um currículo com período de `03/2022` a `12/2024` é exportado em português
- **THEN** o texto do arquivo contém `03/2022 – 12/2024`

#### Scenario: Arquivo em inglês traz mês abreviado

- **WHEN** o mesmo currículo é exportado em inglês
- **THEN** o texto do arquivo contém `Mar 2022 – Dec 2024`

### Requirement: Nome de arquivo padronizado

Cada arquivo SHALL receber nome derivado do nome da pessoa e do idioma, em minúsculas, sem
acento e sem espaço, com a extensão do formato. Nomes diferentes SHALL resultar em arquivos
com nomes diferentes, e o mesmo currículo SHALL produzir sempre o mesmo nome.

#### Scenario: Nome é derivado da pessoa e do idioma

- **WHEN** o currículo de "Marina Alencar" é exportado em DOCX nos dois idiomas
- **THEN** os arquivos se chamam `curriculo-marina-alencar-pt.docx` e
  `resume-marina-alencar-en.docx`

#### Scenario: Acento e espaço não sobrevivem ao nome

- **WHEN** o currículo de uma pessoa com acento no nome é exportado
- **THEN** o nome do arquivo não contém acento, espaço nem letra maiúscula

#### Scenario: Nome vazio não produz arquivo sem identificação

- **WHEN** o currículo não tem nome preenchido
- **THEN** o arquivo ainda recebe um nome válido, com a parte de identificação omitida

### Requirement: Empacotamento das saídas marcadas

Quando o usuário marcar mais de uma saída, o sistema SHALL entregar um único `.zip` com
todos os arquivos gerados. Com uma única saída marcada, o sistema SHALL entregar o arquivo
diretamente, sem `.zip`.

#### Scenario: Várias saídas viram um zip

- **WHEN** o usuário marca português e inglês em DOCX e PDF
- **THEN** o resultado é um `.zip` que, ao ser aberto, contém os quatro arquivos com os
  nomes padronizados

#### Scenario: Saída única não é compactada

- **WHEN** o usuário marca apenas PDF em português
- **THEN** o resultado é o próprio PDF, e não um `.zip`

#### Scenario: Nenhuma saída marcada não gera arquivo

- **WHEN** nenhum idioma ou nenhum formato é marcado
- **THEN** nenhum arquivo é gerado, e o resultado informa que não havia saída marcada

### Requirement: Ordem e tradução obtidas uma vez por exportação

O sistema SHALL pedir a ordem do conteúdo uma única vez por exportação e SHALL reutilizá-la
em todas as saídas. A tradução SHALL ser obtida no máximo uma vez por idioma e reutilizada
nos dois formatos daquele idioma.

#### Scenario: Uma ordem serve todas as saídas

- **WHEN** quatro saídas são exportadas
- **THEN** a organização do conteúdo é pedida uma única vez, e os quatro arquivos trazem a
  mesma ordem de experiências

#### Scenario: Uma tradução serve os dois formatos

- **WHEN** DOCX e PDF em inglês são exportados
- **THEN** a tradução é pedida uma única vez

#### Scenario: Idioma do currículo não é traduzido

- **WHEN** a saída pedida é o idioma em que o currículo já está
- **THEN** o conteúdo daquela saída é o do currículo, sem tradução aplicada

### Requirement: Falha por saída, não por lote

Falha na produção de uma saída SHALL NOT impedir a entrega das demais. O resultado SHALL
nomear quais saídas falharam e por quê, e SHALL entregar os arquivos que foram gerados.

#### Scenario: Falha de tradução não derruba o outro idioma

- **WHEN** a tradução para inglês falha e o usuário havia marcado os dois idiomas
- **THEN** os arquivos em português são entregues, e o resultado registra a falha do inglês

#### Scenario: Falha de todas as saídas não devolve arquivo vazio

- **WHEN** todas as saídas marcadas falham
- **THEN** nenhum arquivo é entregue, e o resultado registra as falhas

### Requirement: Aplicação das sugestões marcadas na exportação

O currículo exportado SHALL ser o produzido por `generateFinal` a partir das sugestões que o
usuário marcou. Sugestão não marcada SHALL NOT aparecer em nenhum arquivo.

#### Scenario: Sugestão marcada aparece no arquivo

- **WHEN** uma sugestão marcada substitui um bullet e o currículo é exportado
- **THEN** o texto proposto está no arquivo, e o texto original não

#### Scenario: Sugestão não marcada não aparece no arquivo

- **WHEN** uma sugestão é produzida e não é marcada
- **THEN** o texto que ela propõe não aparece em nenhum arquivo gerado

### Requirement: Nada é persistido na exportação

O sistema SHALL NOT gravar o currículo, os arquivos gerados ou qualquer parte deles fora da
requisição que os produziu. Nenhum conteúdo do currículo SHALL aparecer em log.

#### Scenario: Nenhum conteúdo de currículo em log na exportação

- **WHEN** uma exportação falha e registra o erro
- **THEN** nenhum trecho do currículo aparece no que foi registrado

### Requirement: Testes de exportação sem a IA real

A exportação SHALL ser isolada atrás da mesma fronteira de IA do projeto, e os arquivos
gerados SHALL ser verificados reabrindo-os.

#### Scenario: Nenhuma chamada real de exportação na suíte

- **WHEN** a suíte de testes é executada
- **THEN** a ordem e a tradução vêm de respostas gravadas, e nenhuma chamada à API do Gemini
  é feita
