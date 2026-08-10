## Context

Ver `proposal.md — Why`. O que a solução precisa respeitar:

- `assertContido` compara texto normalizado por contenção simples. É binária e auditável de
  propósito — o módulo recusa limiar de similaridade desde o primeiro dia, e com razão.
- `referenceText` junta os blocos extraídos com um espaço. Um bullet que ocupa três linhas do
  PDF vira três blocos, e continua contíguo na referência porque a IA os reúne na ordem.
- A verificação roda em todos os campos, não só em `skills`.

## Goals / Non-Goals

**Goals:**

- Aceitar reunião de material distante sem aceitar reescrita.
- Não mudar o comportamento de nenhum campo que já passava.

**Non-Goals:**

- Distinguir "junção legítima" de "junção ruim" por julgamento semântico. Isso é a IA
  julgando a IA, e a trava existe justamente para não depender disso.
- Cobrir reordenação: um campo que reúne fragmentos fora da ordem do documento passa, desde
  que cada fragmento exista. Ordem não é o que a regra protege.

## Decisions

### 1. Contíguo primeiro, fragmento depois

`assertContido` tenta a contenção do texto inteiro. Só quando ela falha é que o campo é
quebrado. Dois ganhos: o caminho comum não muda de comportamento nem de custo, e a leitura do
código deixa claro que a quebra é a exceção, não a regra.

### 2. A quebra é por separador de sentença, não por vírgula

`. ` e `; `. Vírgula não serve: ela separa itens *dentro* de uma lista de habilidades, e
quebrar ali produziria exatamente os fragmentos curtos que o piso existe para impedir —
`"React.js"`, `"Redux"`, `"Figma"`. Com separador de sentença, os fragmentos são as unidades
que o autor do currículo escreveu.

### 3. Fragmento curto é reunido ao anterior, não recusado

Recusar todo fragmento abaixo do piso rejeitaria um campo legítimo que termine em `"Git."`.
Reunir ao anterior mantém a unidade de verificação longa **e** não inventa falha: o pedaço
curto continua tendo de existir no arquivo, só que dentro de um trecho maior, que é uma
exigência mais forte e não mais fraca.

Piso de 12 caracteres, no texto já normalizado. É curto o bastante para não atrapalhar
`"Português: Nativo"` (17) e longo o bastante para que `"React"` (5) ou `"Vue"` (3) nunca
sejam prova de nada.

### 4. O erro continua nomeando o campo, não o fragmento

`RewriteDetectedError` recebe o texto do campo inteiro. Quem lê o log quer saber qual campo
derrubou a importação; apontar o fragmento faria a mensagem parecer que só ele foi rejeitado,
quando a importação inteira falhou.

## Risks / Trade-offs

- **A trava fica mais permissiva** → é a decisão, tomada com o caso real na mão. O cenário
  "Colagem de palavras soltas é recusada" é o que mede o preço e trava o piso de 12
  caracteres contra ser afrouxado sem ninguém perceber.
- **Um campo pode reunir fragmentos fora de ordem** → aceito, e declarado em Non-Goals.
  Ordem do conteúdo é decisão da IA na geração, por regra de produto; exigi-la aqui seria
  proteger o que o produto não protege.
- **O piso é um número escolhido** → como qualquer limiar. A diferença para um limiar de
  similaridade é que este não decide *se o texto é parecido o bastante*: ele decide apenas
  qual é a unidade mínima de evidência. A conferência em si continua binária.
