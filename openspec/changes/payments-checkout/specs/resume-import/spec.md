## ADDED Requirements

### Requirement: Importação exige token de sessão paga

A rota de importação SHALL exigir um token de sessão paga válido (capability `payments`) antes
de iniciar qualquer processamento. Sem um token válido, a rota SHALL responder `402 Payment
Required` e SHALL NOT extrair o arquivo nem chamar a IA. O token SHALL ser verificado antes de
qualquer leitura do arquivo enviado.

#### Scenario: Requisição sem token é recusada antes de tocar no arquivo

- **WHEN** a rota de importação recebe um arquivo sem token de sessão paga
- **THEN** ela responde `402`, e nenhuma extração nem chamada de IA acontece

#### Scenario: Token inválido ou expirado é recusado

- **WHEN** a rota de importação recebe um token que não verifica ou já expirou
- **THEN** ela responde `402`, com motivo distinguível de "sem token"

#### Scenario: Token válido libera a importação normal

- **WHEN** a rota de importação recebe um token válido e não usado, junto de um arquivo válido
- **THEN** a importação segue o fluxo já existente (extração, estruturação pela IA, verificação),
  sem alteração no seu comportamento

#### Scenario: Falha do arquivo depois do token validado não consome o token

- **WHEN** o token é válido mas o arquivo é recusado (formato não suportado, corrompido, PDF sem
  texto, documento que não é currículo)
- **THEN** a importação falha do jeito já descrito para esse motivo, e o token continua
  disponível para nova tentativa (capability `payments`)
