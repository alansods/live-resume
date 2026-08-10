## Why

A etapa 02 é uma tela que não alimenta nada. `AppShell.tsx:125` renderiza `<UpdateIntake />`
sem props e sem callback de saída: o componente guarda os itens num `useReducer` interno e
ninguém os lê. Tudo que o usuário digita ali — a formação nova, a promoção, a habilidade
adquirida — é descartado. Não entra no currículo, não chega às sugestões, não sai no arquivo
exportado.

Isso quebra a promessa central do produto. Sem a etapa 02 ligada, o app só reorganiza o que
já existia no arquivo importado: ele é um reformatador, não um atualizador de currículo.

Duas ligações que já existem em código também estão soltas pela mesma razão:
`/api/suggestions/metrics` e `/api/suggestions/ats` aceitam `extraUserText` (o material do
usuário contra o qual os números inventados pela IA são conferidos) e o shell nunca envia; e
os períodos incompletos que a importação registra em `report.incompletePeriods` são
descartados junto com o resto do relatório em `ImportStep.tsx:47`, então a seção de completar
o mês nunca aparece, embora `PendingPeriods.tsx` esteja pronta e testada.

## Decisão que precisa da sua aprovação

**Onde o que foi digitado se junta ao currículo?** A proposta arquivada de `update-intake`
deixou a fusão fora de escopo, com esta frase: *"Os itens novos ficam nas suas listas; a
fusão acontece na geração"*. Esta change propõe **mudar essa decisão**: fundir a partir da
etapa 02, produzindo um **currículo em trabalho** (`importado + digitado`) que alimenta a
revisão, as sugestões e a exportação.

Por quê:

- Fundir só na geração significa **revisar um currículo que não é o que vai sair**. As
  sugestões de métrica não veriam a experiência nova (a que mais precisa de métrica, porque
  acabou de ser escrita), a pontuação de ATS seria calculada sobre um documento incompleto e
  a revisão de datas ignoraria os períodos digitados.
- `generateFinal` **não sabe acrescentar itens** — ele aplica patches sobre trechos que já
  existem e reordena. Fundir na geração exigiria uma função nova de qualquer jeito; a
  pergunta é só onde ela roda.
- A regra de produto que restringe o que entra no currículo sem marcação é sobre **conteúdo
  da IA**. O que o usuário digitou é conteúdo do usuário, e o modelo já tem a origem `typed`
  para exatamente isto.

Custo assumido: a etapa 03 passa a exibir o currículo em trabalho, e não literalmente o
arquivo importado. O que continua valendo integralmente é o que a regra protege — nenhum
texto proposto pela IA aparece no papel do currículo, não há diff, não há desfazer. A
divergência entre a spec de `suggestion-review-ui` e este comportamento vai escrita no delta,
não silenciada.

**Se você preferir a decisão original** (fundir só na exportação), diga: a change encolhe
para "o shell coleta e guarda o que foi digitado, envia como `extraUserText` e funde no
`/api/export`", e a etapa 03 continua mostrando só o arquivo importado.

## What Changes

- **`UpdateIntake` ganha um callback de saída.** Uma prop `onChange` emite, a cada alteração,
  o conteúdo das três listas (formação, experiência, habilidades) com os seus ids estáveis. O
  componente continua dono do próprio estado — o shell só espelha.
- **O shell guarda o que foi digitado** em `FlowState` e deriva o **currículo em trabalho**
  com uma função pura nova, `mergeIntake(imported, intake)`: cada item digitado vira item do
  currículo com `origin: typed`, período lido por `parsePeriod`, entregas viram bullets,
  habilidades entram na linha de habilidades.
- **O que não forma item válido não é descartado em silêncio.** Uma experiência sem empresa
  não passa no `ResumeSchema`; o texto dela sai da fusão como **sobra** e é enviado às rotas
  de sugestão em `extraUserText`, que é para o que esse campo existe: número inventado pela
  IA continua conferido contra tudo que o usuário escreveu, tenha ou não virado item.
- **Os períodos incompletos chegam à etapa 02.** `ImportStep` passa a preservar o relatório
  da importação; o shell converte `report.incompletePeriods` em pendências — **uma por lado
  de data sem mês** (início e fim são independentes), cada uma com o texto original do
  arquivo e o ano quando ele é conhecido. Completar um período o marca como `typed` e o
  remove da lista de pendências.
