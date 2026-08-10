## Why

O usuário pode marcar português e inglês na etapa 04. Hoje isso não existe: o currículo tem
um idioma só — o dele —, e nada no código produz a outra versão.

A tradução é o único momento em que o conteúdo do currículo muda de idioma. Em tela, nunca:
o toggle da top bar traduz só a interface. Por isso ela mora aqui, na exportação, e só
acontece para a saída que o usuário marcou.

Traduzir currículo tem uma armadilha própria: nome de empresa, de instituição e da pessoa
não se traduzem, e "Fintech Kobo" virando "Kobo Fintech Company" estraga a busca do
recrutador. Cargo, resumo, bullets e curso, sim.

## What Changes

- **Tradução do conteúdo do currículo pela IA**, para o idioma de saída marcado, aplicada ao
  currículo final — depois das sugestões marcadas e da ordem definida.
- **Campos traduzíveis e campos intocáveis, explicitamente separados.** Traduz: cargo do
  cabeçalho, resumo, cargo de cada experiência, bullets, curso e habilidades. **Não traduz**:
  nome da pessoa, contato, nome da empresa, nome da instituição e períodos.
- **A tradução preserva a estrutura.** Mesma quantidade de experiências, bullets e formações,
  mesmos ids, mesmas datas, mesma ordem. O que muda é só o texto dos campos traduzíveis.
- **Os números sobrevivem à tradução.** "reduzi a latência em 77%" traduzido continua com
  `77`. Número que aparece ou desaparece na travessia é defeito, e a verificação é do código,
  não da confiança no modelo.
- **Currículo já no idioma de saída não é traduzido.** A IA identifica o idioma do currículo
  na mesma chamada; quando ele coincide com o alvo, o conteúdo original é entregue como está
  e a resposta é descartada — nem uma reescrita acidental passa.
- **A data é renderizada no formato do idioma de saída.** Em português, `mm/aaaa`
  (`03/2022 – 12/2024`, fim aberto `atual`). Em inglês, mês abreviado por extenso
  (`Mar 2022 – Dec 2024`, fim aberto `Present`), que é a convenção de currículo americano.
  O modelo canônico não muda: ele guarda mês e ano estruturados, e isto é renderização.
  Período incompleto continua saindo com o texto original do arquivo, em qualquer idioma.
- **Falha de tradução é erro, não degradação.** Ao contrário da ordem do conteúdo, aqui não
  existe recurso: um arquivo marcado como "English" que sai em português é pior que arquivo
  nenhum. A saída daquele idioma falha e é reportada; as outras saídas não são afetadas.

**Fora de escopo:**

- **Gerar os arquivos** DOCX e PDF, montar o `.zip` e nomear as saídas — `export-docx-pdf`.
  Esta change entrega o currículo traduzido; a outra o escreve em disco.
- **A UI da etapa 04** (checkboxes de idioma e formato, rótulo do botão de download).
- **Traduzir a interface** — já existe em `lib/i18n`, e é coisa distinta: lá é dicionário
  fixo do app, aqui é conteúdo do usuário passando pela IA.
- **Traduzir na tela.** O currículo em revisão continua no idioma do usuário, sempre.
- **Idiomas além de PT-BR e EN.** O produto oferece dois.
- **Escolher o idioma por conta própria.** O app não decide que um currículo "fica melhor em
  inglês" — só produz o que o usuário marcou.

## Capabilities

### New Capabilities

- `export-translation`: tradução do conteúdo do currículo final para o idioma de saída
  marcado, preservando estrutura, ids, datas, números e os nomes próprios que não se
  traduzem, e renderização da data no formato daquele idioma.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo**: `lib/ai/translate-resume.ts` (a chamada e o prompt),
  `lib/export/translation.ts` (a verificação de estrutura e de números, pura) e
  `lib/export/dates.ts` (a renderização de período por idioma).
- **Código tocado**: nenhum. `formatPeriod` de `resume-model` continua como está e serve a
  saída em português; a de inglês é uma renderização nova ao lado dela, não uma alteração —
  o modelo canônico segue sem saber de idioma. `lib/i18n` também não muda: interface e
  conteúdo seguem separados, e os nomes de mês do currículo não são strings de interface.
- **Dependências**: nenhuma nova. Reutiliza o cliente Gemini e `extractNumbers` de
  `lib/suggestions/numbers.ts`, que já existe para sinalizar número não apoiado.
- **Custo**: uma chamada por idioma traduzido — no máximo uma, já que só há dois idiomas e um
  deles é o do currículo. DOCX e PDF do mesmo idioma reaproveitam a mesma tradução.
- **Contrato para a próxima change**: `export-docx-pdf` pede o currículo por idioma e recebe
  ou o traduzido, ou um erro nomeado para aquele idioma — nunca um currículo meio traduzido.
- **Consequência de produto registrada**: a tradução é conteúdo de máquina que entra no
  arquivo final sem passar pelo checklist, como a ordem. Cabe pelo mesmo motivo — o usuário
  pediu explicitamente aquela saída, marcando o idioma — e com uma diferença importante: aqui
  o texto muda de fato, então a verificação de estrutura e de números é o que impede a
  tradução de virar reescrita.
- **Referência de design**: `claude-design/README.md` (seção "6. Etapa 04 — Exportar"). Sem
  UI nesta change.
