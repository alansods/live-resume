## Why

`lib/suggestions/dates.ts` está implementado, testado e **ninguém o chama**. É a capability
`suggestions-dates` inteira — sobreposição de períodos, organização de datas sem mês,
distinção entre mês derivado e mês inferido — parada no repositório.

A consequência na tela é dupla. O usuário nunca vê que duas experiências dele se sobrepõem
em dez meses, nem que `2018 - 2019` vai sair ambíguo para um ATS. E o shell passa
`requiresDateNotice: false` fixo (`AppShell.tsx:136`), então o aviso "as datas foram
organizadas" — que é regra de produto, não enfeite: *"QUANDO O APP ORGANIZA DATAS, ELE
AVISA"* — nunca aparece, mesmo quando o app organiza datas.

A tela da etapa 03 já sabe exibir as duas coisas: o filtro `dates` existe e o box do aviso
existe (`SuggestionReview.tsx:75`). Falta só ligar.

## What Changes

- **O shell calcula as sugestões de data ao entrar na etapa 03**, sobre o currículo em
  trabalho, e as soma às que vêm das rotas de IA. Vira o terceiro conjunto de sugestões da
  revisão, ao lado de métrica e ATS.
- **O cálculo é local e síncrono.** `suggestDates` é determinístico e não chama a IA — roda
  no cliente, sem rota nova e sem espera. Não há chave, não há latência, não há o que
  falhar.
- **O aviso de datas organizadas passa a ser real**: `requiresDateNotice` deixa de ser `false`
  fixo e passa a vir do `requiresDisclosure` que `suggestDates` devolve — verdadeiro apenas
  quando o app **inferiu** algum mês, falso quando todos foram derivados do material do
  usuário. É a diferença que a capability já sabe fazer e que o aviso genérico apagaria.
- **Sugestão de data sobrevive à falha da IA.** Como o cálculo é local, um Gemini fora do ar
  deixa a revisão com as sugestões de data em vez de vazia. Hoje uma rota que falha custa o
  conjunto inteiro.
- **O que o usuário já completou não é sugerido de novo.** O currículo em trabalho já traz os
  períodos completados na etapa 02, e `suggestDates` ignora período completo — o requisito "O
  que o usuário informou tem precedência" passa a valer de ponta a ponta, e não só na função.

**Fora de escopo:**

- **Mudar `lib/suggestions/dates.ts`.** A capability está pronta e testada; esta change a
  consome como está. Se aparecer defeito na regra de derivação, é change dela.
- **Acabamento visual da etapa 03** — o box do aviso e o filtro `dates` já existem e seguem o
  handoff. Ícones, toggle único e link "Voltar" são o item 3, e são a próxima change.
- **Recalcular as sugestões de data quando o usuário volta e edita a etapa 02.** Elas são
  pedidas uma vez ao entrar na revisão, como as demais — é a política que
  `app-shell-navigation` já fixou ("Voltar e avançar não repete o pedido"). Mudar isso é
  decisão de latência, e ela pertence ao item 5.
- **Sugestão de data sobre item digitado na etapa 02.** Acontece naturalmente (o cálculo é
  sobre o currículo em trabalho), mas nenhum requisito novo é criado para isso: a etapa 02 já
  recusa data inválida, então um item digitado raramente chega incompleto.
- **Pedir as sugestões ao sair da etapa 02.** Item 5.

## Capabilities

### New Capabilities

Nenhuma. Esta change liga uma capability existente ao fluxo.

### Modified Capabilities

- `app-shell-navigation`: o shell passa a produzir as sugestões de data localmente ao entrar
  na revisão, somá-las às da IA e propagar o aviso de datas organizadas. O requisito
  "Sugestões pedidas uma vez ao entrar na revisão" passa a cobrir os três conjuntos e a dizer
  o que acontece quando as rotas de IA falham.

## Impact

- **Código novo**: nenhum módulo novo.
- **Código tocado**: `components/shell/AppShell.tsx` (chama `suggestDates`, soma os conjuntos,
  propaga o aviso). `components/shell/state.ts` só se o merge dos conjuntos merecer função
  própria.
- **Rotas**: nenhuma. Não há rota de sugestão de data, e não deve haver: o cálculo não usa
  IA, então mandá-lo ao servidor seria uma ida de rede para fazer aritmética de calendário.
- **Dependências**: nenhuma nova.
- **Consequência registrada**: a etapa 03 passa a ter sugestões mesmo sem `GEMINI_API_KEY`. É
  bom para o usuário e é bom para o item 5 — dá para exercitar a revisão sem gastar chamada.
- **Referência de design**: `claude-design/README.md`, seção "5. Etapa 03 — Revisar" (box de
  aviso e filtro por tipo); `claude-design/CurriculoVivoApp.dc.html`. **Divergência
  registrada**: esse `.dc.html` mostra "Aplicar"/"Desfazer" nos cartões, que não existem — a
  revisão é checklist e não tem desfazer (`openspec/config.yaml`). Nada nesta change os
  introduz.