- **`onCompletePeriod` passa a receber mês e ano**, não só o mês: quando a importação não
  reconheceu nem o ano, um mês sozinho não completa a data.
- **Patches órfãos não derrubam a exportação.** Voltar à etapa 02 e remover um item digitado
  pode deixar uma sugestão marcada apontando para um id que não existe mais; hoje isso vira
  `GenerationError` no `/api/export`. O shell passa a enviar só os patches que ainda
  resolvem.

**Fora de escopo:**

- **Sugestões de data e o aviso "as datas foram organizadas".** `lib/suggestions/dates.ts`
  está pronto e ninguém o chama, e `requiresDateNotice` é `false` fixo no shell. É o item 2
  da fila e a sua própria change — esta aqui só garante que o currículo que ela vai analisar
  já contém o que o usuário digitou.
- **Acabamento visual** (ícones, toggle de idioma único, link "Voltar"). Item 3, change
  própria. Nenhum pixel da etapa 02 muda aqui: o que muda é de onde vêm e para onde vão os
  dados dela.
- **Reordenar ou mesclar itens digitados com os importados por semelhança.** Uma promoção
  digitada na mesma empresa vira uma experiência nova, não uma alteração da antiga. A ordem
  final continua sendo decisão da IA em `content-organization`.
- **Persistir o que foi digitado.** Recarregar a página continua zerando o fluxo — não há
  storage, por decisão de produto.
- **Pedir as sugestões ao sair da etapa 02** em vez de ao entrar na 03. É a mitigação de
  latência desenhada para o item 5, e só faz sentido decidir depois de medir com a IA real.
- **Validar a etapa 02 antes de avançar.** Passar por ela sem digitar nada continua legítimo;
  item digitado pela metade continua sendo aceito, e vira sobra em vez de erro de tela.

## Capabilities

### New Capabilities

Nenhuma. Esta change liga capabilities que já existem.

### Modified Capabilities

- `update-intake`: ganha o contrato de saída da etapa (o callback que emite o que foi
  digitado, com ids estáveis) e a fusão do que foi digitado com o currículo importado, que a
  change original deixou explicitamente fora de escopo. As pendências de data passam a ser
  por lado (início/fim) e a conclusão passa a carregar mês e ano.
- `app-shell-navigation`: o shell passa a alimentar a etapa 02 e a consumi-la — deriva o
  currículo em trabalho, envia o material extra às rotas de sugestão, preserva o relatório da
  importação e filtra os patches que já não resolvem.
- `suggestion-review-ui`: o requisito "Currículo exibido como foi importado" passa a nomear o
  **currículo em trabalho** (importado mais o que o usuário digitou). O que ele proíbe
  continua idêntico: nenhum texto proposto pela IA, nenhum trecho riscado, nenhum selo de
  alteração no corpo do currículo, e marcar uma sugestão não altera nada do que está exibido.

## Impact

- **Código novo**: `lib/update-intake/merge.ts` (função pura de fusão e de sobras) e
  `lib/update-intake/pending.ts` (derivação das pendências de data a partir do relatório).
- **Código tocado**: `components/update-intake/UpdateIntake.tsx` (prop `onChange`),
  `components/update-intake/PendingPeriods.tsx` (callback com mês e ano),
  `components/shell/state.ts` (guarda `intake`, `report` e as datas completadas; deriva o
  currículo em trabalho), `components/shell/AppShell.tsx` (liga a etapa 02, envia
  `extraUserText`, filtra patches), `components/shell/ImportStep.tsx` (preserva o relatório).
- **Rotas**: nenhuma muda. `/api/suggestions/*` já aceita `extraUserText`; passa a recebê-lo.
- **Dependências**: nenhuma nova.
- **Consequência registrada**: a partir daqui existem dois currículos no estado — o importado
  e o em trabalho. Só o em trabalho circula pelas etapas 03 e 04; o importado fica como
  origem da fusão, para que reeditar a etapa 02 recomponha o resultado em vez de acumular
  itens.
- **Referência de design**: `claude-design/README.md`, seções "4. Etapa 02 — Atualizar" e
  "5. Etapa 03 — Revisar"; `claude-design/CurriculoVivoApp.dc.html` para a etapa 02 (nenhuma
  medida muda nesta change — a referência serve para confirmar que a seção de pendências
  aparece no lugar desenhado).
