## Context

Ver `proposal.md — Why`. O estado do código que importa:

- `suggestDates(resume)` devolve `{ suggestions, inferred, requiresDisclosure }`, é puro,
  determinístico e **não chama a IA**. Já tem teste próprio.
- `SuggestionReview` aceita `requiresDateNotice` e desenha o box; o filtro `dates` já existe.
- O shell pede as sugestões de IA num `Promise.all` dentro de `irPara`, e hoje ignora
  `resposta.ok === false` sem avisar ninguém (`AppShell.tsx:81`).
- Depois da change `intake-into-flow`, o currículo que a revisão analisa é o **em trabalho**,
  então os períodos que o usuário completou na etapa 02 já chegam completos aqui.

## Goals / Non-Goals

**Goals:**

- Ligar `suggestDates` sem rota nova e sem espera perceptível.
- O aviso da revisão refletir exatamente a distinção derivado/inferido que a capability de
  datas já produz.

**Non-Goals:**

- Recalcular sugestões quando a etapa 02 muda depois da primeira visita à revisão.
- Informar ao usuário que uma rota de IA falhou. É lacuna real, é anterior a esta change, e
  cabe numa change de tratamento de erro — registrada em Risks.

## Decisions

### 1. As sugestões de data são calculadas no cliente, não numa rota

`suggestDates` é aritmética de calendário. Mandá-la ao servidor seria uma ida de rede para
não fazer nada que o servidor precise fazer: não há chave, não há segredo, não há SDK. Rodar
no cliente também é o que dá a propriedade de resistir à falha da IA — o cálculo não passa
pelo mesmo caminho que pode cair.

Alternativa descartada: `/api/suggestions/dates`, por simetria com as outras duas. Simetria
não é razão suficiente para uma requisição.

### 2. O cálculo acontece uma vez, junto do pedido das outras

Vai no mesmo `irPara(3)` que já pede métrica e ATS, e o resultado entra no mesmo
`state.suggestions`. O motivo é o id: cada sugestão nasce com id novo, e a etapa 03 guarda as
marcações **por id**. Recalcular a cada render trocaria os ids e apagaria o que o usuário
marcou.

Ordem no conjunto: datas primeiro, depois o que a IA devolver. A revisão numera os marcadores
na ordem do conjunto, e as sugestões de data são as únicas garantidas — abrir por elas evita
que a numeração dance conforme a IA responde.

### 3. `requiresDateNotice` vem de `requiresDisclosure`, sem tradução

`suggestDates` já separa mês **derivado** (calculado de uma data do usuário) de mês
**inferido** (escolhido pelo app), e só o segundo levanta `requiresDisclosure`. O shell
repassa o booleano como está. Reinterpretá-lo aqui — por exemplo, ligar o aviso sempre que
houver sugestão de data — desfaria a distinção que a capability inteira existe para manter, e
contraria `openspec/config.yaml`: o aviso tem de ser específico, não genérico.

### 4. Falha de rota não derruba o conjunto

O laço que lê as respostas já ignora `!resposta.ok`. Com as datas calculadas localmente e
somadas antes, o pior caso deixa de ser "revisão vazia" e passa a ser "revisão só com
datas". Nenhuma mudança de política é necessária — só a ordem em que os conjuntos são unidos.

## Risks / Trade-offs

- **Falha silenciosa da IA continua silenciosa** → esta change a torna menos visível ainda:
  antes a tela vazia era um sintoma, agora a tela tem conteúdo. Registrado como dívida; o
  lugar de resolver é uma change de erro na revisão, não aqui, e o item 5 (rodar com IA real)
  é quando isso vai doer o suficiente para ser priorizado.
- **Sugestão de data sobre item digitado na etapa 02** → possível, porque o cálculo é sobre o
  currículo em trabalho. Inofensivo: a etapa 02 valida `mm/aaaa` na entrada, então esses
  períodos chegam completos e `suggestDates` os ignora.
- **A numeração dos marcadores muda se a IA responder diferente** → já era assim; fixar as
  datas no começo do conjunto reduz o problema em vez de aumentá-lo.
