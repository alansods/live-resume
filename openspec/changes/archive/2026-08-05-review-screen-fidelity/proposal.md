## Why

As etapas 02, 03 e 04 nunca tinham sido vistas rodando — só cobertas por teste. Foram
abertas no navegador com um currículo real de quatro páginas, e três defeitos apareceram
que teste nenhum pegaria, porque nenhum deles é sobre comportamento.

1. **O texto do arquivo invade o papel do currículo.** Quando um período não tem mês, o
   modelo guarda o texto do arquivo em `period.raw` — e no currículo real esse texto era
   um parágrafo inteiro: "Em andamento, previsão de conclusão: 2º semestre de 2026 -
   Módulos: Desenvolvimento Fullstack, DevOps, IA e Produto". O papel o coloca na coluna
   da data, que tem `white-space: nowrap`. Resultado: o título "Pós-graduação em Tech 360
   — Rocketseat" foi espremido em quatro linhas de duas palavras e o parágrafo saiu do
   papel branco, por cima do fundo escuro. O papel é a peça central da etapa 03.

2. **As caixas de marcar são as do navegador.** Na etapa 04 (idiomas e formatos) e no
   rodapé de cada cartão de sugestão, o `input[type=checkbox]` aparece sem estilo: caixa
   azul do macOS num tema onde não existe azul. O handoff é explícito
   (`claude-design/README.md`, "Checkboxes (quadrados, `border-radius: 4px`)"), e
   `claude-design/styles.css` já traz a forma em `.radio .dot`. O guard de cor não pega
   porque a cor não está no nosso CSS: ela é do sistema operacional.

3. **Rótulo sem valor na etapa 02.** Nos períodos em que o arquivo não trouxe texto
   nenhum, a etapa 02 mostra "No arquivo:" e nada depois — dois cartões da tela real
   estavam assim.

## What Changes

- **Período sem data sai da coluna da data.** Quando o período não está completo, o texto
  do arquivo passa a ocupar uma linha própria abaixo do título, quebrando normalmente, com
  o marcador numerado junto. Período completo continua onde está, à direita do título.
  Vale para experiências e formações, que dividem o mesmo cabeçalho.
- **Nasce um `Checkbox` em `components/ui`**, com a forma do handoff: 16px, raio 4px, borda
  do divisor, accent quando marcado, foco visível. A etapa 04 e o cartão de sugestão passam
  a usá-lo. O `input` continua existindo e continua sendo o que recebe o clique, o foco e o
  rótulo — ele só deixa de ser o que se vê.
- **O rótulo "No arquivo:" só aparece quando há texto do arquivo.**

**Fora de escopo:**

- **Redesenhar o papel do currículo.** O que muda é onde um texto que não é data aparece;
  tipografia, medidas e espaçamento do papel ficam como estão.
- **Trocar o `input` por um controle de mentira.** Nada de `div` com `role="checkbox"`: o
  que sustenta teclado, leitor de tela e o `<label>` é o input nativo, e ele fica.
- **Estilizar todos os controles nativos do app.** Esta change cobre as caixas de marcar,
  que é onde o defeito aparece. Rádio e select não existem no produto.
- **Completar a data por conta própria quando o arquivo não trouxe texto.** A etapa 02
  pede o mês ao usuário; esta change só deixa de mostrar um rótulo vazio.
- **A landing e a home.** Não foram tocadas.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `suggestion-review-ui`: ganha o requisito de que período em texto livre não ocupa a coluna
  da data, e o de que a caixa de marcar a sugestão é a do design system.
- `app-shell-navigation`: ganha o requisito de que as caixas de idioma e formato são as do
  design system.
- `update-intake`: ganha o requisito de que o rótulo do texto do arquivo só aparece com
  texto.

## Impact

- **Código tocado**: `components/ui/index.tsx` e `components/ui/primitives.module.css`
  (o `Checkbox`), `components/suggestion-review/ResumePaper.tsx`,
  `components/suggestion-review/SuggestionCard.tsx`,
  `components/suggestion-review/Review.module.css`, `components/shell/ExportStep.tsx`,
  `components/shell/Shell.module.css`, `components/update-intake/PendingPeriods.tsx`.
- **Comportamento**: nenhum fluxo muda; nenhuma chamada de IA a mais ou a menos.
- **Dependências**: nenhuma.
- **Referência de design**: `claude-design/README.md` (seção da etapa 04, "Checkboxes
  (quadrados, `border-radius: 4px`)"), `claude-design/styles.css` (`.radio .dot`, que dá a
  forma), `claude-design/CurriculoVivoApp.dc.html` (etapas 03 e 04).
