## Why

Dez capabilities produzem um app que ninguém consegue usar. A etapa 02 e a etapa 03 existem
em rotas provisórias que carregam fixtures; a 01 e a 04 não existem; e a ponte entre revisar
e exportar — `selectedPatches` de um lado, `exportResume` do outro — está desenhada nos dois
extremos e desligada no meio.

Esta change é a montagem. Quase nenhuma decisão de produto nova: as nove anteriores já
decidiram o que cada etapa faz. O que falta é o fio que liga um arquivo importado ao arquivo
baixado.

## What Changes

- **O shell**: top bar com o toggle de idioma, rail lateral de quatro etapas, área de
  conteúdo com transição, e navegação Voltar/Avançar no pé.
- **A etapa 01 — Importar**: dropzone com arrastar e selecionar arquivo, chamada a
  `/api/resume-import`, estados de carregando e de erro, e a confirmação com o nome do
  arquivo depois de importado.
- **A etapa 04 — Exportar**: caixas de idioma (PT-BR / English) e de formato (PDF / DOCX),
  botão cujo rótulo é `idiomas × formatos`, lista de garantias de ATS, e o download.
- **O estado do fluxo**, num ponto só: currículo importado, itens digitados na etapa 02,
  sugestões, conjunto marcado, saídas escolhidas. As etapas continuam recebendo tudo por
  props — nenhuma delas passa a buscar dados.
- **As pontes que faltavam**:
  - importar → o currículo alimenta as etapas seguintes;
  - revisar → `selectedPatches` vira os `patches` de `exportResume`;
  - exportar → o `x-export-failures` da resposta vira aviso na tela, em vez de sumir.
- **Avançar exige o passo anterior**: sem currículo importado não se chega à etapa 02.
- **As rotas provisórias `/atualizar` e `/revisar` são removidas**, substituídas pelo fluxo.

**Fora de escopo:**

- **A home** (`CurriculoVivoHome.dc.html`). Ela é uma página de apresentação e não faz parte
  do fluxo; entra depois, se você quiser.
- **Mudar qualquer etapa existente.** As etapas 02 e 03 entram como estão — se alguma
  precisar mudar para encaixar, é sinal de que o encaixe está errado.
- **Persistir o progresso.** Recarregar a página recomeça: não há conta nem storage, e o
  arquivo é descartado depois da exportação.
- **Refazer as chamadas de IA a cada etapa.** Sugestões são pedidas uma vez, ao entrar na
  revisão.

## Capabilities

### New Capabilities

- `app-shell-navigation`: o shell do aplicativo e a navegação entre as quatro etapas, mais
  as etapas 01 (importar) e 04 (exportar), ligando o arquivo importado ao arquivo baixado.

### Modified Capabilities

Nenhuma. As etapas 02 e 03 são consumidas como estão.

## Impact

- **Código novo**: `components/shell/` (top bar, rail, navegação, o estado do fluxo),
  `components/import-step/`, `components/export-step/` e a rota `app/app`.
- **Código tocado**: `app/atualizar` e `app/revisar` são removidas; `lib/i18n/dictionary.ts`
  ganha as strings do shell, da etapa 01 e da etapa 04.
- **Dependências**: nenhuma nova.
- **Consequência de produto registrada**: é aqui que o usuário vê pela primeira vez o custo
  de tempo real do fluxo — importar chama a IA, entrar na revisão chama de novo, exportar
  chama mais duas vezes. A tela precisa dizer o que está acontecendo em cada espera, senão
  parece travada.
- **Risco conhecido**: esta change consome dez capabilities de uma vez, e é a primeira em que
  elas se encontram. Divergências de contrato que passaram despercebidas aparecem aqui — o
  que é o ponto de fazê-la por último.
- **Referência de design**: `claude-design/README.md` (seções 2, 3 e 6) e
  `claude-design/CurriculoVivoApp.dc.html` (top bar, rail, dropzone, etapa 04 e navegação).
