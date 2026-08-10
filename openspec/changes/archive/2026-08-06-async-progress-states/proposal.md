## Why

O fluxo tem três esperas longas — importar (22–49s), analisar (~47s), exportar (~103s) —
e a change `waiting-notice` (2026-08-05) resolveu o problema de então: uma linha de texto
sem nada dizia "Lendo o currículo…" e parecia travamento. A decisão daquela change foi
não estimar o que o sistema não sabia — nenhuma das três chamadas informava progresso, e
a variação medida na mesma etapa foi de mais do que o dobro (22 a 49s). Por isso o box de
espera daquela change explicitamente **não** tem barra de progresso.

O que muda não é a variação de tempo — continua existindo, e continua sem solução nesta
change. O que muda é que agora sabemos o que cada operação faz *por dentro*: importar tem
quatro etapas nomeadas (extrair texto, separar seções, normalizar datas e cargos, marcar
bullets sem métrica); analisar tem cinco; exportar gera N arquivos nomeados, um de cada
vez. Isso é informação que o sistema TEM — não é estimativa de tempo, é etapa concluída ou
não. Uma barra segmentada por etapa nomeada não é a "barra que anda sozinha" que a change
anterior recusou: ela não promete quanto falta em segundos, promete só que a etapa 2 de 4
terminou.

Hoje o usuário também não vê nada acontecer entre clicar "Avançar" na etapa 02 e a
revisão aparecer pronta — vê o texto genérico do `WaitNotice` sem saber se a IA está lendo,
escrevendo ou travada. E ao terminar a exportação, o download simplesmente acontece: não
há tela de confirmação dizendo o que foi baixado, nem convite a baixar de novo ou ajustar e
gerar outra versão.

## What Changes

- **Import (etapa 01)**: ao selecionar/soltar um arquivo, a dropzone é *substituída* (não
  desabilitada) por um cartão de progresso com spinner, nome do arquivo, percentual, uma
  barra segmentada em 10 blocos (não uma barra contínua de largura dinâmica) e um
  checklist de 4 etapas nomeadas, cada uma com ícone de estado (concluída / em andamento /
  pendente). Ao concluir, o cartão sai e entram o cartão de arquivo importado e o campo de
  área de atuação.
- **Análise por IA (transição etapa 02→03)**: clicar em "Avançar" já leva à etapa 03 em
  estado de análise — o painel de revisão (currículo + sugestões) só renderiza quando a
  análise termina (`reviewReady = step === 3 && !analysing`). A tela de análise tem
  spinner, título, checklist de 5 etapas nomeadas com uma nota lateral por etapa
  (contagens) e um bloco de skeleton com shimmer abaixo.
- **Exportação (etapa 04)**: ao clicar em baixar, o formulário inteiro (idiomas, formatos,
  nome de arquivo, garantias) sai e só o cartão de progresso fica — spinner, título,
  contador "N de M", lista de arquivos com nome real de download, um "ativo" por vez.
- **Tela de conclusão da exportação** (nova): substitui formulário e loader por completo —
  círculo com ícone de check, título, parágrafo de agradecimento citando a quantidade de
  arquivos, bloco "Arquivos no .zip", bloco "Antes de mandar" com orientação de uso, e três
  ações (baixar de novo / ajustar e exportar outra versão / começar um novo currículo).
- **Cada operação é uma máquina de estados explícita** — `idle | running | done` (mais
  `error`), com o índice da etapa nomeada ativa — e não um par de booleanos soltos.
  Iniciar uma operação cancela o timer/assinatura da anterior; desmontar o componente
  limpa o timer.
- **Timer simulado por etapa nomeada**: no protótipo, cada etapa avança a cada ~620ms. O
  nome de cada etapa é o contrato: quando a integração real ligar SSE/polling/stream ao
  backend, a UI não muda — só troca o timer simulado pelo evento real que anuncia a mesma
  etapa nomeada.
- **Erro por operação**: cada uma das três operações tem um estado de falha que substitui
  o loader, explica o que falhou em linguagem do usuário (não a mensagem repassada do
  serviço) e oferece tentar de novo. Cenário de falha próprio por operação, não um
  genérico compartilhado.
- **Acessibilidade**: região `aria-live="polite"` anunciando a etapa atual, `role="status"`
  no cartão, e `prefers-reduced-motion` desliga spinner e shimmer mas mantém o texto da
  etapa como indicador — nenhuma espera fica muda.

Esta change também **revê** a decisão da change `waiting-notice` (2026-08-05), registrada
em `app-shell-navigation`, requisito "A espera é anunciada": aquele requisito proíbe
qualquer barra de progresso porque, à época, nenhuma chamada informava progresso real e a
variação medida (mais do que o dobro) tornaria uma estimativa de tempo enganosa. O
requisito é **MODIFICADO** aqui, não descartado: a barra segmentada desta change não
estima tempo restante — ela marca etapas nomeadas e concluídas, que é informação que o
sistema tem e que não varia com a velocidade da chamada. A restrição contra *contagem
regressiva* e contra *percentual calculado sobre duração esperada* continua valendo; o que
passa a ser permitido é progresso por etapa concluída, categoria diferente do que o
requisito original vetava.

