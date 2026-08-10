## Context

Três capabilities arquivadas: o currículo é importado, estruturado pela IA, verificado e
atualizável pelo usuário. Nada ainda o melhora. Motivação em `proposal.md — Why`;
requisitos em `specs/suggestions-metrics/spec.md`.

Duas restrições já estabelecidas moldam esta change:

1. **A geração recusa dois patches no mesmo trecho** (`resume-model`). Duas sugestões para
   o mesmo bullet seriam um conflito garantido lá na frente — o filtro tem de acontecer
   aqui, na origem.
2. **Sugestão é item de checklist, não edição.** Nada é aplicado; o currículo sai desta
   operação exatamente como entrou.

E uma tensão real: a regra do projeto permite que a IA invente conteúdo **dentro da
sugestão** — é o que a torna uma sugestão de melhoria. Mas o handoff é explícito de que o
app "propõe a métrica provável, nunca inventa dado sozinho", e a própria justificativa do
protótipo diz "os números vieram do que você escreveu — confirme antes de aceitar". As
duas coisas só coexistem se o número inventado for **visível como tal**.

## Goals / Non-Goals

**Goals:**
- Um modelo de sugestão que sirva às três changes de sugestão, não só a esta.
- Nenhuma sugestão inválida chegando à tela: path que não resolve é descartado na origem.
- Tornar auditável a diferença entre número que veio do usuário e número que a IA propôs.

**Non-Goals:**
- Datas e regras de ATS.
- Qualquer interface.
- Aplicar sugestão, ou decidir ordem de conteúdo.
- Julgar se a métrica proposta é *verdadeira*. Isso é do usuário; o sistema só marca o que
  não conseguiu apoiar.

## Decisions

**Números não apoiados são sinalizados, não bloqueados.** A sugestão declara quais números
do texto proposto não aparecem no material do usuário — currículo importado mais o que ele
digitou na etapa 02. Alternativas consideradas: (a) proibir número inédito, que
inviabilizaria a feature, já que quase toda melhoria de métrica introduz um valor; (b)
ignorar o problema, que faria o usuário aceitar um "77%" fabricado sem perceber. A
sinalização é o meio-termo verificável: a IA propõe, o sistema aponta o que não confere, e
a etapa 03 pede confirmação. É também o que o handoff descreve.

**A comparação de números é por token numérico, não por semântica.** Extraímos os números
do texto proposto e verificamos se cada um aparece no material do usuário, normalizando
separador de milhar e decimal. Alternativa: pedir à IA que declare a origem de cada número.
Rejeitada porque a declaração viria do mesmo modelo que inventou o número — a verificação
tem de ser nossa. O custo é grosseria: "12 meses" no proposto casaria com um "12" que era
de outra coisa. Aceito, porque o erro é para o lado seguro (deixa de sinalizar algo que o
usuário talvez confirmasse de qualquer jeito) e porque um falso alarme constante treinaria
o usuário a ignorar o aviso.

**Unicidade por path resolvida por "primeira vence".** Quando a IA devolve duas propostas
para o mesmo trecho, ficamos com a primeira e descartamos as outras. Alternativa: expor as
duas como opções excludentes na tela. Rejeitada por enquanto — é decisão de
`suggestion-review-ui`, e o modelo continua permitindo isso depois, porque o filtro é uma
função separada da geração.

**Sugestão inválida é descartada, não é erro.** Path que não resolve some do conjunto e as
demais seguem. Alternativa: falhar a operação inteira, como fazemos na importação.
Rejeitada porque a natureza das duas é diferente: na importação, uma resposta ruim
corrompe o documento do usuário; aqui, ela só custa uma sugestão a menos numa lista de
sugestões. Falhar tudo por uma proposta malformada seria pior para quem usa.

**O modelo de sugestão nasce aqui, como o cliente Gemini nasceu na importação.** É a
primeira das três changes de sugestão; `lib/suggestions/` fica genérico por tipo desde o
começo, com o tipo como campo, não como estrutura separada.

**Currículo sem bullet não chama a IA.** Devolve lista vazia direto. Alternativa: chamar
sempre, por simplicidade. Rejeitada porque cada chamada custa dinheiro e latência, e uma
resposta para "não há nada a sugerir" é desperdício previsível.

## Risks / Trade-offs

- **A IA pode propor uma métrica plausível e falsa, e o usuário aceitá-la.** → É a
  consequência aceita da decisão de produto de deixar a IA gerar conteúdo. A mitigação é a
  sinalização e a confirmação na etapa 03; o risco residual é do usuário, que é quem
  assina o currículo.
- **Detecção de "bullet sem métrica" e de "verbo genérico" fica com a IA, não com regex.**
  → Consistente com a decisão de não usar heurística onde a variedade é grande. O custo é
  que a suíte não consegue afirmar que *todo* bullet sem número recebeu proposta — os
  testes verificam a forma, a ancoragem e as invariantes, com respostas gravadas.
- **Mais uma chamada de IA por currículo.** → Aceito. As três changes de sugestão poderiam
  virar uma chamada só; se latência incomodar, agrupá-las é uma otimização local, porque as
  três produzem o mesmo modelo.
- **"Primeira vence" pode descartar a melhor das duas propostas.** → Baixo impacto: as duas
  tratam do mesmo trecho e o usuário revisa a que ficou. Expor as duas continua possível
  depois.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
