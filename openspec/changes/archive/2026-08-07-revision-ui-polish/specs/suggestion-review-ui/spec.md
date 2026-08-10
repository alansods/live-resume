## MODIFIED Requirements

### Requirement: Marcar é a única ação sobre o currículo final

Cada cartão SHALL oferecer marcação e desmarcação, sob o rótulo de **aceitar** a sugestão.
Aceitar SHALL significar exatamente marcar: a sugestão passa a constar do conjunto que a
exportação recebe, e o currículo em revisão SHALL NOT mudar por causa disso. O conjunto de
sugestões marcadas SHALL ser o que a exportação recebe, e sugestão não marcada SHALL NOT
entrar no currículo final. A tela SHALL NOT oferecer aplicar, desfazer, editar texto do
currículo ou reordenar conteúdo — desmarcar SHALL ser a única reversão.

#### Scenario: Marcar inclui a sugestão no conjunto

- **WHEN** o usuário marca uma sugestão
- **THEN** ela passa a constar do conjunto entregue para a geração, com o seu path e o seu
  texto proposto

#### Scenario: Aceitar uma sugestão não altera o currículo em revisão

- **WHEN** o usuário aceita uma sugestão
- **THEN** o currículo exibido continua exatamente como estava, e o texto proposto continua
  aparecendo só dentro do cartão

#### Scenario: Desmarcar remove do conjunto

- **WHEN** o usuário desmarca uma sugestão que havia marcado
- **THEN** ela deixa de constar do conjunto entregue

#### Scenario: Marcar todas marca as pendentes

- **WHEN** o usuário aciona marcar todas
- **THEN** todas as sugestões não ignoradas passam a estar marcadas

#### Scenario: Nenhuma ação de desfazer ou editar é oferecida

- **WHEN** a revisão é inspecionada
- **THEN** não há controle de desfazer, de aplicar ao currículo, de edição de texto nem de
  reordenação

### Requirement: Foco e navegação entre marcador e cartão

O marcador SHALL abrir, ao passar o ponteiro, um resumo com o tipo, o número, o título e o
texto proposto da sugestão. Acionar o marcador ou o "ver detalhes" SHALL levar ao cartão
correspondente e destacá-lo. O "ver detalhes" SHALL ser alcançável com o ponteiro: o
percurso entre o marcador e o resumo SHALL pertencer ao conjunto que mantém o resumo
aberto, e SHALL NOT haver faixa intermediária que o feche no caminho.

#### Scenario: O resumo do marcador traz o essencial

- **WHEN** o ponteiro entra num marcador
- **THEN** aparece o tipo, o número, o título e o texto proposto daquela sugestão

#### Scenario: Acionar o marcador foca o cartão

- **WHEN** o usuário aciona o marcador de uma sugestão
- **THEN** o cartão correspondente recebe destaque de foco

#### Scenario: O resumo continua aberto no caminho até ele

- **WHEN** o ponteiro sai do marcador em direção ao resumo que ele abriu
- **THEN** o resumo continua exibido, e o "ver detalhes" pode ser acionado

#### Scenario: O resumo fecha ao sair do marcador

- **WHEN** o ponteiro deixa o marcador
- **THEN** o resumo deixa de ser exibido
