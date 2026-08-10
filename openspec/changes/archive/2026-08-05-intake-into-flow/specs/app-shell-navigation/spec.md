## ADDED Requirements

### Requirement: O que foi digitado na etapa 02 alimenta o fluxo

O aplicativo SHALL manter o que o usuário digitou na etapa 02 e SHALL entregar às etapas 03 e
04 o **currículo em trabalho** — o importado mais o que foi digitado. Etapa 02 sem nada
digitado SHALL entregar o currículo importado inalterado. Voltar à etapa 02 e alterar o que
foi digitado SHALL recompor o currículo em trabalho a partir do importado, nunca somar ao
resultado anterior.

#### Scenario: O que foi digitado chega à revisão

- **WHEN** o usuário digita uma experiência na etapa 02 e avança para a etapa 03
- **THEN** o currículo exibido na revisão contém aquela experiência

#### Scenario: O que foi digitado chega à exportação

- **WHEN** o usuário digita uma formação e exporta
- **THEN** o currículo enviado à exportação contém aquela formação

#### Scenario: Etapa 02 vazia não muda o currículo

- **WHEN** o usuário passa pela etapa 02 sem digitar nada
- **THEN** o currículo que segue para as etapas seguintes é exatamente o importado

#### Scenario: Editar a etapa 02 recompõe sem acumular

- **WHEN** o usuário volta à etapa 02, remove uma experiência que tinha digitado e avança de
  novo
- **THEN** o currículo em trabalho já não contém aquela experiência

### Requirement: Material do usuário enviado às sugestões

O aplicativo SHALL enviar às rotas de sugestão, junto do currículo, o texto que o usuário
digitou na etapa 02 e que não virou item do currículo. Esse texto SHALL ser usado apenas como
material do usuário para conferir números propostos, e SHALL NOT entrar no currículo.

#### Scenario: Sobra da etapa 02 acompanha o pedido de sugestões

- **WHEN** o usuário digita uma experiência incompleta e entra na revisão
- **THEN** o texto dela acompanha o pedido de sugestões como material do usuário

#### Scenario: Sem sobra, o pedido não carrega material extra

- **WHEN** tudo que o usuário digitou virou item do currículo
- **THEN** o pedido de sugestões não carrega material extra

### Requirement: Períodos incompletos da importação chegam à etapa 02

O aplicativo SHALL preservar o relatório produzido pela importação e SHALL apresentar na
etapa 02 os períodos que ele marcou como incompletos. Concluir um período SHALL atualizar o
currículo que segue para as etapas seguintes.

#### Scenario: Período sem mês aparece na etapa 02

- **WHEN** a importação registra uma experiência com período sem mês
- **THEN** a etapa 02 apresenta aquele período para o usuário completar

#### Scenario: Importação sem pendência não apresenta a seção

- **WHEN** a importação não registra nenhum período incompleto
- **THEN** a etapa 02 não apresenta seção de períodos a completar

#### Scenario: Período completado segue para as etapas seguintes

- **WHEN** o usuário informa o mês que faltava e avança
- **THEN** o currículo em trabalho traz aquele período completo

### Requirement: Sugestão que já não resolve não chega à exportação

O aplicativo SHALL enviar à exportação apenas as sugestões marcadas cujo trecho ainda existe
no currículo em trabalho. Sugestão marcada sobre um item que o usuário depois removeu SHALL
ser descartada em silêncio, sem impedir a exportação.

#### Scenario: Sugestão de item removido não vai à exportação

- **WHEN** o usuário marca uma sugestão, volta à etapa 02 e remove o item que ela endereça
- **THEN** a exportação não recebe aquela sugestão e o download continua disponível

#### Scenario: Sugestão que ainda resolve continua indo

- **WHEN** existem sugestões marcadas sobre trechos que continuam no currículo
- **THEN** todas elas chegam à exportação
