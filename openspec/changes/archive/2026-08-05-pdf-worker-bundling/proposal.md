## Why

Importar PDF nunca funcionou no aplicativo em execução. Todo PDF, válido ou não, volta como
arquivo corrompido:

```
resume-import: falha de arquivo
reason: 'corrupted-file'
cause: "Setting up fake worker failed: Cannot find module
        '.next/dev/server/chunks/pdf.worker.mjs'"
```

O `pdfjs-dist` carrega o seu worker por caminho de módulo em tempo de execução. O Turbopack
empacota o pacote e reescreve esses caminhos, e o worker deixa de existir onde a biblioteca o
procura. A exceção cai no `catch` de `lerItens`, que a traduz para `corruptedFile("PDF", …)` —
e o usuário lê que o **arquivo dele** está corrompido, por um defeito nosso.

A suíte não pega: o Vitest resolve `node_modules` normalmente, então `extractPdf` funciona nos
testes e nos fixtures. Só o servidor empacota, e nada no projeto exercitava o servidor.

Metade dos formatos aceitos estava fora do ar desde sempre. DOCX funciona.

## What Changes

- **`pdfjs-dist` sai do empacotamento do servidor**, via `serverExternalPackages` no
  `next.config.ts`. O Next passa a resolvê-lo com `require` nativo, e a biblioteca encontra o
  próprio worker. Confirmado: com a opção, o mesmo PDF que devolvia 422 passa pela extração.
- **A escolha vira requisito de `resume-import`**, verificável lendo a configuração. Não é
  preferência de build: é a condição para a extração de PDF existir em produção, e sem
  requisito ela volta a sumir no dia em que alguém "limpar" a configuração.

**Fora de escopo:**

- **A trava anti-reescrita recusando o currículo real.** Com o PDF lendo, a importação avança
  e falha depois, no `verify.ts`, por outro motivo — `skills` juntando a seção de habilidades
  com a de idiomas. É o defeito seguinte da fila e a sua própria change.
- **A latência da estruturação** (27s num currículo de quatro páginas). Esta change destrava
  a medição; não a faz.
- **Um teste que exercite o servidor empacotado.** Seria `next build` mais uma requisição
  dentro da suíte — minutos por rodada, para cobrir uma classe de defeito que um script fora
  da suíte cobre melhor. A lacuna fica registrada no Impact.
- **Revisar as demais dependências pesadas** (`mammoth`, `@react-pdf/renderer`, `docx`,
  `jszip`) atrás do mesmo problema. `@react-pdf/renderer` já está na lista que o Next
  externaliza sozinho; as outras funcionam. Auditar todas é change própria, e sem sintoma não
  há o que corrigir.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `resume-import`: ganha um requisito de que a extração de PDF funcione no servidor em
  execução, e não só em teste — a dependência que lê PDF não pode ser empacotada.

## Impact

- **Código tocado**: `next.config.ts`, uma opção.
- **Comportamento**: nenhuma função de `lib/` muda. O que muda é a resolução de módulo do
  servidor.
- **Dependências**: nenhuma nova.
- **Divulgação**: esta opção já foi escrita no `next.config.ts` durante o diagnóstico, antes
  desta proposta, para confirmar que a correção era essa. Fora do fluxo combinado; fica
  registrado aqui em vez de passar em silêncio.
- **Lacuna registrada**: a suíte continua sem exercitar o servidor empacotado. Esta é a
  segunda vez que um defeito só aparece com o produto rodando — a primeira foi o modelo
  aposentado. Um script de fumaça fora da suíte (`npm run smoke`), que suba o servidor e rode
  as quatro chamadas, cobriria as duas classes. Vale uma change própria.
- **Referência de design**: nenhuma. É configuração de build; o handoff não a alcança.
