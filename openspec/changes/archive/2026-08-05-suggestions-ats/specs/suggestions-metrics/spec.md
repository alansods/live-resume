## MODIFIED Requirements

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
