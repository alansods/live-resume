## Context

Motivação em `proposal.md — Why`; requisitos em `specs/export-translation/spec.md`.

A tradução é o segundo — e último — ponto em que conteúdo de máquina entra no currículo final
sem passar pelo checklist. O primeiro foi a ordem (`content-organization`), e ela era barata
de justificar: mover itens não cria texto. Aqui o texto muda de fato. O que sustenta a
decisão é outra coisa: o usuário marcou aquele idioma na etapa 04, e essa marcação é um
pedido explícito por conteúdo que ele não escreveu.

Por isso o desenho gasta a maior parte do esforço na **verificação**, não na chamada.

## Goals / Non-Goals

**Goals:**

- Uma tradução que não pode virar reescrita sem o código perceber.
- Nomes próprios intactos: "Fintech Kobo" traduzido estraga a busca do recrutador.
- Data na convenção do idioma de saída, sem contaminar o modelo canônico.

**Non-Goals:**

- Gerar arquivo, montar `.zip`, nomear saída — `export-docx-pdf`.
- Traduzir a interface (`lib/i18n` já faz, e é outra coisa) ou traduzir em tela.
- Idiomas além de PT-BR e EN; escolher idioma pelo usuário.

## Decisions

**A verificação é de estrutura e de números, não de texto.** Na importação, `verify.ts`
compara o texto devolvido com o extraído — ali qualquer diferença é reescrita. Aqui o texto
*deve* diferir, então essa trava não existe. O que sobra, e é bastante: mesma contagem de
itens, mesmos ids, mesma ordem, e o mesmo conjunto de números em cada trecho. Um "77%" que
volta "70%" é um dado falso no currículo de alguém, e nenhuma confiança no modelo substitui a
conferência.

**Campos traduzíveis e intocáveis são separados no schema da resposta, não por instrução.** A
IA nem recebe a chance de devolver `company` ou `contact`: eles não existem no
`responseSchema`, e o currículo traduzido é montado campo a campo a partir do original. O
prompt reforça, mas quem garante é a forma. Alternativa: pedir o currículo inteiro traduzido
e comparar o que não podia mudar. Rejeitada — mais tokens, mais superfície de erro, e uma
verificação a mais para escrever quando dava para tornar o erro impossível.

**Idioma coincidente descarta a resposta inteira.** Detectar o idioma antes custaria uma
segunda chamada; detectar por heurística (contar palavras comuns) é o tipo de regra que o
projeto proíbe. Então o idioma vem junto da tradução, e quando ele é igual ao alvo o
resultado é o currículo de entrada, byte a byte — a resposta é jogada fora sem ser lida. O
caso "já está em português" não corre risco de voltar levemente reescrito.

**Falha é erro, ao contrário da ordem.** `content-organization` degrada para cronológica
porque um currículo em ordem cronológica é um currículo correto. Aqui não há equivalente: o
usuário marcou "English", e entregar o português nesse arquivo é um defeito que ele só
descobre depois de mandar para a vaga. Falhar é a única opção honesta. A falha é por idioma —
as outras saídas não são afetadas, o que é responsabilidade de `export-docx-pdf`.

**Texto traduzido registra origem proposta e confirmada.** É conteúdo de máquina, e o
invariante manda que ele continue distinguível do que o usuário escreveu. "Confirmado" porque
a marcação do idioma na etapa 04 é a confirmação — o mesmo papel que o checkbox da sugestão
cumpre para o texto proposto. Alternativa: conservar a origem do trecho de origem (importado
continua importado). Rejeitada: apagaria o rastro de que aquele texto passou por um modelo.

**A data por idioma fica em `lib/export/dates.ts`, fora de `resume-model`.** `formatPeriod`
não muda: ele serve a saída em português e continua sem saber o que é idioma. Alternativa:
dar um parâmetro de locale a `formatPeriod`. Rejeitada porque contamina a camada mais limpa
do projeto com uma preocupação de apresentação — e o modelo canônico é justamente o que não
pode saber de idioma, já que o currículo existe num só.

**Os nomes de mês não entram em `lib/i18n`.** `Mar`, `Dec` e `Present` aparecem *dentro do
currículo do usuário*, não na interface do app. O dicionário cobre só o texto do app, e essa
fronteira é o que impede a confusão que o produto proíbe desde o começo.

## Risks / Trade-offs

- **A verificação não detecta tradução ruim, só tradução infiel na estrutura e nos números.**
  Um bullet traduzido com sentido trocado passa. → Não há como verificar sentido sem outro
  modelo julgando o primeiro. O usuário lê o arquivo antes de enviar, e o texto de origem
  continua no arquivo em português.
- **Nome próprio é distinguido pelo campo, não pelo conteúdo.** Uma empresa chamada
  "Consultoria Financeira" não é traduzida — correto —, mas um curso chamado "MBA" também
  atravessa por estar num campo traduzível e ser igual nos dois idiomas. → O corte por campo
  é o único critério estável; por conteúdo seria adivinhação.
- **Uma chamada a mais no download**, somada à da organização. → No máximo uma tradução por
  exportação: só há dois idiomas e um deles é o do currículo. DOCX e PDF do mesmo idioma
  reaproveitam o resultado.
- **Mês abreviado em inglês é convenção, não padrão formal.** Alguns ATS preferem numérico.
  → Decisão do usuário, registrada no `config.yaml` como invariante; a renderização fica num
  único módulo, fácil de trocar se a evidência mudar.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
