## 1. Movimento desligável

- [x] 1.1 Acrescentar a consulta `prefers-reduced-motion: reduce` a `Home.module.css`,
  `Shell.module.css` e `Review.module.css`, anulando `pageIn` e `stepIn` — como
  `UpdateIntake.module.css` e `primitives.module.css` já fazem.
  **Aceite**: cenários "Menos movimento, sem transição na home", "Menos movimento, sem
  transição de etapa" e "A revisão também obedece", verificados no CSS gerado. Nenhuma
  duração ou curva muda para quem não pede menos movimento.

## 2. Navegação sem interceptação

- [x] 2.1 Cobrir por teste o que hoje é só um comentário em `Home.tsx`: a chamada é um link
  com endereço próprio e ninguém intercepta o clique.
  **Aceite**: cenários "A chamada é um link navegável" e "Nada atrasa a navegação", em
  `components/home/Home.test.tsx`.

## 3. A decisão sobre a landing

- [x] 3.1 Registrar em `openspec/config.yaml` que a landing está fora do escopo, com o motivo
  — ela promete desfazer, par bilíngue sincronizado e assinatura, que contrariam invariantes.
  **Aceite**: o arquivo diz o que o produto não é, e a próxima sessão não reabre a pergunta.

## 4. Fechamento

- [x] 4.1 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive entry-motion
  --yes`.
