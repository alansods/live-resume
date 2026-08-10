## 1. O box de espera

- [x] 1.1 Criar o aviso de espera em `components/ui`, com título, duração típica e o alerta
  de que recarregar recomeça do zero. Anunciado por `role="status"`.
  **Aceite**: cenários "O aviso não promete progresso" e "Sem espera, sem aviso".
- [x] 1.2 Acrescentar os textos ao dicionário, em PT e EN — um por etapa longa, mais o alerta
  comum de recarregar.
  **Aceite**: o cenário "Nenhum texto fixo em componente no shell" continua passando.

## 2. As três etapas

- [x] 2.1 Usar o box na etapa 01, na 03 e na 04, no lugar da linha de texto.
  **Aceite**: cenários "A importação anuncia a espera", "A revisão anuncia a espera" e "A
  exportação anuncia a espera".
- [x] 2.2 Bloquear navegação enquanto as sugestões carregam, e liberar tudo ao terminar,
  inclusive em falha.
  **Aceite**: cenários "Não se navega durante o carregamento das sugestões", "Não se baixa
  duas vezes" e "Falha libera as ações".

## 3. Aviso de sugestão faltando

- [x] 3.1 Registrar no estado do fluxo que uma rota de sugestão falhou, e exibir o aviso na
  etapa 03.
  **Aceite**: cenários "A revisão avisa quando parte das sugestões não veio" e "Sem falha, sem
  aviso de sugestão faltando". Os cenários de resiliência da change anterior continuam
  passando.

## 4. Fechamento

- [x] 4.1 Conferir o box na tela.
  **Não feito**: chegar a qualquer estado de espera exige importar, que exige a cota da API
  — esgotada (429). O conteúdo dos três avisos está coberto por teste de tela, que renderiza
  o componente de verdade e lê o texto anunciado; a aparência dele reaproveita a nota da
  etapa 02, que já foi conferida contra o handoff.
- [x] 4.2 Verificar qualidade e arquivar.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários novos; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam; `openspec archive
  waiting-notice --yes`.
