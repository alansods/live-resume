## Why

Um currículo pode estar impecável para um leitor humano e ainda assim ser descartado antes
de chegar a ele. O filtro que roda primeiro é o parser: ele indexa texto, e o que não vira
texto some. Barra de proficiência vira nada. Ícone no lugar do rótulo "E-mail" vira nada.
Um resumo feito de adjetivos de personalidade — "proativa, dinâmica, apaixonada por
desafios" — é indexado inteiro e não carrega nenhum termo pelo qual alguém procura.

As changes de sugestão entregues até aqui cuidam do **conteúdo** de cada bullet: métrica
(`suggestions-metrics`) e data (`suggestions-dates`). Falta a camada que olha o currículo
como documento a ser lido por máquina — o resumo e as habilidades, que são justamente os
dois trechos que nenhuma das outras duas endereça.

Vale separar o que esta change faz do que a geração já garante. `generateFinal` sempre
reemite o currículo no modelo padrão: coluna única, sem tabela, sem caixa de texto, datas
`mm/aaaa`, PDF selecionável. **Isso é forma, e é automático.** O que nenhuma reformatação
resolve é o texto em si: reescrever o resumo para carregar stack, escala e resultado, ou
converter uma lista de habilidades com símbolos de nível em texto indexável, é decisão de
conteúdo — e conteúdo passa pelo checklist do usuário.

## What Changes

- **Sugestão de resumo sem palavra-chave.** Resumo construído sobre adjetivos de
  personalidade em vez de área, ferramenta, escala e resultado recebe proposta de
  reescrita, ancorada em `summary`.
- **Sugestão de habilidades não indexáveis.** Habilidades escritas com marcação que o
  parser descarta — barras, estrelas, `★★★☆☆`, "nível avançado (80%)", rótulos de
  proficiência — recebem proposta de conversão para lista corrida separada por vírgula,
  ancorada em `skills`. A competência é preservada; o que sai é o indicador de nível.
- **Quem detecta é a IA.** Como em `suggestions-metrics`, não existe dicionário de
  adjetivos proibidos nem regex de estrela: a variedade de currículo real vence qualquer
  lista. A IA lê `summary` e `skills` e devolve no máximo uma sugestão para cada; o código
  valida a forma, ancora ao trecho e sinaliza os números não apoiados — a mesma trava de
  `unsupportedNumbers` que já existe, porque uma reescrita de resumo pode propor "8 anos de
  experiência" ou "R$ 1,2M/ano" que o material do usuário não sustenta.
- **Reutiliza o modelo de sugestão** de `suggestions-metrics` com o tipo `ats`, sem
  estrutura nova. Duas ações novas entram em `suggestionActions`: `rewrite` e `toText`.
- **Pontuação de ATS.** Função pura que projeta a nota `0–100` sobre o **conjunto marcado**
  pelo usuário — não sobre o currículo importado nem sobre o conjunto total de sugestões.
  Sem sugestão marcada, a nota é a do currículo como está; cada marcação sobe a nota pelo
  peso do problema que ela resolve. A regra é fixa e explicável, sem IA.
- **Sem sugestão, sem chamada.** Currículo sem `summary` e sem `skills` (ambos são
  anuláveis no modelo) devolve lista vazia sem tocar no Gemini.

**Fora de escopo:**

- **Reformatação estrutural** — coluna única, ausência de tabela e caixa de texto, fonte
  única, PDF selecionável, nome de arquivo padronizado. Já é invariante de `generateFinal`
  (`resume-model`) e vale para todo currículo, marcado ou não. Esta change não produz
  sugestão para nada que a geração conserta sozinha: seria pedir ao usuário que autorizasse
  algo que vai acontecer de qualquer jeito.
- **Sugestões de métrica, verbo e data** — as duas changes de sugestão já arquivadas. Um
  bullet não recebe sugestão `ats`.
- **Renderizar** os cartões, o filtro por tipo e a barra de 10 segmentos da pontuação —
  `suggestion-review-ui`. Esta change entrega os dados; a tela os exibe.
- **Palavra-chave de vaga específica.** Não existe campo de descrição da vaga no fluxo, e
  inventar um aqui abriria escopo de produto que ninguém pediu. A sugestão de resumo
  trabalha com o material que o usuário já forneceu.
- **Bloquear a exportação por nota baixa.** A pontuação informa; não existe mínimo, e ela
  nunca impede o download.
- **Detecção de layout multicoluna**, já entregue na importação (`resume-import`) e
  resolvida pela IA na geração.

## Capabilities

### New Capabilities

- `suggestions-ats`: sugestões de legibilidade por sistema de recrutamento — reescrita de
  resumo sem palavra-chave e conversão de habilidades não indexáveis para texto corrido —
  ancoradas em `summary` e `skills`, mais a pontuação de ATS projetada sobre o conjunto de
  sugestões marcadas.

### Modified Capabilities

- `suggestions-metrics`: acrescenta `rewrite` e `toText` ao conjunto de ações da sugestão.
  O modelo de sugestão é compartilhado pelas três changes e mora nessa capability; nenhum
  campo muda de forma, e nenhuma sugestão existente é afetada.

## Impact

- **Código novo**: `lib/ai/suggest-ats.ts` (a chamada e o prompt), `lib/suggestions/ats.ts`
  (pontuação, pura) e o route handler `app/api/suggestions/ats`, no mesmo formato de
  `app/api/suggestions/metrics`.
- **Código tocado**: `lib/suggestions/model.ts`, só para acrescentar as duas ações ao enum.
- **Dependências**: nenhuma nova. Reutiliza o cliente Gemini de `resume-import`,
  `validateSuggestions` de `suggestions-metrics` e os construtores de path de
  `resume-model`.
- **Custo**: uma chamada ao Gemini por revisão, sobre dois trechos apenas — bem menor que a
  de métricas, que envia todos os bullets.
- **Contrato para as próximas changes**: `suggestion-review-ui` recebe as sugestões `ats`
  como as demais e a função de pontuação, que ela chama sobre o conjunto marcado a cada
  mudança de checkbox.
- **Divergência deliberada do protótipo**: o `.dc.html` calcula a nota como
  `52 + aplicadas * 7`, com a base fixa em 52. Aqui a base sai do currículo, não de uma
  constante — um currículo que já tem resumo com palavra-chave não começa na mesma nota de
  um que não tem.
- **Consequência de produto registrada**: a reescrita do resumo é o texto mais autoral do
  currículo, e uma proposta de IA nele é mais intrusiva do que numa lista de habilidades.
  Continua valendo a regra geral — nada entra sem a marcação —, e a sinalização de números
  não apoiados é o que impede uma reescrita fluente de embutir um fato que o usuário nunca
  afirmou.
- **Referência de design**: `claude-design/README.md`, seção "5. Etapa 03 — Revisar"
  (cartões com tag de tipo ATS, filtro por tipo, score de 10 segmentos), e o array
  `SUGGESTIONS` de `claude-design/CurriculoVivoApp.dc.html` (itens `a1` e `a2`). Sem UI
  nesta change.
