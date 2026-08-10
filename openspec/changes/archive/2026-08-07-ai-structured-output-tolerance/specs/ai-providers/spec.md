## MODIFIED Requirements

### Requirement: A saída estruturada vale em qualquer provedor

Toda chamada com formato de resposta declarado SHALL exigir saída estruturada do provedor que
atender, no dialeto que a API dele aceita. A resposta SHALL ser revalidada do nosso lado,
qualquer que tenha sido o provedor. Em provedores compatíveis com a OpenAI, o schema SHALL ser
enviado como orientação de formato, e o provedor SHALL NOT recusar a chamada inteira só porque
o modelo deixou de citar uma chave — essa decisão SHALL ser da validação que recebe a resposta,
não do provedor.

#### Scenario: O schema vai no formato estrito nos provedores compatíveis com a OpenAI

- **WHEN** uma chamada com formato declarado vai para um provedor compatível com a OpenAI
- **THEN** o schema é enviado no formato estrito que essa API exige

#### Scenario: O schema vai no dialeto próprio do Gemini

- **WHEN** uma chamada com formato declarado vai para o Gemini
- **THEN** o schema é enviado no dialeto que essa API aceita

#### Scenario: Provedor compatível com a OpenAI não recusa por chave ausente que a validação da camada aceita

- **WHEN** um provedor compatível com a OpenAI gera uma resposta sem uma chave que o schema
  descreve
- **THEN** a resposta chega até a validação de quem chamou, em vez de ser recusada pelo
  provedor antes disso
