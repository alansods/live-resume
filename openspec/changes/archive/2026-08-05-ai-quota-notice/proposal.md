## Why

Quando a cota diária do Gemini estoura, a etapa 01 exibe isto ao usuário, em texto corrido:

```
A chamada ao modelo falhou: {"error":{"code":429,"message":"You exceeded your current
quota...","details":[{"@type":"...QuotaFailure","violations":[{"quotaId":
"GenerateRequestsPerDayPerProjectPerModel-FreeTier"...
```

São dois defeitos, um de forma e um de fundo.

**O de forma**: `lib/ai/client.ts` monta a mensagem com
`` `A chamada ao modelo falhou: ${(error as Error).message}` ``, e o `message` do SDK é o
corpo inteiro da resposta do Google. Essa string atravessa a rota, o `error.message` do JSON
e chega à tela sem ninguém olhar para ela. Mensagem de usuário tem de ser escrita para o
usuário; o detalhe da API pertence ao log do servidor.

**O de fundo**: 429 vira `call-failed`, o mesmo motivo de "a rede caiu" e de "o modelo
expirou". Só que as duas situações pedem coisas opostas do usuário. Rede caída se resolve
tentando de novo; cota estourada não se resolve tentando de novo — e é o conselho que a tela
dá hoje, gastando o tempo da pessoa em tentativas que já nascem perdidas.

O limite do plano gratuito é **RPD: 20 requisições por dia**, confirmado no painel (RPM e TPM
estavam folgados). Cada fluxo completo gasta 4 chamadas — estruturar, duas de sugestão,
ordenar-e-traduzir —, então cinco currículos por dia esgotam a cota. A resposta do Google traz
`retryDelay: "59s"`, que é **enganoso** para cota diária: quem esperar 59 segundos tenta de
novo e falha igual. O texto da tela tem de dizer 24 horas, que é quando a janela realmente
renova.

## What Changes

- **`AiFailureReason` ganha `quota-exceeded`**, classificado a partir do status HTTP 429 da
  resposta do modelo. Passa a ser distinguível de `call-failed` em todo o caminho: biblioteca,
  rota e tela.
- **As mensagens de falha de IA passam a ser escritas para o usuário.** Nenhuma mensagem
  devolvida pelas rotas contém corpo de resposta da API, JSON, nome de cota ou status. O
  detalhe bruto vai para `console.warn` no servidor, uma vez, onde a falha acontece.
- **As quatro rotas de IA respondem 429 quando a cota estoura** (`resume-import`,
  `suggestions/metrics`, `suggestions/ats`, `export`), em vez de 502. 502 diz "o modelo está
  com problema"; 429 diz "você bateu no limite", que é o que aconteceu.
- **As etapas 01, 03 e 04 exibem um `FailureNotice` próprio de cota**, dizendo que o limite
  gratuito de uso da IA acabou e que ele renova em cerca de 24 horas. Texto no i18n, PT e EN,
  como todo texto de interface.
- **O aviso da etapa 03 deixa de ser um booleano** e passa a distinguir "parte das sugestões
  não veio" de "a cota acabou" — as sugestões de data continuam na tela nos dois casos, porque
  são locais.

**Fora de escopo:**

- **Contar requisições ou prever o estouro.** O app não sabe quantas chamadas restam sem
  guardar estado entre sessões, e não há armazenamento. Ele reage ao 429 que recebeu.
- **Repetir automaticamente depois do 429.** Cota diária não se resolve com espera curta; um
  retry seria a mesma falha mais tarde, e o `retryDelay` da API não serve para isso.
- **Ler `retryDelay` da resposta.** Foi medido como enganoso para RPD; o texto fixo de 24
  horas é mais honesto que o número que a API manda.
- **Mudar de plano, de chave ou de modelo diante do 429.** Decisão de produto, não de código.
- **Distinguir os outros erros da API** (403, 500 do Google, timeout). Continuam
  `call-failed`, que descreve bem o que a pessoa pode fazer: tentar de novo.
- **Reaproveitar o que já foi importado quando a cota estoura no meio do fluxo.** O estado
  vive na memória da página e continua lá; nada é descartado por causa desta change, e nada é
  salvo por causa dela.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `resume-import`: a falha de IA ganha um motivo próprio para cota esgotada, e a mensagem que
  chega ao usuário passa a ser requisito — sem conteúdo da resposta da API.
- `app-shell-navigation`: as etapas que chamam IA ganham o aviso de cota, distinguível do
  aviso de falha genérica.

## Impact

- **Código tocado**: `lib/ai/client.ts` (classificação e mensagens), `lib/ai/testing.ts`
  (`failingClient` aceita o motivo novo), as quatro rotas em `app/api/`, `lib/i18n/dictionary.ts`,
  `components/shell/ImportStep.tsx`, `components/shell/ExportStep.tsx`,
  `components/shell/AppShell.tsx`, `components/shell/state.ts`.
- **Comportamento**: nenhum fluxo bem-sucedido muda. Muda o que a pessoa lê quando falha.
- **Contrato de rota**: o campo `error.code` ganha o valor `quota-exceeded` e o status 429
  aparece onde antes vinha 502. Só o próprio app consome essas rotas.
- **Dependências**: nenhuma. A classificação é por duck typing do campo `status`, sem importar
  `ApiError` do SDK — o import estático do `@google/genai` levaria o SDK para o bundle do
  cliente, que é justamente o que o import dinâmico de `client.ts` evita.
- **Referência de design**: `claude-design/README.md`, seção de avisos e estados. O aviso
  reusa `FailureNotice` (`components/ui/Notice.tsx`), a mesma forma dos avisos de espera; não
  há componente novo nem cor nova.
