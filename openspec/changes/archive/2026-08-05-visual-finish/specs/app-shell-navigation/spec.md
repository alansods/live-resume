## ADDED Requirements

### Requirement: Caminho de volta à home na top bar

A top bar do aplicativo SHALL oferecer um caminho de volta à home, com ícone de seta à
esquerda e separado da marca por um divisor. Ele SHALL levar à raiz do site e SHALL ser
distinguível, para tecnologia assistiva, do "Voltar" da navegação de etapa — os dois exibem a
mesma palavra e têm destinos diferentes. Ele SHALL NOT alterar a etapa atual.

#### Scenario: A top bar leva de volta à home

- **WHEN** o aplicativo é exibido em qualquer etapa
- **THEN** a top bar apresenta um caminho para a raiz do site

#### Scenario: O caminho de volta é distinguível do voltar de etapa

- **WHEN** os controles do aplicativo são consultados pelo seu rótulo acessível
- **THEN** o caminho de volta à home e o "Voltar" da navegação de etapa têm rótulos
  acessíveis diferentes

#### Scenario: Voltar à home não muda a etapa

- **WHEN** o usuário está na etapa 03 e o caminho de volta à home é exibido
- **THEN** ele é um link para a raiz, e a etapa atual continua sendo a 03

### Requirement: Fidelidade ao design do shell

As telas do shell SHALL usar os tokens de `claude-design/styles.css` — cores, espaçamentos,
raios e sombras — sem redefinir valores, e SHALL apresentar os ícones do handoff nos seus
lugares: dropzone, confirmação de importação, navegação de etapa e seleção de saídas. Todo
ícone SHALL ser decorativo: o rótulo de um controle SHALL continuar sendo o seu texto, nunca
o ícone.

#### Scenario: Nenhuma cor fora do design system no shell

- **WHEN** os componentes e estilos do shell são inspecionados
- **THEN** nenhum valor de cor literal aparece fora de `claude-design/styles.css`

#### Scenario: Os ícones do handoff estão nos seus lugares

- **WHEN** as etapas 01 e 04 e a navegação de etapa são exibidas
- **THEN** a dropzone, a navegação de etapa e o botão de download apresentam os seus ícones

#### Scenario: Ícone não vira rótulo de controle

- **WHEN** os controles do shell são consultados pelo seu rótulo acessível
- **THEN** cada rótulo é o texto do controle, e os ícones não são anunciados

### Requirement: Uma única top bar no produto

A top bar do aplicativo e a da home SHALL ser a mesma — mesma marca, mesmo toggle de idioma e
mesma aparência. Uma diferença de estilo entre as duas SHALL ser tratada como defeito.

#### Scenario: As duas telas usam a mesma top bar

- **WHEN** a home e o aplicativo são exibidos
- **THEN** as duas apresentam a mesma marca e o mesmo toggle de idioma, com a mesma aparência

## MODIFIED Requirements

### Requirement: Interface bilíngue no shell

Todo texto de interface do shell, da etapa 01 e da etapa 04 SHALL vir do módulo de i18n, em
português e inglês, inclusive os rótulos acessíveis. Trocar o idioma da interface SHALL NOT
alterar o conteúdo do currículo nem as saídas escolhidas.

#### Scenario: Rótulos do shell mudam com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** os nomes das etapas e as ações de navegação aparecem em inglês

#### Scenario: Trocar o idioma da interface não muda as saídas escolhidas

- **WHEN** o usuário escolhe exportar em português e troca o idioma da interface para inglês
- **THEN** a saída escolhida continua sendo português

#### Scenario: Nenhum texto fixo em componente no shell

- **WHEN** os componentes do shell, da etapa 01 e da etapa 04 são inspecionados
- **THEN** nenhum texto de interface aparece escrito diretamente no componente

#### Scenario: O rótulo acessível do caminho de volta muda com o idioma

- **WHEN** o idioma da interface passa para inglês
- **THEN** o rótulo acessível do caminho de volta à home aparece em inglês
