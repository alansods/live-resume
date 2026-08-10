## MODIFIED Requirements

### Requirement: Importação do arquivo na etapa 01

A etapa 01 SHALL exigir pagamento confirmado (capability `payments`) antes de aceitar um
arquivo. Sem pagamento confirmado, a dropzone SHALL NOT aceitar arquivo por seleção nem por
arraste. Com pagamento confirmado, a etapa 01 SHALL aceitar um arquivo por seleção e por
arraste, SHALL enviá-lo para a importação junto do token de sessão paga, e SHALL indicar que
está processando enquanto espera. Concluída, SHALL exibir a confirmação com o nome do arquivo.

#### Scenario: Sem pagamento, a dropzone não aceita arquivo

- **WHEN** o usuário está na etapa 01 sem ter pago
- **THEN** a dropzone não aceita arquivo por seleção nem por arraste

#### Scenario: Arquivo selecionado é importado

- **WHEN** o usuário, já com pagamento confirmado, seleciona um arquivo válido
- **THEN** o currículo importado passa a alimentar o fluxo, e a confirmação exibe o nome do
  arquivo

#### Scenario: Arquivo arrastado é importado

- **WHEN** o usuário, já com pagamento confirmado, solta um arquivo sobre a área de arraste
- **THEN** ele é importado como se tivesse sido selecionado

#### Scenario: Enquanto importa, a espera é informada

- **WHEN** a importação está em andamento
- **THEN** a etapa informa que está processando, e não aceita um segundo arquivo ao mesmo
  tempo

#### Scenario: Falha de importação é informada e não avança

- **WHEN** a importação falha
- **THEN** a etapa exibe a mensagem do erro, continua na etapa 01 e permite tentar outro
  arquivo

## ADDED Requirements

### Requirement: Gate de pagamento antes da dropzone

A etapa 01 SHALL apresentar a chamada "Pagar para começar" antes da dropzone quando não houver
pagamento confirmado na sessão da aba atual. Acionar essa chamada SHALL redirecionar para o
Checkout hospedado do Stripe. Retornando do Checkout com sucesso, a etapa 01 SHALL capturar o
token de sessão paga da URL de retorno e SHALL revelar a dropzone, liberando o envio de
arquivo.

#### Scenario: Chamada de pagamento aparece antes da dropzone

- **WHEN** a etapa 01 é aberta sem pagamento confirmado nesta sessão de aba
- **THEN** ela exibe "Pagar para começar" e a dropzone não está disponível para envio

#### Scenario: Retorno do Checkout libera a dropzone

- **WHEN** o usuário retorna do Checkout do Stripe com sucesso
- **THEN** a etapa 01 captura o token da URL e a dropzone passa a aceitar arquivo

#### Scenario: Checkout cancelado mantém a etapa 01 sem dropzone liberada

- **WHEN** o usuário cancela o Checkout do Stripe e retorna ao produto
- **THEN** a etapa 01 continua exibindo "Pagar para começar", sem liberar a dropzone

### Requirement: Token de sessão paga vive só em memória

O token de sessão paga SHALL viver apenas em memória da página (estado do componente),
lido uma vez da URL de retorno do Checkout. Ele SHALL NOT ser gravado em `localStorage`,
`sessionStorage` ou cookie. Recarregar a página SHALL perder o token, exatamente como já
acontece com o currículo importado e as demais informações da sessão — a preferência de
idioma continua sendo a única exceção guardada no navegador.

#### Scenario: Recarregar a página perde o token

- **WHEN** o usuário tem um token válido em memória e recarrega a página
- **THEN** a etapa 01 volta a exigir pagamento, sem token disponível

#### Scenario: O token não aparece em armazenamento do navegador

- **WHEN** o armazenamento do navegador é inspecionado depois de um pagamento confirmado
- **THEN** nenhuma entrada de `localStorage`, `sessionStorage` ou cookie contém o token
