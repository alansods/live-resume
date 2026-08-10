## Context

Ver `proposal.md — Why`. O que a solução precisa respeitar:

- `importResume` é `extrair → estruturar → verificar → montar → relatar`, com a verificação
  do lado de fora da chamada (`lib/parsing/index.ts`). A repetição precisa envolver as duas.
- `RewriteDetectedError` carrega `field` e `text`. O `text` é conteúdo do currículo e por isso
  **não pode ir para log** — é invariante do projeto.
- `structureResume` recebe `client` injetável; é o que mantém os testes longe da API.
- A suíte não pode reproduzir a variação do modelo: ela é probabilística e acontece do outro
  lado da fronteira. O que os testes cobrem é o **contrato** da repetição, com um cliente que
  recusa a primeira resposta e aceita a segunda.

## Goals / Non-Goals

**Goals:**

- Sumir com a falha intermitente sem afrouxar a trava.
- Deixar a recorrência diagnosticável sem vazar currículo para log.

**Non-Goals:**

- Tornar a estruturação determinística. Não está ao nosso alcance.
- Reduzir a latência do caminho feliz. Esta change não a toca.

## Decisions

### 1. A repetição mora em `importResume`, não em `structureResume`

Quem sabe que a resposta foi recusada é a verificação, e ela roda no pipeline. Pôr a
repetição dentro de `structureResume` obrigaria a função a conhecer os blocos extraídos e a
chamar `assertOnlyExtractedText` — ou seja, a estruturação passaria a se auto-verificar, e a
trava deixaria de ser um passo separado e auditável do pipeline.

A forma fica: tenta, verifica; se a verificação recusar, tenta de novo com o retorno, e
verifica de novo. Duas tentativas, no máximo, escritas num laço explícito e curto.

### 2. A segunda tentativa recebe o que quebrou

Um segundo sorteio idêntico tem chance real de repetir o erro. O pedido novo acrescenta ao
prompt uma linha dizendo qual campo foi recusado e por quê — "difere por acentuação", "difere
por 3 palavras", "não foi encontrado".

O que **não** vai no retorno é o texto correto: nós não sabemos qual é. Dizer ao modelo "use
exatamente o que está no arquivo" é o que as cinco regras invioláveis já dizem; o que muda é
que agora ele sabe onde falhou.

### 3. A natureza da divergência é derivada, não guardada

`RewriteDetectedError` ganha um campo com a **classificação** da divergência, calculada na
hora da recusa a partir do texto e da referência:

- `sem-acento` — coincide ignorando acentuação;
- `palavras:N` — quantas palavras do campo não estão na referência;
- `ausente` — nenhuma palavra do campo aparece.

São números e rótulos, nunca conteúdo. É o que vai para o log e para a segunda tentativa.

Alternativa descartada: logar um trecho truncado do texto. Truncar não desidentifica —
"Reduzi os tickets de suporte em…" já é o currículo de alguém.

### 4. Uma repetição, e o número fica visível no código

Uma constante nomeada, com o cálculo escrito ao lado: a ~25% de recusa observada, duas
tentativas deixam ~6% de falha e três, ~1,5% — ao preço de uma espera que pode passar de dois
minutos. Quem quiser mudar o número vai ler por que ele é dois.

### 5. Os testes cobrem o contrato, não a probabilidade

Um cliente de teste que devolve uma resposta ruim seguida de uma boa exercita a repetição sem
tocar na API. É a mesma técnica que o projeto já usa em `recordedClient`/`failingClient`, e é
o que permite afirmar "não há terceira tentativa" com uma contagem exata.

## Risks / Trade-offs

- **A falha fica escondida de quem opera** → é o motivo de o log ganhar a natureza da
  divergência. Sem isso, o produto passaria a esconder uma degradação do modelo.
- **O caminho infeliz dobra de espera** → aceito, e é o caminho que hoje termina em erro. A
  troca é entre esperar mais e falhar.
- **Duas chamadas custam duas vezes mais** → só quando a primeira é recusada, o que é a
  minoria. E o custo de uma importação falha é maior: o usuário refaz tudo.
