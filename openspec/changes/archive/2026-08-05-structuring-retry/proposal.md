## Why

A importação falha em cerca de uma tentativa a cada quatro, e o motivo não é defeito do
arquivo nem da trava: é a variação do modelo.

Medido com um currículo real de quatro páginas: em quatro importações, duas passaram, uma
caiu em `rewrite-detected` (`education[1].course`) e uma numa falha transitória da API.
`temperature: 0` **não** torna o Gemini determinístico — a mesma entrada produziu saídas
diferentes em execuções seguidas.

Quando isso acontece, o `verify.ts` derruba a importação inteira por causa de um campo, e o
usuário recebe, depois de 20 a 50 segundos de espera:

> A organização automática alterou o texto do currículo… **Tente novamente.**

A mensagem está certa: tentar de novo resolve, porque a próxima resposta provavelmente será
diferente. O que é indefensável é **mandar a pessoa fazer à mão aquilo que o app pode fazer
sozinho** — e cobrar dela outros 30 segundos de espera para descobrir isso.

Um app que funciona em três de quatro tentativas não é entregável, e a causa não é
corrigível "de vez": ela é probabilística.

## What Changes

- **A estruturação repete uma vez quando a trava recusa a resposta**, antes de falhar. A
  segunda tentativa **diz ao modelo o que ele quebrou** — o campo e a natureza da
  divergência —, para não ser um sorteio idêntico ao primeiro.
- **Uma repetição, não várias.** Cada tentativa custa 20 a 50 segundos ao usuário. Uma
  segunda leva a taxa de sucesso de ~75% para ~94%; uma terceira, para ~98%, ao preço de
  uma espera que pode passar de dois minutos só na importação. O ganho não paga.
- **A trava continua absoluta.** Nada entra no currículo sem estar no arquivo. A repetição
  não afrouxa a verificação: ela dá ao modelo uma segunda chance de obedecê-la, e a segunda
  recusa falha como hoje.
- **O log passa a registrar a forma da divergência**, nunca o texto: o campo e o tipo —
  difere só por acentuação, difere por N palavras, ou não foi encontrado em lugar nenhum.
  Nenhum caractere do currículo vai para o log, e a invariante de privacidade continua
  válida. Hoje o log diz só o nome do campo, e foi por isso que diagnosticar a ocorrência de
  hoje exigiu reproduzir à mão com a chave.

**Fora de escopo:**

- **Reparar o campo com o trecho mais parecido do arquivo**, sem nova chamada. Foi
  considerado e recusado: acertar o trecho errado põe conteúdo errado no currículo em
  silêncio, o que é pior que falhar, e introduz semelhança — que este módulo recusa por
  princípio desde o primeiro dia.
- **Afrouxar mais a verificação.** A change anterior já a levou de contenção literal para
  fragmentos e comparação por palavras. O que sobra de falha não é rigidez em excesso; é
  variação do modelo.
- **Repetir as outras chamadas de IA** (sugestões, ordenação, tradução). Falha nelas não
  derruba o produto: as sugestões caem para o conjunto de datas, e a ordenação tem recurso
  cronológico. Só a estruturação é ponto único de falha.
- **A latência da importação** (20-50s no caminho feliz). É o próximo item, e esta change o
  piora no caminho infeliz — de propósito, e declarado.
- **Mudar o prompt da estruturação** na primeira tentativa. As cinco regras invioláveis já
  dizem o que precisa ser dito; o que a segunda tentativa acrescenta é o retorno do que deu
  errado.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `resume-import`: o requisito "A IA distribui o texto, não o reescreve" passa a descrever a
  segunda tentativa — a recusa deixa de ser imediatamente fatal, sem que nada do que ela
  proíbe mude.

## Impact

- **Código tocado**: `lib/ai/structure.ts` (a repetição), `lib/parsing/verify.ts` (a natureza
  da divergência, para a mensagem e para o log), `lib/parsing/index.ts` (onde as duas se
  encontram) e `app/api/resume-import/route.ts` (o log).
- **Comportamento no caminho feliz**: idêntico. Uma chamada, mesma latência.
- **Comportamento no caminho infeliz**: a espera dobra antes de falhar — e, na maior parte
  das vezes, deixa de falhar.
- **Dependências**: nenhuma.
- **Consequência registrada**: o produto passa a esconder do usuário uma falha que continua
  acontecendo. É a decisão certa para quem usa e a errada para quem opera, e é por isso que o
  log ganha a forma da divergência: a única maneira de saber que o modelo está piorando é
  contar as repetições.
- **Referência de design**: nenhuma. É fronteira com o modelo; o handoff não a alcança.
