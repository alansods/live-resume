## ADDED Requirements

### Requirement: Rótulo do texto do arquivo só aparece com texto

Na lista de datas a completar, o rótulo que apresenta o texto vindo do arquivo SHALL ser
exibido apenas quando houver texto. Quando o arquivo não trouxe texto para aquele período,
nem o rótulo nem a linha SHALL aparecer.

#### Scenario: Período sem texto no arquivo não mostra rótulo vazio

- **WHEN** um período a completar não tem texto vindo do arquivo
- **THEN** a linha do texto do arquivo não é exibida, e nenhum rótulo aparece sem valor
