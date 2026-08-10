## Why

A raiz do site é uma página em branco. `app/page.tsx` devolve `<main />`, e quem abre o
aplicativo vê o fundo escuro do design system e nada mais — foi o que aconteceu na primeira
vez que o app foi aberto de verdade.

O fluxo existe e funciona, mas em `/app`, uma rota que ninguém tem como adivinhar. A home é
o que liga o endereço do site ao produto: ela explica o que o app faz, em quanto tempo, e
tem um botão que leva ao fluxo.

Ela existe desenhada em `claude-design/CurriculoVivoHome.dc.html` desde o começo, e ficou de
fora do escopo de `app-shell-navigation` por decisão registrada — decisão que se mostrou
errada na prática, porque deixou o produto sem porta de entrada.

## What Changes

- **A home em `/`**, recriada a partir do `.dc.html`: top bar com o toggle de idioma,
  manchete, parágrafo de explicação, CTA "Começar agora", coluna de tags
  (`PT-BR ⇄ EN`, `DOCX · PDF`, `ATS-first`) e a nota de download em lote.
- **A seção "O fluxo"**, com os quatro cards — 01 Importa, 02 Atualiza, 03 Revisa,
  04 Exporta — cada um com o resumo do que a etapa faz.
- **O CTA leva a `/app`**, que é onde o fluxo mora.
- **Texto em PT e EN**, como o resto da interface, vindo do dicionário.

**Fora de escopo:**

- **A landing** (`CurriculoVivoLanding.dc.html`). É outra página, com outra manchete —
  "Seu currículo está dois anos atrasado" — e propósito de marketing, não de porta de
  entrada. Cabe numa change própria, e é uma decisão de produto: se ela existir, a pergunta
  passa a ser qual das duas fica em `/`.
- **A transição de fade entre páginas** do protótipo (`opacity → 0` antes de navegar). É
  microinteração e depende de o shell também participar; fica para um acabamento visual.
- **Qualquer mudança no fluxo.** As quatro etapas e as rotas de API não são tocadas.

## Capabilities

### New Capabilities

- `home-page`: a página inicial do produto — o que ele faz, para quem, e o caminho para o
  fluxo.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo**: `components/home/` (a página e o seu CSS).
- **Código tocado**: `app/page.tsx` deixa de ser vazio; `lib/i18n/dictionary.ts` ganha os
  textos da home, em PT e EN.
- **Dependências**: nenhuma nova.
- **Consequência registrada**: a home é a primeira coisa que alguém lê sobre o produto, e o
  texto dela promete o que as onze capabilities entregam — currículo reescrito com métricas,
  datas revisadas, pronto para ATS, em dois idiomas e dois formatos. Se alguma promessa
  mudar, este texto muda junto.
- **Referência de design**: `claude-design/CurriculoVivoHome.dc.html` e
  `claude-design/README.md`, seção "1. Home".
