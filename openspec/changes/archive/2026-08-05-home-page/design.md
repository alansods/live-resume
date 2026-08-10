## Context

Motivação em `proposal.md — Why`; requisitos em `specs/home-page/spec.md`.

É a change mais simples do projeto: uma página estática, sem IA, sem estado além do idioma,
sem chamada de rede. O trabalho é de fidelidade ao `.dc.html` e de texto.

## Goals / Non-Goals

**Goals:**

- Uma raiz que explica o produto e leva ao fluxo.
- Texto que corresponde ao que as onze capabilities entregam de fato.

**Non-Goals:**

- A landing; a transição de fade entre páginas; qualquer mudança no fluxo.

## Decisions

**A home é servidor, sem `"use client"` além do necessário.** Ela não tem estado próprio —
só o toggle de idioma, que já é cliente por causa do `LocaleProvider`. Nada mais na página
precisa de interatividade, e o CTA é um link.

**O CTA é um `<a href="/app">`, não um botão com `router.push`.** É navegação, e navegação é
link: funciona com clique do meio, com "abrir em nova aba" e sem JavaScript. O protótipo usa
`onClick` porque é um HTML solto, não porque seja o certo aqui.

**Os textos dos cards descrevem o que o app faz hoje, não o que o protótipo prometia.** Dois
ajustes em relação ao `.dc.html`:

- o card 03 dizia "Aceita uma a uma ou todas" — o verbo virou **marcar**, porque aceitar
  sugere aplicação imediata, que é justamente o que a revisão não faz;
- o card 01 dizia "O parser separa cabeçalho, experiências, formação e skills" — quem separa
  é a IA, não um parser com heurística, e o texto passa a dizer isso.

Manter a promessa do protótipo seria descrever um produto diferente do que foi construído.

**As classes do design system são reaproveitadas** — `card`, `card-kicker`, `card-title`,
`card-body`, `elev-sm`, `tag`, `tag-accent`, `tag-neutral`, `tag-outline` já existem em
`claude-design/styles.css`. O CSS próprio da home cobre só o que é layout de página.

## Risks / Trade-offs

- **O texto da home promete o que o produto entrega.** Se uma capability mudar de
  comportamento, este texto fica desatualizado e nenhum teste vai apontar. → Registrado na
  proposta; é o custo de ter texto de marketing em qualquer lugar.
- **A landing continua sem lugar.** → Decisão de produto pendente: se ela existir, uma das
  duas deixa de ser a raiz.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
