## Why

O primeiro currículo real importado foi recusado pela trava anti-reescrita. A IA não inventou
nada — foi o `verify.ts` que exigiu o impossível.

O que ela devolveu em `skills`:

> Frontend: JavaScript / TypeScript, React.js, … Vitest. UI/UX & Ferramentas: … Git. Outras
> Competências: … AWS. **Inglês: Avançado (…). Português: Nativo.**

Cada palavra está no arquivo. O que ela fez foi juntar a seção HABILIDADES com a de
**idiomas**, que fica em outro lugar do documento — e isso é a coisa certa a fazer, porque
idioma é habilidade e o modelo canônico tem uma linha só para elas.

A verificação compara por **contenção do texto inteiro**: o valor do campo tem de ser um
trecho contíguo do arquivo. Uma junção de partes distantes nunca é contígua. Três decisões
corretas se contradizem:

1. `skills` é uma linha só (decisão ATS-safe, do modelo canônico);
2. num currículo real, o material dessa linha está espalhado pelo documento;
3. a verificação exige contiguidade.

Não dá para manter as três. A premissa errada é a terceira — contiguidade nunca foi o que a
regra de produto pede. O que ela pede é que **todo texto venha do arquivo**.

## What Changes

- **A verificação passa a ser por fragmento.** O valor do campo é quebrado nos separadores de
  sentença (`. ` e `; `) e **cada pedaço** precisa existir, contíguo, no texto extraído. Um
  campo montado de partes distantes passa; uma reformulação continua sendo recusada, porque o
  texto reformulado não aparece em lugar nenhum.
- **Fragmento curto não vale como prova.** Pedaço com menos de 12 caracteres é reunido ao
  anterior antes da conferência, em vez de verificado sozinho. Sem esse piso, um campo feito
  de muitos pedaços curtos — `"React. Vue. Node."` — passaria montado com palavras soltas do
  documento inteiro, e a trava viraria enfeite.
- **O caminho contíguo continua sendo o primeiro.** Campo que já é um trecho contíguo é
  aceito sem quebra nenhuma. A verificação só afrouxa onde precisa, e o comportamento de tudo
  que já funcionava fica idêntico.
- **A regra continua binária e auditável.** Nada de limiar de similaridade — que é
  exatamente a fresta por onde uma reescrita passa, e que o módulo recusa desde o começo.

**Fora de escopo:**

- **Mudar o modelo canônico** para `skills` deixar de ser uma linha só. Ela é uma linha
  porque é assim que sai num documento que o ATS lê. O defeito não está no modelo.
- **Mudar o prompt da estruturação.** A IA fez o que devia; instruí-la a não juntar idiomas
  com habilidades pioraria o currículo para caber na verificação.
- **A fragmentação de linha do extrator de PDF.** Cada linha visual do PDF vira um bloco, e
  um bullet que ocupa três linhas vira três blocos. Isso hoje **funciona**, porque o texto de
  referência junta os blocos com espaço e a IA os reúne na mesma ordem. Não é bonito e pode
  merecer uma change, mas não é o defeito de agora.
- **A latência de 31s da importação.** É o próximo item, e esta change é o que permite chegar
  lá.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `resume-import`: o requisito "A IA distribui o texto, não o reescreve" passa a descrever a
  verificação por fragmento e o piso de tamanho. O que ele proíbe não muda — texto que não
  está no arquivo continua sendo recusado, e a importação inteira continua falhando na
  primeira violação.

## Impact

- **Código tocado**: `lib/parsing/verify.ts`, na função de contenção.
- **Comportamento preservado**: campo contíguo, normalização de espaços, remoção de marcador
  de lista e divisão de bloco continuam funcionando como antes, pelos mesmos testes.
- **Dependências**: nenhuma.
- **Consequência registrada**: a trava fica mais permissiva do que era, por decisão. Um
  cenário novo mede o preço — uma colagem de palavras soltas continua sendo recusada —, e é
  ele que impede o piso de 12 caracteres de ser afrouxado sem que alguém perceba.
- **Referência de design**: nenhuma. É regra de importação; o handoff não a alcança.
