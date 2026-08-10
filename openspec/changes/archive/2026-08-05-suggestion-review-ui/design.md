## Context

Motivação em `proposal.md — Why`; requisitos em `specs/suggestion-review-ui/spec.md`.

Esta é a tela onde o usuário assume o que a IA escreveu. O desenho inteiro sai de uma frase
do produto — *sugestão é checklist, não edição* — e a maior parte do trabalho é resistir à
tentação de mostrar o resultado antes da hora.

O handoff não ajuda aqui: o `.dc.html` é anterior às regras e implementa aplicar/desfazer com
o trecho mudando no papel. As divergências estão listadas na proposta e aprovadas.

## Goals / Non-Goals

**Goals:**

- Um currículo que não muda enquanto se decide sobre ele.
- Marcador e cartão ligados nos dois sentidos, por id estável.
- Lógica de seleção em função pura, testável sem montar a tela.

**Non-Goals:**

- Produzir sugestões; top bar, rail e navegação; a etapa 04.
- Editar, desfazer, comparar antes/depois, reordenar. Nenhum existe no produto.

## Decisions

**O estado da revisão é `selected` + `dismissed`, não `applied`.** É a diferença entre um
checklist e um editor. `selected` é o que vai para `exportResume` como `patches`; `dismissed`
some da tela. Nenhum dos dois toca o currículo — o componente do papel recebe o currículo
importado e nada mais, e é por isso que ele não tem como exibir texto proposto por engano.

**A numeração é de exibição, o vínculo é por id.** O número na bolinha é a posição na lista
visível; a ligação entre marcador e cartão é `suggestion.id`. Se fosse por número, filtrar
renumeraria e o marcador apontaria para outro cartão. Alternativa: numerar por path.
Rejeitada — o mesmo path pode ter sugestão em momentos diferentes, e o id já é estável.

**O filtro não renumera.** Os números vêm da lista completa não ignorada, para que filtrar
não faça a sugestão 3 virar 1 na tela e no papel ao mesmo tempo. É o tipo de detalhe que só
aparece usando, e que destrói a confiança na ancoragem.

**O lado do tooltip é medido, não adivinhado.** `getBoundingClientRect()` no marcador, e
ancoragem à direita quando faltam ~300px até a borda. É o que o handoff especifica, e a
alternativa (sempre à esquerda) corta o tooltip no marcador do fim da linha.

**A lógica mora em `state.ts`, pura, como na etapa 02.** Marcar, desmarcar, ignorar, filtrar,
contar pendências e projetar a pontuação são funções sobre um estado simples. O componente só
liga eventos. É o que permite testar "ignorar uma marcada tira do conjunto" sem renderizar
nada — e é a regra do projeto: lógica em função pura, nunca em componente.

**`atsScore` é chamado a cada render, sem memoização.** É uma soma sobre um array de poucas
dezenas de itens; memoizar aqui seria complexidade sem ganho mensurável.

**A tela recebe tudo por props: currículo, sugestões e resultado de datas.** Ela não busca
nada. Quem orquestra as chamadas é a página, e depois o shell — o mesmo desenho de
`update-intake`, que permitiu encaixá-la sem tocar no componente.

**Riscar o texto atual acontece só dentro do cartão.** A regra proíbe trecho riscado *no
papel do currículo*; no cartão, ver atual e proposto lado a lado é o que torna a decisão
possível. Sem isso o usuário marcaria no escuro.

## Risks / Trade-offs

- **Divergência grande em relação ao `.dc.html`**, que mostra aplicar/desfazer e o selo
  "atualizado". Quem comparar tela e protótipo vai estranhar. → As regras de produto vencem o
  protótipo, e a divergência está registrada na proposta e aqui.
- **Ignorar e desmarcar são parecidos e podem confundir.** → Rótulos distintos e efeitos
  visíveis distintos: desmarcar deixa o cartão, ignorar o remove. Não há desfazer para o
  ignorar — se virar problema real de uso, é uma change própria, não um remendo aqui.
- **A pontuação pode dar a impressão de meta a bater**, incentivando marcar tudo sem ler. →
  Ela vem sempre ao lado da contagem de pendências, e o texto do cartão é o que ocupa a tela.
  O produto assume esse risco: sem nota, o usuário não tem noção de progresso.
- **Tooltip em hover não serve a toque.** → Acionar o marcador leva ao cartão, que tem toda a
  informação. O hover é atalho, não único caminho.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
