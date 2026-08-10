## Why

Três acertos de interface foram implementados sem passar pela spec, e é isso que esta
change repara — o comportamento existe no código e não existe em requisito nenhum:

1. O resumo do marcador numerado prometia um "ver detalhes" **inalcançável**: entre o
   marcador e o resumo havia uma faixa de papel, e descer o ponteiro até o botão fechava o
   resumo antes do clique. A spec exige que acionar o "ver detalhes" leve ao cartão; na
   prática não havia como acioná-lo.
2. A top bar rolava para fora da tela. Ela carrega a pontuação de ATS e o caminho de volta
   — justamente o que se quer consultar enquanto se percorre um currículo longo decidindo
   o que aceitar.
3. O rótulo da caixa de marcação dizia "Marcar", que descreve o gesto e não a decisão. A
   troca para "Aceitar sugestão" precisa ser registrada **com cuidado**: a spec proíbe
   oferecer "aplicar", e um rótulo que soa como aplicar sem que a spec diga que aceitar é
   marcar vira evidência contra o próprio invariante.

## What Changes

- O resumo do marcador permanece aberto no caminho entre o marcador e o próprio resumo,
  de modo que o "ver detalhes" seja alcançável com o ponteiro. Sair do conjunto continua
  fechando o resumo — o que muda é o que conta como "sair".
- A top bar fica fixa no topo da janela durante a rolagem, na home e no aplicativo, com a
  pontuação de ATS e o caminho de volta sempre visíveis. Ela passa por cima do papel do
  currículo e do resumo do marcador, e nunca por cima de um modal.
- O rótulo da caixa de marcação passa a ser "Aceitar sugestão" / "Sugestão aceita"
  (`Accept suggestion` / `Suggestion accepted`) e o de marcar todas, "Aceitar todas"
  (`Accept all`). O requisito passa a dizer explicitamente que **aceitar é marcar**: nada
  acontece com o currículo ao aceitar, e a reversão continua sendo desmarcar.

## Capabilities

### New Capabilities

Nenhuma. As três mudanças incidem sobre capabilities existentes.

### Modified Capabilities

- `suggestion-review-ui`: o requisito de foco e navegação entre marcador e cartão ganha o
  cenário do caminho até o resumo; o requisito "Marcar é a única ação sobre o currículo
  final" passa a fixar o vocabulário de aceitar/desmarcar e a dizer que aceitar não toca
  no currículo.
- `app-shell-navigation`: novo requisito de top bar fixa durante a rolagem.
- `home-page`: a home usa a mesma top bar, então a fixação vale igual nas duas telas.

## Fora de escopo

- Qualquer forma de aplicar, desfazer ou pré-visualizar o resultado. "Aceitar" é o rótulo
  do mesmo gesto de sempre; nenhuma mecânica muda.
- Abrir o resumo do marcador por teclado ou toque. Ele continua sendo um afordance de
  ponteiro; o caminho acessível para a sugestão é o cartão, que já é navegável.
- Reposicionar a top bar em telas estreitas ou torná-la retrátil na rolagem.
- A persistência do idioma da interface, que toca o invariante de não guardar nada no
  navegador e está na change `locale-preference-persistence`.

## Impact

- Código: `components/suggestion-review/Review.module.css` (ponte entre marcador e
  resumo), `components/ui/TopBar.module.css` (fixação e camada), `lib/i18n/dictionary.ts`
  (rótulos PT/EN).
- Testes: `components/suggestion-review/SuggestionReview.test.tsx`,
  `components/ui/TopBar.test.tsx`.
- Referências de design: `claude-design/CurriculoVivoApp.dc.html` (top bar do aplicativo e
  tela de revisão), `claude-design/CurriculoVivoHome.dc.html` (top bar da home),
  `claude-design/README.md` (medidas e estados), `claude-design/styles.css` (tokens).
- Sem impacto em rotas, na fronteira de IA ou no modelo canônico.
