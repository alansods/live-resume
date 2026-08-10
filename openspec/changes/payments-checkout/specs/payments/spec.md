## Purpose

Cobrar um valor único de R$2,00 (ou US$0,40, conforme o idioma escolhido) antes da primeira
chamada de IA do fluxo, para cobrir o custo daquela chamada, sem introduzir conta, login ou
qualquer identificação persistente de usuário.

## ADDED Requirements

### Requirement: Sessão de pagamento único

O sistema SHALL criar uma Stripe Checkout Session em modo de pagamento único (não assinatura)
quando o usuário aciona "Pagar para começar". O preço SHALL ser R$2,00 quando o idioma da
interface for português e US$0,40 quando for inglês, escolhido pelo mesmo toggle de idioma já
existente (`lib/i18n`) — SHALL NOT depender de geolocalização ou IP.

#### Scenario: Sessão em reais para interface em português

- **WHEN** o usuário aciona "Pagar para começar" com a interface em português
- **THEN** a Checkout Session criada cobra R$2,00

#### Scenario: Sessão em dólares para interface em inglês

- **WHEN** o usuário aciona "Pagar para começar" com a interface em inglês
- **THEN** a Checkout Session criada cobra US$0,40

#### Scenario: Pagamento é único, não recorrente

- **WHEN** uma Checkout Session é criada
- **THEN** ela é de pagamento único, sem qualquer configuração de assinatura ou recorrência

### Requirement: Token de sessão paga emitido na confirmação

Quando o usuário retorna do Checkout, o sistema SHALL confirmar o pagamento consultando a
Checkout Session diretamente na API do Stripe (autenticada pela chave do servidor) e, só
quando `payment_status` for "paga", SHALL emitir um token assinado (HMAC) que autoriza
exatamente uma importação. O token SHALL expirar em até 30 minutos da emissão. O sistema
SHALL NOT gravar o token, o pagamento ou qualquer identificação do pagador em banco de dados —
a validade do token depende só da assinatura e do relógio, nunca de uma consulta a um registro
persistente.

Em paralelo, o sistema SHALL manter um webhook que verifica a assinatura do Stripe em
`checkout.session.completed` para registro do lado do servidor; esse webhook SHALL NOT ser o
que entrega o token ao navegador — não há canal do servidor para o navegador nesse sentido.

#### Scenario: Retorno com pagamento confirmado emite token válido

- **WHEN** o usuário retorna do Checkout e a Checkout Session correspondente está paga
- **THEN** o sistema emite um token assinado, válido por até 30 minutos

#### Scenario: Retorno com pagamento não confirmado não emite token

- **WHEN** o usuário retorna do Checkout e a Checkout Session correspondente não está paga
- **THEN** o sistema SHALL NOT emitir token

#### Scenario: Webhook com assinatura inválida é recusado

- **WHEN** uma requisição chega à rota de webhook sem a assinatura correta do Stripe
- **THEN** o sistema recusa a requisição

#### Scenario: Token expirado é recusado

- **WHEN** um token é apresentado depois de 30 minutos da emissão
- **THEN** ele é recusado como inválido

### Requirement: Token de uso único

Cada token SHALL autorizar exatamente uma chamada bem-sucedida à importação. Depois de
consumido — importação concluída com sucesso —, o mesmo token SHALL NOT autorizar uma segunda
chamada.

#### Scenario: Token consumido não autoriza nova importação

- **WHEN** um token já usado numa importação concluída é apresentado de novo
- **THEN** a nova importação é recusada com `402`

#### Scenario: Importação que falha não consome o token

- **WHEN** a importação falha por motivo do arquivo (formato, corrupção, documento que não é
  currículo) antes de chamar a IA
- **THEN** o token continua válido para nova tentativa

### Requirement: Nenhuma identificação de pagador é persistida

O sistema SHALL NOT armazenar nome, e-mail, número de cartão ou qualquer dado do pagador fora
do que o próprio Stripe retém do lado dele. Nenhuma tabela, arquivo ou log do produto SHALL
conter dado de pagamento além do necessário para depurar falha do webhook, e esse registro
SHALL NOT incluir dado de cartão.

#### Scenario: Nenhum dado de pagador em log do produto

- **WHEN** um pagamento é processado com sucesso
- **THEN** nenhum log do produto contém nome, e-mail ou dado de cartão do pagador

### Requirement: Reembolso é responsabilidade manual

O sistema SHALL NOT expor fluxo de reembolso automático ou autoatendimento ao usuário.
Reembolso, quando necessário, SHALL ser feito manualmente pelo Stripe Dashboard.

#### Scenario: Nenhuma ação de reembolso na interface

- **WHEN** a interface do produto é inspecionada
- **THEN** não existe botão, rota ou fluxo de reembolso acessível ao usuário
