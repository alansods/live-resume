## MODIFIED Requirements

### Requirement: Seleção de saídas na etapa 04

A etapa 04 SHALL permitir escolher idiomas (português e inglês) e formatos (PDF e DOCX), e
SHALL indicar quantos arquivos serão gerados. Com nenhuma combinação escolhida, a ação de
baixar SHALL NOT estar disponível. A contagem SHALL ser verificada onde ela aparece para o
usuário — no rótulo do botão de download —, e não numa função de estado que só o teste
chame.

#### Scenario: A contagem reflete idiomas vezes formatos

- **WHEN** o usuário marca dois idiomas e dois formatos
- **THEN** o botão de download anuncia quatro arquivos

#### Scenario: Sem seleção não há download

- **WHEN** nenhum idioma ou nenhum formato está marcado
- **THEN** a ação de baixar não está disponível

#### Scenario: Uma combinação gera um arquivo

- **WHEN** o usuário marca um idioma e um formato
- **THEN** o botão de download anuncia um arquivo
