## 1. Fundação de interface

- [x] 1.1 Adicionar Phosphor Icons e configurar os testes de componente (Testing Library
  com `@vitest-environment jsdom` por arquivo, sem mudar o padrão `node` da suíte).
  **Aceite**: um teste de componente trivial passa; `npm test` continua verde para os
  testes de servidor.
- [x] 1.2 Criar o i18n da interface em `lib/i18n/`: dicionário tipado PT/EN e hook de
  leitura do idioma.
  **Aceite**: cenário "Rótulos mudam com o idioma"; o tipo impede chave sem tradução.

## 2. Primitivos de UI

- [x] 2.1 Criar `components/ui/` com Button (primary, secondary, ghost), Card, Field,
  TextArea e Chip, consumindo os tokens de `claude-design/styles.css`.
  **Aceite**: cenário "Nenhuma cor fora do design system" — teste que varre
  `components/` e falha se achar literal de cor.
- [x] 2.2 Criar o Modal sobre `<dialog>` nativo, com overlay, caixa de 420px, animações de
  entrada e fechamento por overlay e por `Esc`.
  **Aceite**: cenários "Clique no overlay fecha", "Clique dentro da caixa não fecha" e
  "Modal segue a forma do handoff".

## 3. Estado da etapa

- [x] 3.1 Implementar o reducer da etapa em `components/update-intake/state.ts`: adicionar,
  editar campo, remover, abrir/fechar modal e atualizar rascunho, com id de item vindo de
  `newItemId()`.
  **Aceite**: cenários "Edição atinge só o item editado", "Remover apaga o item certo" e
  "Remover não embaralha o que foi digitado".
- [x] 3.2 Implementar a validação de data em `mm/aaaa` reaproveitando `parsePeriod`, com
  fim em aberto e recusa de fim anterior ao início.
  **Aceite**: cenários "Data válida é aceita", "Mês inválido é recusado", "Ano solto é
  recusado", "Fim antes do início é recusado" e "Fim em aberto é aceito".

## 4. A tela

- [x] 4.1 Montar as três seções com ícone, rótulo, contador, botão de adicionar e estado
  vazio explicativo.
  **Aceite**: cenários "As três seções aparecem", "Contador acompanha os itens" e "Lista
  vazia explica o vazio".
- [x] 4.2 Montar os cards de item com os campos de cada tipo e a ação Remover.
  **Aceite**: cenários "Campos da formação", "Campos da experiência" e "Campo da
  habilidade".
- [x] 4.3 Ligar o modal de adicionar aos três tipos, com título e campos conforme o tipo.
  **Aceite**: cenários "Modal abre com o tipo certo", "Adicionar cria o item", "Cancelar
  não cria nada" e "Não existe linha em branco inline".

## 5. Períodos incompletos

- [x] 5.1 Apresentar os períodos incompletos vindos da importação, com o texto original, e
  aplicar o mês informado pelo usuário.
  **Aceite**: cenários "Períodos incompletos são apresentados", "Usuário completa o
  período", "Nenhum mês é assumido" e "Sem pendências, a seção não aparece".

## 6. Fechamento

- [x] 6.1 Hospedar a etapa numa rota provisória e conferir a fidelidade visual contra
  `claude-design/CurriculoVivoApp.dc.html` (etapa 02 e modal), listando divergências de
  cor, medida, raio, sombra e estado.
  **Aceite**: a tela roda no navegador; relatório de divergências apresentado ao usuário
  antes de qualquer correção.
- [x] 6.2 Verificar cobertura e qualidade.
  **Aceite**: cenários "Conteúdo do usuário não é traduzido" e "Nenhum texto fixo em
  componente"; o teste de cobertura reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
