## Why

O currículo já é importado, estruturado e atualizado — mas nada ainda o **melhora**. As
sugestões são o que transforma o produto de organizador em ferramenta de escrita, e a de
métrica é a mais valiosa: bullet sem número é o defeito mais comum de currículo e o que
mais custa em processo seletivo, porque recrutador e ATS pontuam resultado, não esforço.

É a primeira das três changes de sugestão, então traz também **o modelo de sugestão** que
`suggestions-dates` e `suggestions-ats` vão reutilizar, do mesmo modo que o cliente Gemini
nasceu em `resume-import`.

## What Changes

- Define o **modelo de sugestão**: id, tipo, path do trecho, local em linguagem de usuário,
  título, texto atual, texto proposto, justificativa e rótulo da ação — a forma que o
  cartão da etapa 03 vai exibir.
- Gera sugestões de **métrica ausente**: bullet que descreve atividade sem resultado
  mensurável.
- Gera sugestões de **verbo genérico**: bullet que começa por "responsável por",
  "participei de", "trabalhei com" e afins, que descrevem cargo em vez de entrega.
- **Ancora cada sugestão a um path** de `resume-model` e valida que ele resolve. Sugestão
  com path inválido é descartada, não exibida.
- **No máximo uma sugestão por trecho.** A geração do currículo final recusa dois patches
  no mesmo path, então duas propostas para o mesmo bullet seriam um conflito garantido mais
  adiante — o filtro acontece aqui.
- **Marca os números que a IA não conseguiu apoiar** no conteúdo do usuário. A proposta
  pode conter número novo — é o que a torna uma sugestão —, mas o que não aparece no
  currículo importado nem no que o usuário digitou vem sinalizado, para o cartão da etapa
  03 pedir confirmação em vez de deixar passar como fato.
- **Nada é aplicado.** A sugestão é item de checklist; quem aplica é a geração, e só o que
  o usuário marcar.
- Expõe a operação como **route handler**, reutilizando o cliente Gemini.

**Fora de escopo** (cada um é a sua própria change):
- Sugestões de data e de regras de ATS — `suggestions-dates`, `suggestions-ats`.
- A tela da etapa 03: papel do currículo, marcadores numerados, tooltips, cartões,
  checklist e score — `suggestion-review-ui`.
- Aplicar sugestão. Já existe em `resume-model` e continua sendo acionado só pela geração.
- Decidir a ordem do conteúdo — `content-organization`.
- Traduzir a sugestão. O conteúdo fica no idioma do currículo; tradução é da exportação.

## Capabilities

### New Capabilities
- `suggestions-metrics`: modelo de sugestão compartilhado, geração de propostas de métrica
  ausente e de verbo genérico pela IA, ancoragem validada por path, unicidade por trecho e
  sinalização dos números não apoiados no conteúdo do usuário.

### Modified Capabilities

Nenhuma. `resume-model`, `resume-import` e `update-intake` são consumidas como estão.

## Impact

- **Código novo**: `lib/suggestions/` (modelo, validação, unicidade, números não apoiados),
  `lib/ai/suggest-metrics.ts` (prompt e saída estruturada) e um route handler em
  `app/api/suggestions/metrics/`.
- **Dependências**: nenhuma nova. Reutiliza `@google/genai` e o port de IA de
  `resume-import`.
- **Custo e latência**: mais uma chamada ao Gemini por currículo. Testes continuam sem
  tocar a API real, com respostas gravadas.
- **Contrato para as próximas changes**: `suggestions-dates` e `suggestions-ats` produzem
  sugestões no mesmo modelo; `suggestion-review-ui` consome a lista e monta o mapa
  `path → sugestão`; a geração recebe os patches das sugestões marcadas.
- **Referência de design**: `claude-design/README.md` (seção "Etapa 03 — Revisar", para
  saber que campos o cartão exibe) e o array `SUGGESTIONS` de
  `claude-design/CurriculoVivoApp.dc.html`, como referência da forma do dado. Sem UI nesta
  change.
- **Divergência deliberada do handoff**: o protótipo traz `cta` variável por tipo
  ("Aplicar" / "Corrigir data" / "Normalizar") e o campo `after` bilíngue. O `cta` fica; o
  par de idiomas sai, porque o currículo é monolíngue.
