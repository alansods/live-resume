## MODIFIED Requirements

### Requirement: Interface bilíngue no shell

Todo texto de interface do shell, da etapa 01 e da etapa 04 SHALL vir do módulo de i18n, em
português e inglês, inclusive os rótulos acessíveis. Trocar o idioma da interface SHALL NOT
alterar o conteúdo do currículo nem as saídas escolhidas. O idioma escolhido SHALL
sobreviver ao recarregamento e à troca de página, no navegador em que foi escolhido.

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

#### Scenario: O idioma escolhido sobrevive a uma nova visita

- **WHEN** o usuário troca o idioma para inglês e volta ao app depois, numa nova visita
- **THEN** a interface aparece em inglês, sem que ele escolha de novo

## ADDED Requirements

### Requirement: Só a preferência de idioma é guardada no navegador

O aplicativo SHALL guardar no navegador exclusivamente o idioma da interface. Currículo
importado, texto digitado na etapa 02, sugestões marcadas ou ignoradas, etapa atual e
saídas escolhidas SHALL NOT ser guardados — eles morrem com a aba, como antes. A
preferência guardada SHALL ser local e anônima, SHALL NOT criar conta, sessão ou
identificação de usuário, e SHALL NOT viajar para o servidor.

Preferência ausente, ilegível ou de idioma que não existe SHALL resultar no idioma padrão,
e armazenamento indisponível SHALL NOT impedir o uso do app nem a troca de idioma na
sessão em curso.

#### Scenario: Nada do currículo é guardado no navegador

- **WHEN** o usuário importa um currículo, digita atualizações, aceita sugestões e recarrega
  a página
- **THEN** o app volta ao começo do fluxo, sem currículo, sem o que foi digitado e sem
  sugestões aceitas — só o idioma permanece

#### Scenario: Preferência guardada inválida não derruba a interface

- **WHEN** o que está guardado não corresponde a nenhum idioma oferecido
- **THEN** a interface aparece no idioma padrão

#### Scenario: Armazenamento indisponível não impede o uso

- **WHEN** o navegador não permite guardar a preferência
- **THEN** o app funciona normalmente e a troca de idioma vale enquanto a aba estiver aberta
