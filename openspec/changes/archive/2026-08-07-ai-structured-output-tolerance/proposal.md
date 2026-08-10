## Why

Uploads e exportações vinham falhando de forma intermitente quando o Groq (e, por herança,
o Cerebras) era quem respondia na cadeia de fallback. Os logs mostravam o provedor recusando
a chamada com HTTP 400 — "Generated JSON does not match the expected schema... missing
properties: 'education', 'skills'" — mesmo quando o currículo tinha conteúdo real.

A causa: `lib/ai/providers/openai-compatible.ts` manda `strict: true` no
`response_format.json_schema`. Nesse modo, a API da OpenAI (herdado por Groq/Cerebras)
garante que a resposta cite **toda** chave do schema — inclusive `education` e `skills`, que
no modelo canônico do currículo podem legitimamente vir vazias (`[]`/`null`). Quando o modelo
que gera a resposta esquece uma dessas chaves, o próprio provedor rejeita a resposta antes de
nos devolver qualquer JSON — não sobra corpo para a nossa validação decidir; a chamada falha
inteira, e a cadeia não passa a vez porque falha de schema é classificada como pedido
inválido (`invalid-request`), que por design não cai para o próximo provedor.

O projeto já tem o princípio certo escrito na spec de `ai-providers` — "a resposta SHALL ser
revalidada do nosso lado, qualquer que tenha sido o provedor" —, mas o `strict: true`
contradizia isso na prática: o provedor decidia sozinho, antes da nossa validação ter a
chance de ser mais tolerante do que ele.

## What Changes

- **`lib/ai/providers/openai-compatible.ts`** deixa de pedir `strict: true`. O schema
  continua sendo enviado no mesmo formato (dialeto estrito da OpenAI, tradução inalterada em
  `json-schema.ts`) — só a garantia de aceitação binária do provedor é que sai de cena. A
  validação de verdade continua sendo a nossa, como a spec já dizia.
- **`lib/ai/structure.ts`** (upload): `education` e `skills` passam a aceitar ausência na
  resposta, com valor padrão (`[]`/`null`) em vez de fazer a importação inteira falhar.
- **`lib/ai/organize-content.ts`** (exportação): `education` na ordem devolvida passa a
  aceitar ausência, com lista vazia, em vez de descartar a ordem inteira e cair para
  cronológica só por essa chave.
- Nenhuma outra chave dos dois schemas muda — `jobs`, `header`, `documentKind`, `summary`,
  `bullets` continuam obrigatórios como sempre, validados com o mesmo rigor de hoje.

**Fora de escopo:**

- Repetir a chamada no mesmo provedor, ou reclassificar `invalid-request` como falha
  temporária para a cadeia inteira — o problema aqui é específico dos dois campos
  elimináveis, não da política geral de fallback.
- Mudar o comportamento do Gemini — ele usa dialeto e SDK próprios, sem essa flag.
- Qualquer outro campo do modelo do currículo.

## Capabilities

### Modified Capabilities

- `ai-providers`: a saída estruturada em provedores compatíveis com a OpenAI deixa de exigir
  aceitação binária do provedor; a validação da camada é quem decide.
- `resume-import`: formação e habilidades ausentes na resposta da IA não falham a
  importação.
- `content-organization`: formação ausente na ordem devolvida pela IA não falha a
  organização.

## Impact

- **Código tocado**: `lib/ai/providers/openai-compatible.ts`, `lib/ai/structure.ts`,
  `lib/ai/organize-content.ts`, e os testes correspondentes
  (`openai-compatible.test.ts` e os testes de `structure`/`organize-content`, se existirem).
- **Comportamento**: nenhum fluxo que já funcionava muda de resultado. O que muda é que um
  subconjunto específico de respostas hoje rejeitadas (faltando só `education`/`skills`,
  quando o resto está correto) passa a ser aceito com valor padrão, em vez de falhar a
  importação ou perder a ordenação por IA na exportação.
- **Contrato de rota**: inalterado — os motivos de falha e status HTTP continuam os mesmos;
  só fica menos provável que esse motivo específico apareça.
- **Configuração**: nenhuma variável nova.
- **Referência de design**: nenhuma — a mudança não toca em interface.
