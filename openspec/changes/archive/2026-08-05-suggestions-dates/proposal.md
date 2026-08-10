## Why

Datas erradas custam caro num currículo: o parser do ATS calcula tempo de experiência a
partir delas, e dois períodos sobrepostos fazem o candidato parecer ter tido dois empregos
simultâneos que ele não teve. Datas pela metade — só o ano — fazem o mesmo parser calcular
tempo errado. É o tipo de defeito que ninguém revisa porque ninguém olha as próprias datas
duas vezes.

## What Changes

- **Detecta períodos sobrepostos** entre experiências e produz uma sugestão por par,
  informando em quantos meses eles se sobrepõem.
- **Organiza as datas em conflito ou incompletas**, propondo período completo em `mm/aaaa`:
  - **derivado**, quando dá — se a experiência seguinte começa em `03/2022`, a saída da
    anterior é `02/2022`, e o mês veio do que o usuário escreveu;
  - **inferido**, quando não dá — um mês plausível para um período que trazia só o ano.
- **Distingue derivado de inferido em cada sugestão.** O que não pôde ser derivado do
  material do usuário vem marcado, para o aviso ser específico.
- **Exige o aviso na revisão**: um box dizendo que as datas foram organizadas para o formato
  que os sistemas de recrutamento leem, que não precisam ser exatamente as reais, e que cabe
  ao usuário conferir. Ele só aparece quando houve alguma data inferida.
- Reutiliza o **modelo de sugestão** de `suggestions-metrics`, com o tipo `dates` e as ações
  `fixDate` e `normalize`.
- **Sem chamada de IA.** Sobreposição é aritmética de calendário, derivação é subtração de um
  mês, e a inferência é uma regra simples e explicável. Nada aqui pede julgamento de modelo.

**Fora de escopo:**
- Sugestões de métrica e de ATS — as outras duas changes de sugestão.
- Renderizar o box de aviso e os cartões — `suggestion-review-ui`. Esta change entrega o
  conteúdo do aviso e a informação de quando exibi-lo.
- Normalizar o formato de exibição para `mm/aaaa`: já é garantido por `resume-model`.
- O preenchimento manual do mês na etapa 02, já entregue em `update-intake`. Ele continua
  valendo, e o que o usuário informar tem precedência sobre o que o app organizaria.

## Capabilities

### New Capabilities
- `suggestions-dates`: detecção determinística de períodos sobrepostos e incompletos,
  proposta de datas organizadas em `mm/aaaa` distinguindo o que foi derivado do que foi
  inferido, e o aviso que a revisão exibe quando houve inferência.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo**: `lib/suggestions/dates.ts`. Sem route handler próprio — a detecção é local
  e barata, e roda junto com o resto da revisão.
- **Dependências**: nenhuma. Reutiliza `periodsOverlap`, `parsePeriod` e `formatPeriod` de
  `resume-model`.
- **Custo**: zero de IA. É a única das três changes de sugestão que não chama o Gemini.
- **Contrato para as próximas changes**: `suggestion-review-ui` recebe as sugestões de data
  como as demais, mais o indicador de que deve exibir o box de aviso.
- **Divergência deliberada do handoff**: o protótipo tem uma sugestão "Formato de data fora
  do padrão" com ação "Normalizar". Ela sai: o modelo canônico já guarda datas estruturadas e
  o exportador sempre emite `mm/aaaa`, então não existe formato fora do padrão para corrigir.
  O que sobrou do caso — período sem mês — é tratado como organização de data, com aviso.
- **Consequência de produto registrada**: uma data inferida é uma afirmação factual que o
  usuário assina ao exportar. O aviso existe para que ele saiba disso; a decisão é dele.
- **Referência de design**: `claude-design/README.md` (seção "Etapa 03 — Revisar") e o array
  `SUGGESTIONS` de `claude-design/CurriculoVivoApp.dc.html`. Sem UI nesta change.
