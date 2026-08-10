## 1. Resumo do marcador alcançável

- [x] 1.1 Ponte entre o marcador e o resumo, cobrindo só a altura do vão
      **Aceite**: com o resumo aberto, descer o ponteiro até o "ver detalhes" não o fecha;
      a ponte não cobre o botão numerado, e clicar no marcador continua focando o cartão.
      **Visual**: `claude-design/CurriculoVivoApp.dc.html` — marcador e resumo mantêm
      posição, tamanho e sombra do handoff; nada muda de aparência.
- [x] 1.2 Teste `O resumo continua aberto no caminho até ele`
      **Aceite**: o ponteiro sai do marcador tendo o resumo como destino, o resumo
      permanece na tela e o "ver detalhes" é acionável — falha se o resumo desmontar.
- [x] 1.3 Confirmar que `O resumo fecha ao sair do marcador` continua passando
      **Aceite**: sair para o papel (sem destino dentro do conjunto) segue fechando.

## 2. Top bar fixa

- [x] 2.1 Fixar a top bar no topo da janela, na camada entre o resumo do marcador e o modal
      **Aceite**: rolar qualquer etapa mantém a barra visível; nenhum conteúdo nasce sob
      ela; o modal aberto cobre a barra.
      **Visual**: `claude-design/CurriculoVivoApp.dc.html` e
      `claude-design/CurriculoVivoHome.dc.html` — 46px de altura, recuo de 24px, fundo e
      divisor dos tokens; a barra fixa é idêntica à que rolava.
- [x] 2.2 Testes `A top bar continua visível ao rolar` e `A top bar não cobre o começo do
      conteúdo`
      **Aceite**: afirmam sobre o CSS da top bar (posição e deslocamento no topo), no mesmo
      estilo em que `Home.test.tsx` já verifica folha de estilo.
- [x] 2.3 Teste `O modal fica acima da top bar`
      **Aceite**: compara a camada do fundo do modal com a da top bar — falha se a barra
      passar por cima do diálogo.
- [x] 2.4 Teste `A top bar da home acompanha a rolagem`
      **Aceite**: a home usa a mesma barra, então a verificação é a mesma nas duas telas.

## 3. Vocabulário de aceitar

- [x] 3.1 Rótulos no dicionário: aceitar sugestão / sugestão aceita / aceitar todas, PT e EN
      **Aceite**: nenhum texto fixo em componente; os dois dicionários seguem com as mesmas
      chaves e sem valor vazio (testes de i18n já existentes).
- [x] 3.2 Teste `Aceitar uma sugestão não altera o currículo em revisão`
      **Aceite**: aceitar uma sugestão não muda o papel do currículo, e o texto proposto
      continua só dentro do cartão — é o cenário que impede o rótulo de ser lido como
      "aplicar".
- [x] 3.3 Ajustar os testes que consultavam os rótulos antigos
      **Aceite**: suíte inteira verde, incluindo `lib/spec-coverage.test.ts`.

## 4. Fechamento

- [x] 4.1 `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run format:check` limpos
- [x] 4.2 `openspec validate revision-ui-polish --strict` sem erro
