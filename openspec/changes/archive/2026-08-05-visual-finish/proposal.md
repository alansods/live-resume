## Why

O produto funciona e não se parece com o que foi desenhado. Três divergências, conferidas
por screenshot contra `claude-design/CurriculoVivoApp.dc.html` e
`claude-design/CurriculoVivoHome.dc.html`:

1. **Nenhum ícone nas telas novas.** `@phosphor-icons/react` já é dependência e é usada só na
   etapa 02. O protótipo tem ícone no CTA da home, na dropzone, na confirmação da importação,
   nos botões de navegação e na etapa 04 inteira.
2. **A top bar existe duas vezes, com aparências diferentes.** `Home.tsx` e `AppShell.tsx`
   têm cada um a sua, e os toggles de idioma divergem: o da home é a pílula do handoff
   (fundo de superfície, sem borda); o do shell tem borda de 1px em cada botão. O handoff diz
   que a top bar do app é "idêntica à home".
3. **Falta o link "Voltar" na top bar do app** — 13px, `ph-arrow-left`, com um divisor
   vertical antes dele. É o único caminho de volta à home depois que o usuário entra no
   fluxo; hoje só o botão do navegador serve.

## What Changes

- **Um componente de top bar só**, usado pela home e pelo shell: marca à esquerda, toggle de
  idioma à direita, e um link de volta opcional. O toggle passa a ser o da home nas duas
  telas — é o que o handoff descreve.
- **O link "Voltar" na top bar do app**, levando à home, com `ph-arrow-left` e o divisor
  vertical. Ele é **outro** "Voltar" que o da navegação de etapa: mesma palavra, destinos
  diferentes. O texto visível segue o protótipo; a distinção fica no rótulo acessível, para
  quem navega por leitor de tela não ter dois "Voltar" idênticos.
- **Os ícones que faltam**, todos do inventário do protótipo:
  - home: `ph-arrow-right` no CTA;
  - etapa 01: `ph-file-arrow-up` (34px, accent) na dropzone e `ph-check-circle` na linha de
    confirmação;
  - navegação de etapa: `ph-arrow-left` em Voltar, `ph-arrow-right` em Avançar;
  - etapa 04: `ph-translate` e `ph-files` nas legendas de idiomas e formatos, e
    `ph-download-simple` no botão de download.
- **Os ícones são decorativos**, marcados como tal para leitor de tela: o rótulo de cada
  controle continua sendo o texto, que vem do i18n. Ícone não vira o rótulo de nada — é
  regra do modelo padrão, e vale também para a interface.

**Fora de escopo:**

- **Ícones no rail de etapas.** O handoff descreve os botões do rail como "o número seguido
  do rótulo", e o `.dc.html` não tem nenhum ícone ali. Não invento um conjunto que o
  protótipo não definiu — se você quiser, é decisão de design e vira change própria.
- **A transição de fade entre home e app.** É o item 4 e depende de decisão sua.
- **A landing.** Item 4, decisão sua.
- **O fundo deslizante do toggle** (`transform: translateX`), que o handoff descreve em
  "Interações e comportamento". A pílula estática já é a forma certa; a animação é
  microinteração e entra junto com a transição de página, na mesma change.
- **Qualquer mudança de comportamento.** Nenhuma rota, nenhum estado, nenhuma regra de
  produto muda. Se um teste de comportamento quebrar, é sinal de que a change passou do seu
  escopo.
- **A etapa 03.** Os cartões e o papel do currículo já seguem o handoff, com a divergência de
  "Aplicar/Desfazer" que o `config.yaml` resolve contra o protótipo.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `app-shell-navigation`: a top bar ganha o caminho de volta à home, e o requisito de
  interface bilíngue passa a cobrir o rótulo acessível desse link. Ganha também um requisito
  de fidelidade ao design — que a capability não tinha, e é o que impede a divergência de
  voltar.
- `home-page`: a top bar da home passa a ser a mesma do app. O comportamento não muda; o
  requisito registra que as duas telas compartilham a mesma barra, que é o que o handoff pede.

## Impact

- **Código novo**: `components/ui/TopBar.tsx` e o seu CSS.
- **Código tocado**: `components/home/Home.tsx` e `Home.module.css` (usam a top bar comum, e
  o CTA ganha ícone); `components/shell/AppShell.tsx` e `Shell.module.css` (top bar comum,
  link de volta, ícones da navegação); `components/shell/ImportStep.tsx` e
  `components/shell/ExportStep.tsx` (ícones); `lib/i18n/dictionary.ts` (o rótulo do link de
  volta, em PT e EN).
- **Dependências**: nenhuma nova — `@phosphor-icons/react` já está no projeto.
- **Risco registrado**: a top bar da home é renderizada dentro de um Server Component
  (`app/page.tsx`) e a do shell dentro de um Client Component. O componente comum é cliente
  (o toggle tem estado), o que já é verdade nas duas hoje.
- **Referência de design**: `claude-design/README.md`, seções "1. Home", "2. Aplicação —
  shell", "3. Etapa 01 — Importar" e "6. Etapa 04 — Exportar";
  `claude-design/CurriculoVivoHome.dc.html` e `claude-design/CurriculoVivoApp.dc.html` para o
  inventário de ícones e as medidas do link de volta.