**Fora de escopo:**

- Parsing real de DOCX/PDF, geração real de PDF/DOCX, chamadas reais ao modelo,
  empacotamento real de .zip — o timer é simulado a ~620ms/etapa; só o contrato de etapas
  nomeadas e a UI mudam nesta change. A integração real (SSE/polling/stream) fica para uma
  change futura que reusa o mesmo contrato de nomes de etapa.
- Reduzir a espera em si — decisão já tomada pela change `waiting-notice`, mantida aqui.
- Persistir o fluxo entre reloads — continuaria contrariando a decisão de produto de não
  ter storage.
- Streaming real de progresso do backend (parsing incremental, tokens da IA, geração
  incremental de arquivo) — é a "implementação real" citada no contrato de etapas
  nomeadas, e fica para depois.
- Redesenhar o formulário de seleção de idioma/formato ou o checklist de garantias da
  etapa 04 — só o momento em que ele é substituído pelo progresso muda.

## Capabilities

### New Capabilities

- `async-progress-states`: os três cartões de progresso (import, análise, exportação), a
  tela de conclusão da exportação, a máquina de estados compartilhada (`idle|running|done|error`
  + etapa nomeada), o contrato de timer simulado, erro/retry por operação, cancelamento de
  operação concorrente e as regras de acessibilidade e redução de movimento que se aplicam
  a todos eles.

### Modified Capabilities

- `app-shell-navigation`: o requisito "A espera é anunciada" é MODIFICADO — deixa de
  proibir toda barra de progresso e passa a permitir progresso por etapa nomeada e
  concluída (não por tempo estimado), com a justificativa acima. Os requisitos "Nada é
  acionável duas vezes durante a espera" e "Cota esgotada é anunciada como tal" continuam
  valendo e passam a ser satisfeitos pelos novos cartões de `async-progress-states` em vez
  do `WaitNotice` genérico.

## Impact

- **Código novo**: `components/ui/Spinner.tsx`, `components/ui/SegmentedProgress.tsx`,
  `components/ui/StageChecklist.tsx` (primitivos reutilizáveis); `lib/progress/state.ts`
  com a máquina de estados e o timer simulado; `components/shell/ImportProgress.tsx`,
  `components/shell/AnalysisProgress.tsx`, `components/shell/ExportProgress.tsx`,
  `components/shell/ExportComplete.tsx`.
- **Código tocado**: `components/shell/ImportStep.tsx` (troca o `WaitNotice` pelo cartão
  de progresso), `components/shell/AppShell.tsx` (gate `reviewReady`, estado de conclusão
  da exportação, ações de "ajustar e exportar outra versão" / "começar novo currículo"),
  `components/shell/ExportStep.tsx` (formulário sai/entra conforme o estado),
  `components/shell/state.ts` (campo `exportCompletion` para a tela de conclusão
  sobreviver a navegar entre etapas), `components/ui/Notice.tsx` (comentário sobre "sem
  barra de progresso" precisa refletir a mudança), `lib/i18n/dictionary.ts` (chaves novas
  de estágio, checklist, contador de exportação e tela de conclusão, em PT e EN).
- **Dependências**: nenhuma nova — Phosphor Icons já é dependência (`CheckCircle`,
  `CircleNotch`, `Circle`, `Check`, `File`).
- **Consequência registrada**: o app passa a diferenciar duas categorias de "não sei
  quanto falta" — tempo (continua sem estimativa, por decisão da change anterior) e
  progresso estrutural (agora mostrado, porque é conhecido). Se uma etapa nomeada ganhar
  sub-etapas no futuro, o contrato de nomes muda numa change própria; esta change não
  trava o número de etapas para sempre, só estabelece que elas são nomeadas e não
  estimadas em tempo.
- **Referência de design**: não existe `.dc.html` para estas quatro telas —
  `claude-design/CurriculoVivoApp.dc.html` e `claude-design/README.md` foram checados e
  não contêm spinner, barra de progresso, checklist, shimmer, nem os textos "Gerando
  arquivos", "Currículo exportado" ou "Revisando seu currículo". A especificação visual
  desta change vem inline (medidas, cores e tempos em `design.md`/`tasks.md`), não
  extraída de um handoff existente. As cores usadas (`#1c1e2b`, `#9184d9`, `#b5abfc`,
  `#3f424d`, `#e9e9ed`, `#75798c`, `#2b2741`, `#1e2030`) são os tokens Nocturne já
  presentes em `claude-design/styles.css`/`claude-design/README.md`, então as telas novas
  são consistentes com o design system apesar de não terem referência literal em HTML.
