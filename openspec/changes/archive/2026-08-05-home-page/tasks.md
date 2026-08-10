## 1. Textos

- [x] 1.1 Acrescentar os textos da home ao dicionário, em PT e EN: manchete, explicação,
  chamada, tags, nota de download e os quatro cards.
  **Aceite**: cenários "A home muda de idioma" e "Nenhum texto fixo em componente na home".

## 2. Página

- [x] 2.1 Implementar `components/home/Home.tsx` com top bar, manchete, explicação, CTA para
  `/app`, tags e nota, reaproveitando as classes do design system.
  **Aceite**: cenários "A raiz mostra a manchete e a explicação", "A raiz não é uma página em
  branco", "A chamada leva ao fluxo" e "A chamada é identificável". Critério visual: top bar
  46px, coluna `max-width 1120px`, H1 52px, CTA `padding 11px 22px`, conforme o `.dc.html`.
- [x] 2.2 Implementar a seção "O fluxo" com os quatro cards.
  **Aceite**: cenários "Os quatro cards aparecem numerados" e "Os cards descrevem o que cada
  etapa faz". Critério visual: grid de 4 colunas, `gap 16px`, cards com `elev-sm`.

## 3. Fechamento

- [x] 3.1 Substituir o `app/page.tsx` vazio pela home.
  **Aceite**: a raiz deixa de ser `<main />`; `npm run build` lista `/` como estática.
- [x] 3.2 Conferir no navegador contra o `.dc.html` e verificar qualidade.
  **Aceite**: a página é aberta em execução e comparada ao protótipo;
  `lib/spec-coverage.test.ts` reconhece os cenários; `npm test`, `npm run build`,
  `npm run lint` e `npx tsc --noEmit` passam.
