## Why

O fluxo tem duas paradas longas e uma muito longa, medidas com um currículo real de quatro
páginas:

| etapa | espera |
|---|---|
| 01 importar | 22 a 49s |
| 03 sugestões | ~47s |
| 04 exportar | ~103s |

Dois minutos e meio no total. Na tela, o que o usuário vê é uma linha de texto — *"Lendo o
currículo…"*, *"Gerando os arquivos…"* — sem dizer quanto tempo aquilo costuma levar nem o
que acontece se ele mexer na página.

A decisão de produto é **não reduzir a espera**: a aplicação é gratuita, e esperar é aceitável
desde que a pessoa saiba que precisa esperar. O que não é aceitável é ela não saber.

Há um risco concreto que ninguém avisa hoje: **recarregar a página perde tudo**. Não existe
storage, por decisão de produto — o arquivo é descartado. Quem se cansa de esperar e aperta
F5 recomeça do zero, e nada na tela diz isso.

E há uma falha que o app esconde: quando uma rota de sugestão falha, a etapa 03 abre com
menos sugestões e **não avisa**. Foi dívida que eu mesma registrei ao ligar as sugestões de
data, e ficou pior desde então — antes a tela vazia era o sintoma; agora a tela tem conteúdo e
parece completa.

## What Changes

- **Um box de espera nas três etapas longas**, em vez de uma linha de texto. Ele diz três
  coisas: o que está acontecendo agora, quanto tempo aquilo costuma levar, e que recarregar a
  página faz recomeçar do zero.
- **A espera é anunciada, não estimada com precisão falsa.** "Costuma levar cerca de um
  minuto" é honesto; uma barra de progresso que não sabe o próprio progresso é mentira, e uma
  contagem regressiva erraria — a variação medida foi de 22 a 49 segundos na mesma etapa.
- **Nada é acionável duas vezes durante a espera.** Enviar outro arquivo, avançar de etapa e
  baixar ficam bloqueados enquanto a etapa trabalha. Em parte já é assim; o que falta é o
  bloqueio de navegação enquanto as sugestões carregam.
- **A revisão avisa quando parte das sugestões não veio.** Se uma das rotas de IA falhar, a
  etapa 03 diz que faltou uma parte e que dá para tentar de novo entrando na etapa outra vez —
  em vez de apresentar um conjunto incompleto como se fosse completo.

**Fora de escopo:**

- **Reduzir a espera.** É a decisão de produto desta change: a espera fica, e passa a ser
  anunciada. Streaming, cache da exportação e pedir sugestões mais cedo continuam possíveis e
  não estão aqui.
- **Barra de progresso.** Nenhuma das três chamadas informa progresso; desenhar uma barra que
  anda sozinha é enfeite que mente.
- **Persistir o fluxo para sobreviver a um reload.** Contraria a decisão de produto de não ter
  storage e de descartar o arquivo. O aviso existe justamente porque essa decisão fica.
- **Repetir automaticamente as sugestões que falharam.** A estruturação repete porque é ponto
  único de falha; sugestão que falta não impede exportar. Repetir aqui dobraria a espera da
  etapa mais longa para recuperar o que é opcional.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `app-shell-navigation`: as etapas longas passam a anunciar a espera e a bloquear ação
  durante ela, e a revisão passa a informar quando parte das sugestões não veio. O requisito
  "Sugestões pedidas uma vez ao entrar na revisão" ganha o que acontece quando a chamada
  falha.

## Impact

- **Código novo**: um box de espera em `components/ui`, reaproveitado pelas três etapas.
- **Código tocado**: `components/shell/AppShell.tsx` (bloqueio de navegação e aviso de falha),
  `ImportStep.tsx` e `ExportStep.tsx` (o box), `components/shell/state.ts` (registrar que uma
  rota falhou), `lib/i18n/dictionary.ts` (os textos, em PT e EN).
- **Dependências**: nenhuma.
- **Consequência registrada**: a aplicação assume a espera como característica, não como
  defeito. Se um dia ela incomodar o bastante para valer streaming ou cache, o box continua
  certo — ele descreve o que está acontecendo, não quanto falta.
- **Referência de design**: `claude-design/README.md` — o box usa o cartão e os tokens que a
  etapa 02 já usa na nota final (`#2b2741`, raio 8px). O handoff não desenhou tela de espera,
  então a forma é a que o design system já tem.
