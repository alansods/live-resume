## 1. Estado da revisão

- [x] 1.1 Implementar `components/suggestion-review/state.ts` como funções puras: marcar,
  desmarcar, marcar todas, ignorar, filtrar, contar pendências, numerar por ordem da lista
  completa e derivar os `patches` do conjunto marcado.
  **Aceite**: cenários "Marcar inclui a sugestão no conjunto", "Desmarcar remove do
  conjunto", "Marcar todas marca as pendentes", "Sugestão ignorada some da tela", "Ignorar
  uma sugestão marcada tira do conjunto", "Desmarcada continua listada", "Filtro por tipo
  mostra só aquele tipo", "Filtro não altera o conjunto marcado" e "Pendências contam o que
  não foi tratado".

## 2. Papel do currículo

- [x] 2.1 Implementar o componente do currículo com os marcadores ancorados por path,
  numerados pela lista completa, recebendo apenas o currículo importado.
  **Aceite**: cenários "O currículo mostra o texto importado", "Marcar não altera o currículo
  exibido", "Texto proposto não aparece no currículo", "Cada sugestão tem marcador no seu
  trecho", "Número do marcador é o número do cartão" e "Sugestão de seção ancora na seção".
  Critério visual: papel `#f3f5fe`, `padding 44px 48px`, raio 4px, marcador 15px `#796cbf`,
  conforme o `.dc.html`.
- [x] 2.2 Implementar o tooltip do marcador, com lado escolhido por medição, e a navegação
  até o cartão.
  **Aceite**: cenários "O resumo do marcador traz o essencial", "Acionar o marcador foca o
  cartão" e "O resumo fecha ao sair do marcador". Critério visual: tooltip 290px, fundo
  `#232532`, raio 8px.

## 3. Painel de sugestões

- [x] 3.1 Implementar o cartão como checklist — caixa de marcação, tipo, local, título, texto
  atual riscado, texto proposto e ignorar — sem aplicar, desfazer ou editar.
  **Aceite**: cenários "Nenhuma ação de desfazer ou editar é oferecida" e "Filtro sem
  resultado informa". Critério visual: cartão `#1e2030`, raio 8px, `padding 14px`.
- [x] 3.2 Implementar cabeçalho do painel, filtro por tipo, contador de pendências e barra de
  pontuação com 10 segmentos alimentada por `atsScore`.
  **Aceite**: cenários "Pontuação sobe ao marcar" e "Pontuação reflete o conjunto marcado,
  não o total". Critério visual: segmentos de 4px, `#9184d9` preenchido e `#3f424d` vazio.
- [x] 3.3 Exibir o aviso de datas organizadas quando o resultado de datas o exigir.
  **Aceite**: cenários "Inferência exibe o aviso na tela" e "Sem inferência, sem aviso na
  tela".

## 4. Idioma e vazio

- [x] 4.1 Acrescentar as strings da etapa 03 ao dicionário, em PT e EN, sem texto fixo em
  componente.
  **Aceite**: cenários "Rótulos da revisão mudam com o idioma", "Conteúdo do currículo não é
  traduzido na revisão" e "Nenhum texto fixo em componente na revisão".
- [x] 4.2 Tratar a ausência de sugestões.
  **Aceite**: cenário "Sem sugestões, o currículo continua visível".

## 5. Fechamento

- [x] 5.1 Criar a rota provisória `app/revisar`, no padrão de `app/atualizar`.
  **Aceite**: a etapa pode ser vista e conferida contra o `.dc.html`; o componente não conhece
  a página que o hospeda.
- [x] 5.2 Verificar cobertura e qualidade.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
