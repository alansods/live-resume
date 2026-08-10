## Context

Ver `proposal.md — Why` para a motivação. O que importa aqui é o estado do código:

- `UpdateIntake` guarda os itens num `useReducer` interno (`components/update-intake/state.ts`)
  e já aceita `pendingPeriods` e `onCompletePeriod` — falta só a saída dos itens.
- O shell mantém as quatro etapas **montadas** e apenas escondidas (`AppShell.tsx:105`), então
  o estado interno da etapa 02 sobrevive à navegação. O shell não precisa devolver estado
  inicial para ela; precisa só espelhar o que ela emite.
- `generateFinal` aplica patch em trecho existente e reordena. **Não sabe acrescentar item.**
- `ResumeSchema` exige `company`, `role`, `course` e `school` com `min(1)`, e ids únicos no
  currículo inteiro. Item digitado pela metade não passa.
- `report.incompletePeriods` já é produzido por `lib/parsing/report.ts` e devolvido pela rota
  `/api/resume-import`; `ImportStep` descarta o corpo inteiro menos `resume`.
- `validateSuggestions` já aceita `extraUserText` e o usa em `userMaterial`, que é o texto
  contra o qual `unsupportedNumbers` confere os números propostos pela IA.

## Goals / Non-Goals

**Goals:**

- Uma função pura, testável sem React, que produz o currículo em trabalho.
- O shell continua sendo o único lugar do app que conhece `fetch` e o único dono do estado do
  fluxo; as etapas continuam recebendo tudo por props.
- Nenhum item digitado pela metade derruba o fluxo, e nenhum texto digitado se perde em
  silêncio.

**Non-Goals:**

- Reconciliar item digitado com item importado (promoção na mesma empresa vira experiência
  nova).
- Editar, na etapa 02, o que veio do arquivo. A etapa 02 acrescenta e completa datas; não
  reescreve o importado.
- Qualquer memória entre recargas de página.

## Decisions

### 1. A fusão é uma função pura em `lib/update-intake/merge.ts`, não em `lib/resume/`

`lib/resume/index.ts` documenta o que está deliberadamente ausente da superfície do modelo, e
`generateFinal` é anunciado como "a única transformação". Acrescentar `mergeIntake` ali
enfraqueceria essa afirmação e faria `resume-model` virar capability modificada por uma change
que é de outra coisa. A fusão é do domínio de `update-intake`: ela existe porque a etapa 02
existe.

Assinatura:

```ts
mergeIntake(imported: Resume, intake: IntakeContent): { resume: Resume; leftovers: string[] }
```

Alternativa descartada: fundir dentro de `/api/export`. Deixaria a revisão analisando um
currículo diferente do que sai — ver `proposal.md — Decisão`.

### 2. O currículo em trabalho é **derivado**, não guardado

`FlowState` guarda `imported` (com as datas completadas aplicadas) e `intake`. O currículo em
trabalho sai de `workingResume(state)` a cada leitura. Guardá-lo como estado exigiria
invalidá-lo a cada tecla digitada na etapa 02 — e é exatamente aí que "editar recompõe sem
acumular" costuma quebrar. Derivar torna o cenário verdadeiro por construção.

Os ids dos itens digitados vêm de `newItemId()` no reducer da etapa 02 e são estáveis, então
refundir não muda path nenhum: uma sugestão ancorada num item digitado continua ancorada
depois de o usuário editar outro campo dele.

### 3. `onChange` emite o conteúdo, o reducer continua na etapa 02

A prop nova é `onChange?: (content: IntakeContent) => void`, chamada num `useEffect` que
observa as três listas do reducer. O rascunho do modal não entra em `IntakeContent`, então
digitar sem confirmar não emite nada.

Alternativa descartada: elevar o reducer para o shell. Seria uma reescrita da etapa 02 (todas
as `dispatch` viram props) para ganhar nada — o estado já sobrevive à navegação porque a etapa
fica montada.

### 4. Entregas viram bullets por linha; habilidades entram na linha de habilidades

`delivered` é um `<textarea>`: cada linha não vazia vira um bullet com id próprio. Habilidade
é uma linha só no modelo (`skills: TextValue | null`), então as digitadas são concatenadas
com `, ` ao texto existente; currículo sem habilidades ganha a linha.

Períodos são lidos por `parsePeriod(raw, typed)` — o mesmo caminho da importação, sem
paralelo. `ongoing` produz `raw` com o marcador de fim em aberto.

### 5. Item inválido vira sobra, não erro de tela

`mergeIntake` monta o item candidato e valida contra o `ResumeSchema` antes de acrescentá-lo.
O que não passa sai em `leftovers` — os textos que o usuário escreveu naquele item — e o shell
os envia em `extraUserText`. É para isso que o campo existe: um número que a IA propõe
continua conferido contra tudo que o usuário escreveu, tenha ou não virado item.

Consequência: com a fusão feita, todo o resto do material digitado já está dentro do currículo
enviado, então `extraUserText` carrega **só** as sobras. Não há duplicação.

### 6. Pendência de data é por **lado**, com id composto

`report.incompletePeriods` traz o path do período. Um período pode ter perdido o mês no início,
no fim, ou nos dois — e a UI de `PendingPeriods` tem um campo por pendência. O shell deriva
uma pendência por lado incompleto, com `id = "<path>#start" | "<path>#end"`, `where` composto
de conteúdo do currículo (empresa · cargo, curso · instituição) mais o rótulo do lado vindo do
i18n (`t.fields.start` / `t.fields.end`), e `year` preenchido quando o arquivo trouxe o ano.

`onCompletePeriod` passa a receber `{ month, year }`: quando o lado está `null` (o arquivo não
trouxe nem o ano), o mês sozinho não completa a data. A conclusão usa `completePeriod` e marca
o período com origem `typed`.

Fim em aberto não é pendência: `{ open: true }` é uma data completa.

### 7. Patches órfãos são filtrados no shell, antes de sair

`generateFinal` recusa o conjunto inteiro quando um patch não resolve — é a política certa
para a geração, e não muda. Quem sabe que um item pode ter desaparecido é o shell, então é
ele quem filtra: só vai para `/api/export` o patch cujo path ainda resolve no currículo em
trabalho. Sugestão órfã some em silêncio; ela já não tem trecho a que se referir.

## Risks / Trade-offs

- **A etapa 03 deixa de exibir literalmente o arquivo importado** → o delta de
  `suggestion-review-ui` renomeia o requisito e diz o que ele passa a garantir. O que a regra
  de produto protege continua intacto: nenhum texto da IA no corpo do currículo, sem diff, sem
  desfazer.
- **Sugestões pedidas uma vez ficam desatualizadas se o usuário voltar e digitar mais** → hoje
  já é assim (`app-shell-navigation`: "reutilizadas nas visitas seguintes"). Esta change não
  piora nem conserta; o item 5 da fila (latência, com IA real) é onde essa política se decide.
- **Concatenar habilidades com vírgula pode duplicar uma habilidade que já estava no arquivo**
  → aceito. Deduplicar exigiria comparar texto livre, e a alternativa (heurística de
  semelhança) é exatamente o tipo de regra que o projeto não quer disputando com a IA.
- **`useEffect` emitindo a cada alteração** → `IntakeContent` é derivado das três listas do
  reducer, que só mudam por ação; o efeito depende delas, não do estado inteiro, então digitar
  no modal não dispara emissão.

## Migration Plan

Não se aplica: sem banco, sem storage, sem API pública. A mudança é interna ao cliente e a
nenhum contrato de rota — `/api/suggestions/*` já aceita `extraUserText`.
