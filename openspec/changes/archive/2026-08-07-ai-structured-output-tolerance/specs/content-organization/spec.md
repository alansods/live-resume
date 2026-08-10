## ADDED Requirements

### Requirement: Ausência de formação na ordem devolvida pela IA não falha a organização

Quando a IA devolve a ordem do conteúdo e a resposta não traz a chave de formações — por
exemplo, um currículo sem formação cadastrada —, o sistema SHALL tratá-la como lista vazia em
vez de recusar a ordem inteira e cair para a ordem cronológica só por essa chave.

#### Scenario: Ordem sem chave de formação é aceita como lista vazia

- **WHEN** a IA devolve a ordem do conteúdo sem a chave de formações
- **THEN** a ordem é aceita com a lista de formações vazia, sem cair para ordem cronológica
