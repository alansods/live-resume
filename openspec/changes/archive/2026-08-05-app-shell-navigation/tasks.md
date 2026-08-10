## 1. Estado do fluxo

- [x] 1.1 Implementar `components/shell/state.ts` como funções puras: etapa atual, limites
  1–4, trava de avanço sem currículo, currículo importado, sugestões, marcações e saídas
  escolhidas.
  **Aceite**: cenários "A etapa atual é indicada", "Voltar não passa da primeira", "Avançar
  não passa da última", "Sem currículo, não se avança" e "Com currículo, o fluxo abre".

## 2. Shell

- [x] 2.1 Implementar top bar com toggle de idioma, rail das quatro etapas e navegação
  Voltar/Avançar no pé do conteúdo.
  **Aceite**: cenários "Rótulos do shell mudam com o idioma" e "Nenhum texto fixo em
  componente no shell". Critério visual: top bar 46px, rail 236px, etapa ativa em
  `btn-primary`, conforme o `.dc.html`.

## 3. Etapa 01 — Importar

- [x] 3.1 Implementar a dropzone com seleção e arraste, chamada a `/api/resume-import`,
  estado de processamento, erro e confirmação com o nome do arquivo.
  **Aceite**: cenários "Arquivo selecionado é importado", "Arquivo arrastado é importado",
  "Enquanto importa, a espera é informada" e "Falha de importação é informada e não avança".
  Critério visual: borda tracejada, raio 14px, `padding 44px`, conforme o `.dc.html`.

## 4. Etapa 04 — Exportar

- [x] 4.1 Implementar as caixas de idioma e formato, a contagem `idiomas × formatos` e a
  lista de garantias de ATS.
  **Aceite**: cenários "A contagem reflete idiomas vezes formatos", "Sem seleção não há
  download", "Uma combinação gera um arquivo" e "Trocar o idioma da interface não muda as
  saídas escolhidas".
- [x] 4.2 Disparar o download a partir da resposta de `/api/export` e exibir as falhas
  parciais do cabeçalho.
  **Aceite**: cenários "Falha de um idioma é exibida" e "Sem falha, sem aviso".

## 5. Pontes

- [x] 5.1 Ligar a revisão à exportação: `selectedPatches` do conjunto marcado vira os
  `patches` enviados.
  **Aceite**: cenários "O que foi marcado chega à exportação" e "O que não foi marcado não
  chega".
- [x] 5.2 Pedir as sugestões ao entrar na etapa 03, uma vez, preservando marcações na
  navegação.
  **Aceite**: cenários "Sugestões são pedidas ao chegar na revisão", "Voltar e avançar não
  repete o pedido" e "Marcações sobrevivem à navegação".

## 6. Fechamento

- [x] 6.1 Remover as rotas provisórias `/atualizar` e `/revisar` e hospedar o fluxo em
  `app/app`.
  **Aceite**: nenhuma tela alimentada por fixture continua na aplicação; `npm run build`
  lista a rota nova e não as antigas.
- [x] 6.2 Verificar cobertura e qualidade.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
