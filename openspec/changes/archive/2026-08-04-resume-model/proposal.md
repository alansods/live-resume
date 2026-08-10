## Why

Todas as outras capabilities do Currículo Vivo dependem de uma mesma estrutura: o
importador produz um currículo, a IA do Gemini o lê para sugerir melhorias e definir a
ordem do conteúdo, a etapa 3 ancora marcador numerado e cartão ao mesmo trecho, e o
exportador o percorre. Sem esse contrato definido primeiro, cada capability inventa a sua
forma e o `path` que liga sugestão a trecho deixa de ser confiável. É a primeira change
porque é a única sem dependências.

## What Changes

- Define o **modelo canônico do currículo**: cabeçalho (nome, cargo, contato), resumo,
  experiências (empresa, cargo, período, bullets), formação (curso, instituição, período)
  e habilidades. **Um único idioma** — o do usuário.
- Dá **identidade estável a cada item e bullet**: um id opaco, atribuído na criação e
  nunca reaproveitado. É o que permite à IA reordenar o conteúdo sem invalidar sugestões
  já ancoradas.
- Define os **paths de trecho por id**, não por posição: `summary`, `skills`,
  `jobs.<jobId>.period`, `jobs.<jobId>.bullets.<bulletId>`, `education.<eduId>.period`.
  Um path resolve exatamente um trecho; resolver path inexistente é erro explícito.
- Define a **geração do currículo final** como a única transformação do modelo: uma
  operação imutável que recebe o currículo importado, o conjunto de sugestões que o usuário
  marcou e a ordem que a IA definiu, e produz o currículo a exportar. Durante a revisão
  nada é aplicado e nada é reordenado — a sugestão é item de checklist, não edição, e o
  preview é o currículo importado como veio. Não há aplicação incremental, reversão nem
  comparação antes/depois.
- Define a **normalização de período** com **mês e ano obrigatórios** (`mm/aaaa`),
  incluindo o estado "incompleto" para período importado sem mês, que o usuário precisa
  completar.
- Define **serialização e desserialização** com validação de esquema, para atravessar a
  fronteira cliente/servidor — inclusive nas idas e voltas ao Gemini — sem perder tipo nem
  identidade de trecho.
- Define o **registro de origem** de cada trecho (importado, digitado pelo usuário,
  proposto pela IA e confirmado) e fixa que **a marcação do usuário é a única porta de
  entrada**: texto gerado pela IA nunca substitui o original por conta própria. A IA pode
  inventar conteúdo dentro da sugestão — é o que a torna uma sugestão de melhoria —, mas a
  substituição depende do checklist.

**Fora de escopo** (cada um é a sua própria change):
- Ler DOCX/PDF e preencher o modelo — `resume-import`.
- Falar com o Gemini: cliente, prompts, saída estruturada, verificação anti-invenção —
  `ai-analysis`.
- Gerar, pontuar ou classificar sugestões — `suggestions-metrics`, `suggestions-dates`,
  `suggestions-ats`.
- **Decidir** a ordem do conteúdo — `content-organization`, que pede a ordem ao Gemini na
  hora de gerar. Aqui existe apenas a aplicação de uma ordem recebida.
- Qualquer UI — `suggestion-review-ui`, `update-intake`, `app-shell-navigation`.
- Traduzir o currículo — `export-translation`, e só na exportação.
- Gerar DOCX/PDF — `export-docx-pdf`.

## Capabilities

### New Capabilities
- `resume-model`: estrutura canônica do currículo em um idioma, ids estáveis por item,
  paths de trecho por id, aplicação de ordem, aplicação imutável de patches, períodos com
  mês e ano obrigatórios, registro de origem e serialização validada.

### Modified Capabilities

Nenhuma — é a primeira capability do projeto e `openspec/specs/` está vazio.

## Impact

- **Código novo**: `lib/resume/` (esquema, ids, paths, ordem, patches, períodos,
  serialização) e `types/` derivados dos schemas Zod. Nenhum arquivo existente é
  modificado — o repo ainda não tem código de aplicação.
- **Dependências**: introduz `zod`. Como esta é a primeira change com código, ela também
  inicializa o projeto Next.js + TypeScript strict + Tailwind e a suíte Vitest, sem tocar
  em UI e sem introduzir ainda o SDK do Gemini (`@google/genai` entra em `ai-analysis`).
- **Contrato para as próximas changes**: `resume-import` passa a ter um alvo definido;
  `ai-analysis` passa a ter uma forma estável para serializar ao Gemini e para validar a
  resposta contra; as capabilities de sugestão emitem `path` + texto proposto contra este
  modelo; `content-organization` aplica ordem por ids; `export-*` percorrem esta
  estrutura.
- **Divergências deliberadas do handoff**, decididas pelo usuário e registradas aqui
  porque contradizem `claude-design/README.md`:
  - o handoff descreve a etapa 3 como **edição do preview** — "Aplicar" altera o currículo
    na hora, "Desfazer" reverte, o trecho fica marcado como atualizado no papel. Sai: a
    sugestão vira **item de checklist**, o preview mostra o **currículo importado** como
    veio, com os marcadores indicando onde cada sugestão incide, e o currículo final é
    gerado do conjunto marcado. Sem desfazer — desmarcar é a única reversão, e ela é
    anterior a qualquer geração. Sem antes/depois no papel do currículo: o texto proposto
    aparece só dentro do cartão da sugestão.
  - o handoff descreve par **PT/EN sincronizado** com re-render do currículo ao trocar o
    idioma. Sai: o toggle de idioma traduz só a interface, e a tradução do currículo é
    exclusiva da exportação.
  - o handoff mostra períodos como `2018 - 2019`. Toda data passa a exigir mês e ano; um
    período assim é importado como incompleto e completado pelo usuário.
- **Referência de design**: `claude-design/README.md`, seções "Backend / dados" e "Estado
  necessário". Sem referência a `.dc.html` — esta change não tem UI.
