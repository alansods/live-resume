## Why

A suíte não chama a API do Gemini — é regra do projeto, e é a regra certa: teste que depende
de rede é teste que falha por motivo errado. O preço dessa regra é uma classe inteira de
defeito que ela **não pode** pegar, e os dois exemplares que apareceram custaram caro:

- **O modelo estava aposentado.** `gemini-2.5-flash` deixou de existir para chaves novas. A
  suíte continuou verde — nenhum teste chama a API — e o produto inteiro devolvia 502.
- **O PDF nunca funcionou empacotado.** Funcionava em teste e quebrava no servidor, porque o
  caminho do worker do renderizador só existe no build.

Os dois apareceram porque alguém rodou o fluxo à mão. Isso não é um processo: é sorte, e ela
já falhou duas vezes. O que falta é uma **verificação de fumaça** — fora da suíte, explícita,
que suba o servidor e faça as quatro chamadas de verdade.

Junto vai uma faxina que a mesma leitura revelou: `isEmptyIntake` (`lib/update-intake/content.ts`)
não é chamado por ninguém, e `outputCount` (`components/shell/state.ts`) só é chamado pelos
próprios testes — o `ExportStep` reimplementa a conta inline, o que é pior do que uma cópia:
é uma cópia que o teste não exercita. Os três cenários que passavam por ela vão medir o que
o usuário vê, que é o rótulo do botão.

## What Changes

- **Nasce `npm run smoke`**, um script fora da suíte que sobe o servidor de produção,
  importa um currículo de verdade, pede as sugestões e exporta os quatro arquivos, contra a
  API real. Ele falha com mensagem legível e devolve código de saída diferente de zero.
- **O script relata o que gastou**: são quatro chamadas ao modelo, e o plano gratuito tem 20
  por dia. Quem roda precisa saber disso antes, e não depois.
- **`isEmptyIntake` sai.** Ninguém a chama.
- **`outputCount` sai**, e os três cenários da contagem de saídas passam a ser verificados
  pelo rótulo do botão de download, na tela — que é onde a conta aparece para o usuário.

**Fora de escopo:**

- **Rodar a fumaça em CI ou em hook.** Ela gasta cota e depende de chave; quem a dispara é
  uma pessoa que decidiu gastar quatro das vinte requisições do dia.
- **Fazer a suíte chamar a API.** A regra não muda; é ela que torna esta verificação
  necessária, e não o contrário.
- **Verificar a aparência dos arquivos gerados.** A fumaça confirma que o fluxo inteiro
  responde e que os arquivos saem legíveis; julgar diagramação é outro trabalho.
- **Cobrir os erros da API** (cota, credencial ausente). Isso a suíte já cobre, com os
  clientes de `lib/ai/testing.ts`.

## Capabilities

### New Capabilities

- `smoke-check`: a verificação de fumaça do produto — o que ela exercita, o que ela relata e
  por que ela vive fora da suíte.

### Modified Capabilities

- `app-shell-navigation`: a contagem de saídas passa a ser requisito sobre o rótulo do botão,
  que é onde ela aparece, e não sobre uma função de estado que só o teste chamava.

## Impact

- **Código tocado**: `scripts/smoke.mjs` (novo), `package.json` (o script),
  `lib/update-intake/content.ts` e `components/shell/state.ts` (remoções),
  `components/shell/state.test.ts` e `components/shell/AppShell.test.tsx` (os três cenários
  mudam de lugar), `lib/smoke.test.ts` (novo, sobre o script — não o executa).
- **Comportamento**: nenhum. Nada do produto muda para quem usa.
- **Dependências**: nenhuma nova. O script usa `node:child_process` e `fetch` global.
- **Custo de rodar**: quatro requisições ao modelo por execução, de um limite gratuito de
  vinte por dia. Está escrito no próprio script.
- **Referência de design**: nenhuma; não há tela nesta change.
