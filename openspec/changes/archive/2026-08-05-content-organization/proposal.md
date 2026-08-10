## Why

`resume-model` já sabe **aplicar** uma ordem: `ResumeOrder` é uma permutação de ids,
`generateFinal` a aplica, e permutação incompleta ou com id desconhecido é recusada inteira.
O que não existe é quem **produz** essa ordem. Hoje `generateFinal` é chamado sem o terceiro
argumento e o currículo final sai na ordem em que o arquivo importado estava — que é
justamente o que a regra de produto diz para não fazer.

Isso importa porque a ordem do arquivo antigo costuma ser ruim. Currículo que a pessoa vem
editando há anos acumula o emprego mais recente no fim, o estágio de 2014 acima da promoção
de 2023, e o bullet mais forte da experiência atual em quarto lugar, depois de "participei
das reuniões semanais". Quem lê — humano ou máquina — decide nos primeiros centímetros.

A ordem é decisão da IA, não do usuário e não de uma regra nossa. O produto é explícito nos
dois sentidos: **o usuário não ordena o currículo** (não há arrastar, subir/descer, nem
ordenação manual em etapa alguma) e **o app não decide ordem por heurística**. O que o código
faz é pedir, validar e aplicar.

## What Changes

- **A IA passa a definir a ordem na geração.** Nova chamada que recebe o currículo e devolve
  a permutação de ids: experiências, bullets dentro de cada experiência, e formações.
- **A permutação é validada contra o currículo antes de virar `ResumeOrder`.** Id
  desconhecido, id repetido ou lista incompleta são recusados — `generateFinal` já falha
  nesses casos, e falhar antes dá erro melhor e não desperdiça a geração.
- **Ordem de saída é recuperável quando a IA falha.** Se a chamada falhar, a geração
  prossegue com uma ordem de recurso — cronológica inversa por data de início, que é a
  convenção de currículo — em vez de abortar a exportação. O usuário perde a curadoria, não
  o arquivo. `resume-model` já trata ordem omitida como "conserva a ordem de origem"; aqui a
  escolha é mais forte, porque a ordem de origem é reconhecidamente ruim.
- **Nada disso toca o currículo em revisão.** A etapa 03 continua mostrando o currículo na
  ordem do arquivo importado. A reordenação existe só dentro de `generateFinal`.
- **A ordem não altera conteúdo.** A permutação move itens; nenhum texto, id, período ou
  origem muda. É a mesma trava do `verify.ts` da importação, aplicada a outro momento: a IA
  organiza, não reescreve.

**Fora de escopo:**

- **Aplicar a ordem** — `applyOrder`/`reorderResume` já existem em `resume-model` e são
  internos de propósito. Esta change produz o dado que eles consomem.
- **Detecção e reflow de layout multicoluna** — já entregue em `resume-import`, que separa
  o texto por coluna antes de reconstruir linhas e sinaliza o layout.
- **Ordem das seções** (resumo, experiência, formação, habilidades) e a formatação do
  documento. São do modelo padrão, fixos, e saem em `export-docx-pdf`.
- **Qualquer UI de ordenação.** Não existe arrastar, subir/descer nem preview da ordem
  final — o usuário não ordena o currículo, e a ordem só se materializa no arquivo exportado.
- **Escolher o que entra no currículo.** A IA ordena o que existe; não corta experiência,
  não esconde bullet e não decide que um emprego é irrelevante demais para aparecer.

## Capabilities

### New Capabilities

- `content-organization`: produção da ordem do conteúdo do currículo final pela IA —
  experiências, bullets e formações como permutação de ids validada contra o currículo, com
  ordem de recurso cronológica quando a chamada falha.

### Modified Capabilities

Nenhuma. `resume-model` já expõe `ResumeOrder` e o terceiro argumento de `generateFinal`;
esta change só passa a preenchê-lo.

## Impact

- **Código novo**: `lib/ai/organize-content.ts` (a chamada e o prompt) e
  `lib/resume/chronological.ts` (a ordem de recurso, pura, sobre `comparePeriodStart`).
- **Código tocado**: nenhum arquivo existente muda de comportamento. Quem passa a chamar a
  organização é a exportação, em `export-docx-pdf`.
- **Dependências**: nenhuma nova. Reutiliza o cliente Gemini e os comparadores de período de
  `resume-model`.
- **Custo**: uma chamada por geração — e a geração acontece uma vez, no download, não a cada
  marcação de checkbox.
- **Contrato para as próximas changes**: `export-docx-pdf` chama a organização e repassa o
  `ResumeOrder` a `generateFinal`. Como a exportação pode emitir quatro arquivos (PT/EN ×
  DOCX/PDF), a ordem é obtida **uma vez** e reutilizada nos quatro — dois arquivos do mesmo
  currículo com ordens diferentes seriam um defeito visível.
- **Consequência de produto registrada**: a ordem é a única decisão da IA que entra no
  currículo final sem passar pelo checklist. Ela é aceitável porque não cria nem altera
  conteúdo — move o que o usuário escreveu. Se algum requisito futuro precisar que a IA
  *edite* na geração, ele não cabe aqui e viola a regra da marcação.
- **Referência de design**: `claude-design/README.md` (seção "6. Etapa 04 — Exportar" e a
  lista de garantias de ATS). Sem UI nesta change.
