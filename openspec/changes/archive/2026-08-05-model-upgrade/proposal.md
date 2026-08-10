## Why

O projeto inteiro está parado num modelo aposentado. A primeira chamada real ao Gemini —
depois de doze changes e 447 testes — voltou assim:

```
HTTP 502 — 2,44s
"This model models/gemini-2.5-flash is no longer available to new users."
```

`DEFAULT_MODEL = "gemini-2.5-flash"` (`lib/ai/client.ts:28`) não atende mais chaves novas.
Nenhuma das quatro chamadas do produto funciona: importar, sugerir métrica, sugerir ATS,
ordenar e traduzir na exportação.

Isso passou despercebido porque **os testes nunca chamam a API** — é regra do projeto, e é
uma boa regra. O efeito colateral é que o mock não sabe quando o modelo do outro lado morre.
A suíte continuaria verde com o produto inteiro quebrado, e continuou.

## What Changes

- **`DEFAULT_MODEL` passa a `gemini-3.6-flash`**, fixado por versão. É o flash mais novo que
  a chave alcança, e respondeu em 0,43s com saída estruturada e `temperature: 0` — a forma
  exata em que o projeto chama o modelo.
- **Fixado, e não `gemini-flash-latest`.** O alias nunca mais quebraria por aposentadoria,
  que é o problema de hoje, mas trocaria o modelo por baixo da estruturação sem ninguém
  editar código. Num projeto em que cada cenário tem teste e a resposta da IA é revalidada
  por Zod, comportamento reprodutível vale mais que atualização automática. O custo dessa
  escolha é conhecido: um dia este modelo também será aposentado, e alguém terá de editar
  esta linha.

**Fora de escopo:**

- **Medir a latência das quatro chamadas** e decidir se a espera é tolerável. É o que esta
  change destrava, não o que ela faz.
- **Mudar prompt, schema ou temperatura.** Nada além do nome do modelo muda. Se a qualidade
  da estruturação mudar com o modelo novo, é assunto de outra change — e `verify.ts` continua
  sendo a trava contra reescrita, qualquer que seja o modelo.
- **Detectar automaticamente um modelo aposentado.** Seria uma chamada real à API, e testes
  não fazem isso. A lacuna fica registrada no Impact.
- **Regravar os fixtures de resposta da IA.** Eles são contratos de forma, não capturas
  fiéis de um modelo específico; o schema não mudou.

## Capabilities

Nenhuma. Nenhum requisito nomeia o modelo — as specs falam de "a IA estrutura", "as
sugestões vêm da IA" e, nos cenários de teste, de "nenhuma chamada à API do Gemini é feita".
Trocar o nome do modelo não altera nenhum comportamento observável que uma spec descreva, e
inventar um requisito só para justificar um delta seria pior que não ter delta. Por isso
`skip_specs: true`.

## Impact

- **Código tocado**: `lib/ai/client.ts`, uma linha.
- **Rotas, prompts, schemas, fixtures**: nada muda.
- **Dependências**: nenhuma.
- **Lacuna registrada**: nada no projeto detecta que o modelo do outro lado foi aposentado. A
  suíte não pode detectar — ela não chama a API, por regra. Enquanto não houver uma
  verificação manual ou um script fora da suíte, o sintoma vai continuar sendo o mesmo desta
  vez: alguém tenta usar o produto e recebe 502. Vale uma change própria, se você quiser.
- **Referência de design**: nenhuma. É change de fronteira com o modelo; o handoff não a
  alcança.
