## ADDED Requirements

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
