# export-docx-pdf Specification

## Purpose
Produzir os arquivos finais do currículo — DOCX e PDF, em português e inglês — no modelo
padrão de coluna única que sistemas de recrutamento leem corretamente, com nome padronizado
e empacotamento em `.zip` quando o usuário marca mais de uma saída.
## Requirements
### Requirement: DOCX no modelo padrão

O DOCX gerado SHALL usar estilos nativos de parágrafo para os títulos de seção e SHALL NOT
conter tabela, caixa de texto, cabeçalho ou rodapé com conteúdo, nem coluna lateral. O
conteúdo SHALL sair em coluna única.

Os estilos nativos SHALL ser sobrescritos com a fonte, o tamanho e a cor do padrão: estilo
nativo do editor traz consigo família, corpo e cor do tema, e herdá-los produz um documento
com mais de uma fonte — o que o modelo padrão proíbe.

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

#### Scenario: Estilo nativo não impõe a tipografia do tema

- **WHEN** os estilos do DOCX gerado são inspecionados
- **THEN** o estilo do nome e o do título de seção declaram a fonte e o tamanho do padrão, em
  vez de herdá-los do editor

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
- **THEN** a ordem e a tradução vêm de respostas gravadas, e nenhuma chamada a API de provedor
  é feita

### Requirement: Tipografia comum às duas saídas

As duas saídas SHALL desenhar o currículo com a mesma escala tipográfica — nome, contato,
título de seção, cargo, período e corpo —, de modo que o mesmo currículo em DOCX e em PDF
seja o mesmo documento, e não dois. Cada documento SHALL usar **uma única família de fonte**,
e as famílias das duas saídas SHALL ser metricamente equivalentes, para que as quebras de
linha coincidam sem que nenhuma fonte precise ser embutida.

O **peso** de cada elemento SHALL ser o mesmo nos dois formatos: nome, título de seção e
cargo em negrito; contato, período e corpo em peso normal. Tamanho igual com peso diferente
é a mesma divergência de sempre, só que menos visível.

A **margem da página** SHALL ser a mesma nos dois formatos e SHALL vir do módulo comum,
nunca do padrão do gerador. Quebra de linha é função da largura da coluna de texto: duas
saídas com a mesma fonte e o mesmo corpo, mas margens diferentes, quebram em pontos
diferentes — e deixam de ser o mesmo documento.

A **marca do bullet e o seu recuo** SHALL ser os mesmos nos dois formatos. A marca SHALL ser
um caractere que as duas famílias desenhem: o círculo cheio `●` que o gerador de DOCX usa por
padrão não existe na codificação padrão do PDF e sai como letra trocada, então a marca comum
é `•`.

Nenhum estilo de título SHALL trazer cor herdada do tema do editor: o texto do documento
SHALL ser preto, com a linha de contato em cinza escuro. O estilo de hiperlink fica de fora —
link azul é convenção universal, e forçá-lo a preto tornaria um link indistinguível de texto
comum para quem abrir o arquivo depois.

#### Scenario: O tamanho de cada elemento é o mesmo nos dois formatos

- **WHEN** o mesmo currículo é exportado em DOCX e em PDF e os dois arquivos são reabertos
- **THEN** o nome, o título de seção e o corpo têm o mesmo tamanho em pontos nos dois

#### Scenario: O peso de cada elemento é o mesmo nos dois formatos

- **WHEN** o mesmo currículo é exportado em DOCX e em PDF e os dois arquivos são reabertos
- **THEN** nome, título de seção e cargo saem em negrito nos dois, e contato, período e corpo
  saem em peso normal nos dois

#### Scenario: A largura da coluna de texto é a mesma nos dois formatos

- **WHEN** a margem de página de cada gerador é lida
- **THEN** ela é a mesma nos dois e vem do módulo comum, e nenhum gerador cai no padrão de
  margem da sua biblioteca

#### Scenario: O bullet tem a mesma marca e o mesmo recuo nos dois formatos

- **WHEN** um currículo com bullets é exportado nos dois formatos e reaberto
- **THEN** os dois trazem a mesma marca de bullet, legível em ambos, com o mesmo recuo do
  texto em relação à margem

#### Scenario: Uma única família de fonte por documento

- **WHEN** cada arquivo gerado é reaberto
- **THEN** todo o texto usa uma família só, e não há uma fonte para o corpo e outra para os
  títulos

#### Scenario: Nenhuma cor de tema nos títulos

- **WHEN** os estilos do DOCX gerado são inspecionados
- **THEN** nenhum estilo de título traz a cor de destaque do tema do editor, e todos saem em
  preto

#### Scenario: O nome não domina a página

- **WHEN** o currículo é exportado
- **THEN** o nome é maior que o corpo do texto sem chegar ao dobro dele, e cabe numa linha

### Requirement: O ritmo vertical é declarado pelo documento

O DOCX SHALL declarar o espaçamento vertical de cada parágrafo e a entrelinha, e SHALL NOT
deixá-los a cargo do padrão do editor que abrir o arquivo. A escala de espaço SHALL ser a
mesma para os dois formatos e SHALL viver num único módulo, ao lado de tamanho, cor e
família — nenhum gerador SHALL manter escala própria.

#### Scenario: O DOCX declara o próprio espaçamento

- **WHEN** o DOCX é gerado e reaberto
- **THEN** os parágrafos trazem espaçamento e entrelinha declarados, e nenhum deles depende
  do padrão do editor

#### Scenario: Os dois formatos leem a mesma escala

- **WHEN** a escala de espaço é lida pelos geradores
- **THEN** ela vem de um único módulo, e nenhum gerador define a sua

