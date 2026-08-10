## Context

Motivação em `proposal.md — Why`; requisitos em `specs/content-organization/spec.md`.

O mecanismo já existe: `resume-model` define `ResumeOrder` como permutação de ids,
`generateFinal` a aplica, e `applyOrder` recusa permutação parcial, repetida ou com id
desconhecido. Falta o produtor. Esta change é a metade que faltava, e por isso é pequena em
código e grande em decisão: ela define **como o app se comporta quando a IA erra ou cai**,
num ponto do fluxo onde o usuário já clicou em baixar.

## Goals / Non-Goals

**Goals:**

- A ordem do currículo final decidida pela IA, validada contra os ids do currículo.
- Uma exportação que não morre porque a organização falhou.
- Nenhuma heurística de ordenação disputando com a IA no caminho feliz.

**Non-Goals:**

- Aplicar a ordem (é de `resume-model`), ordenar seções ou formatar o documento (é do modelo
  padrão, em `export-docx-pdf`).
- Qualquer UI de ordenação. O usuário não ordena o currículo.
- Escolher o que entra: a IA ordena o que existe, não corta experiência nem bullet.

## Decisions

**Falha de organização degrada, não aborta.** É exceção deliberada ao padrão do projeto — em
`resume-import` e nas sugestões, falha de IA é erro que sobe. A diferença é o que está em
jogo: lá, sem a IA não há currículo nenhum; aqui já existe currículo, patches marcados e um
usuário que clicou em baixar. A ordem é a única parte da geração que não é essencial ao
documento — um currículo em ordem cronológica é um currículo correto, só menos curado.
Alternativa: propagar o erro e deixar a exportação falhar. Rejeitada porque troca uma perda
pequena e invisível por uma perda total e visível, no pior momento possível.

**O recurso cobre toda `AiError`, inclusive credencial ausente.** Poderia distinguir
"configuração errada" de "rede caiu" e falhar no primeiro caso. Não vale: sem credencial a
importação já teria falhado, e não existe currículo para exportar sem ela. Por chegar aqui,
o caminho já provou que a chave funciona; tratar o caso especial seria proteger contra um
estado que o fluxo não produz. A falha é registrada em log, sem conteúdo do currículo.

**Ordem inválida cai no mesmo recurso que a falha de rede.** Uma permutação incompleta é uma
resposta que não serve, tanto quanto uma resposta que não veio. Alternativa: pedir de novo à
IA. Rejeitada — dobra latência e custo no download por um resultado que a ordem cronológica
já entrega, e uma segunda tentativa com o mesmo prompt tende ao mesmo erro.

**A validação é nossa, antes de `generateFinal`.** `applyOrder` já recusaria a permutação
ruim, mas lançando `GenerationError` no meio da geração — tarde demais para trocar pela
ordem de recurso sem embrulhar a geração inteira num try. Validar antes deixa o recurso
explícito e a falha nomeada.

**O recurso não reordena bullets.** Ordenar experiência por data é convenção estabelecida;
ordenar bullets exige julgar qual entrega é mais forte, que é exatamente o julgamento que
delegamos à IA. Sem ela, a escolha honesta é conservar a ordem em que estão. Alternativa:
bullet mais longo primeiro, ou o que tem número primeiro. Rejeitada: é heurística disfarçada
de critério, e das piores — premiaria o bullet mais prolixo.

**Experiência em curso vem antes de tudo.** `comparePeriodStart` já ordena por início, mas o
fim aberto é o sinal de "é o meu emprego atual", e é o primeiro que qualquer leitor procura.
Um estágio iniciado depois não passa à frente do emprego atual só por ter começado mais
tarde.

**Período incompleto ordena pelo ano que tem.** Nenhum mês é assumido no recurso — assumir é
papel de `suggestions-dates`, que faz isso à vista e com aviso. Aqui, ordenar por ano é
suficiente e não inventa nada.

**A resposta da IA é só ids.** O `responseSchema` pede listas de identificadores e nada mais;
qualquer texto que venha junto é ignorado pelo Zod na volta. É a mesma trava do `verify.ts`
da importação, no outro momento: a IA organiza, não reescreve. Sem isso, a geração viraria a
porta dos fundos por onde conteúdo não marcado entraria no currículo.

## Risks / Trade-offs

- **A ordem é a única decisão da IA que entra no currículo final sem passar pelo checklist.**
  → Aceitável porque ela não cria nem altera conteúdo: move o que o usuário escreveu, e o
  schema de resposta impede que venha texto junto. O limite fica registrado: se algum
  requisito futuro quiser que a IA edite na geração, ele viola a regra da marcação.
- **A degradação é silenciosa** — o usuário baixa um currículo cronológico sem saber que a
  curadoria não aconteceu. → Assumido. Avisar exigiria uma tela de erro no meio do download
  para um resultado que continua correto. Se a etapa 04 vier a mostrar esse aviso, é decisão
  de `export-docx-pdf`, com o dado que esta change registra em log.
- **Uma ordem ruim da IA é indistinguível de uma boa para o código.** Permutação válida é
  aceita mesmo que a escolha seja péssima. → Não há como verificar sem recriar o julgamento
  que delegamos. O usuário vê o resultado no arquivo baixado.
- **Mais uma chamada no caminho do download**, somada às da revisão. → Acontece uma vez, e
  `export-docx-pdf` reutiliza a mesma ordem nas quatro saídas possíveis: dois arquivos do
  mesmo currículo com ordens diferentes seriam um defeito visível.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
