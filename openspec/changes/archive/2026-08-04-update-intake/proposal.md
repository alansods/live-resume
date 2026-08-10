## Why

O currículo importado é o passado; a etapa 02 é onde entra o que mudou desde então —
formação nova, promoção, experiência recente, habilidade adquirida. Sem ela o produto só
reorganiza o que já existia, e a promessa de "atualizar o currículo em dez minutos" não se
cumpre.

Ela também é o lugar onde o usuário resolve uma pendência que a importação deixou aberta:
os **períodos incompletos**. Toda data no currículo final precisa de mês e ano, e a
importação, por regra, não arbitra o mês que faltava — ela registra a incompletude e a
empurra para cá.

É a **primeira change de interface** do projeto, então traz também os primeiros primitivos
de UI construídos sobre os tokens do design system.

## What Changes

- Entrega a **tela da etapa 02**, recriada a partir do handoff: três seções empilhadas —
  Formação e certificações, Experiências e promoções, Novas habilidades — cada uma com
  ícone, rótulo, contador de itens e botão de adicionar.
- **Adicionar é sempre por modal**, nunca linha em branco inline: caixa de 420px sobre
  overlay escurecido, com título conforme o tipo, os campos daquele tipo e as ações
  Cancelar e Adicionar. Fecha ao clicar no overlay; clique dentro da caixa não fecha.
- Cada item vira um **card editável** com os campos do seu tipo e a ação Remover. Os
  campos são controlados por estado: remover apaga o item certo e nada digitado se perde.
- **Lista vazia mostra texto explicativo** dizendo que o que veio do arquivo continua no
  currículo — o vazio aqui não significa currículo vazio.
- **Completar períodos incompletos**: os períodos que a importação marcou como incompletos
  aparecem para o usuário informar o mês que faltava. O sistema continua sem arbitrar mês.
- **Datas em mm/aaaa**, com validação na entrada: mês fora de 1–12, ano implausível ou fim
  anterior ao início são recusados com mensagem, não silenciosamente aceitos.
- Traz os **primitivos de UI** sobre os tokens do Nocturne — botão nas três variantes,
  card, campo com rótulo, área de texto, chip e modal — que as próximas telas reutilizam.
- Traz o **i18n da interface** (PT/EN) para os textos desta tela. O conteúdo do currículo
  não é traduzido: isso é da exportação.
- Traz a **estrutura de estado** desta etapa (`eduItems`, `jobItems`, `skillItems`,
  `nextId`, `modal`, `draft`), na forma que o handoff descreve.

**Fora de escopo** (cada um é a sua própria change):
- Top bar, rail de etapas, navegação entre as quatro etapas, home, landing e transições —
  `app-shell-navigation`. Esta change entrega a etapa 02 numa página que a hospeda; o
  encaixe no fluxo vem depois.
- A tela da etapa 01 (dropzone e relatório de importação).
- Qualquer sugestão sobre o que o usuário digitou — `suggestions-*`. Aqui nada é
  analisado: é coleta.
- **Mesclar** o que foi digitado com o currículo importado. Os itens novos ficam nas suas
  listas; a fusão acontece na geração, e a ordem final é da IA em `content-organization`.
- Exportação.

## Capabilities

### New Capabilities
- `update-intake`: coleta das novidades do usuário (formação, experiência, habilidades) por
  modal, edição e remoção em cards controlados, conclusão dos períodos incompletos vindos
  da importação, e os primitivos de UI e o i18n de interface que as telas seguintes
  reutilizam.

### Modified Capabilities

Nenhuma. `resume-model` e `resume-import` são consumidas como estão.

## Impact

- **Código novo**: `components/ui/` (Button, Card, Field, TextArea, Chip, Modal),
  `components/update-intake/`, `lib/i18n/` e uma rota que hospeda a etapa.
- **Dependências**: nenhuma nova. Phosphor Icons entra como pacote de ícones do projeto.
- **Testes**: primeira mudança com testes de componente — Testing Library com
  `@vitest-environment jsdom` por arquivo, já que a suíte roda em `node` por padrão.
- **Contrato para as próximas changes**: `app-shell-navigation` monta a etapa 02 dentro do
  fluxo; a geração recebe as listas de itens novos; `suggestions-*` recebem o currículo com
  os períodos já completos.
- **Referência de design**: `claude-design/README.md` (seção "Etapa 02 — Atualizar" e
  "Design tokens"), `claude-design/styles.css` e `claude-design/CurriculoVivoApp.dc.html`.
  O `.dc.html` é referência de aparência e comportamento — recriar no stack, não copiar o
  HTML. Fidelidade alta: os hex, medidas, raios, sombras e animações do handoff.
- **Divergência deliberada do handoff**: o handoff não previa o preenchimento dos períodos
  incompletos, porque foi escrito antes da regra de que toda data tem mês e ano. A seção
  entra nesta tela seguindo a mesma linguagem visual das outras.
