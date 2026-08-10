## Context

Motivação em `proposal.md — Why`; requisitos em `specs/suggestions-ats/spec.md`.

Três coisas moldam o escopo:

1. **A geração já resolve a forma.** `generateFinal` reemite o currículo no modelo padrão —
   coluna única, sem tabela, sem caixa de texto, `mm/aaaa`, PDF selecionável — qualquer que
   fosse o layout importado. Sugerir isso seria pedir ao usuário que autorizasse o que vai
   acontecer de qualquer jeito.
2. **Sobra o que só o conteúdo resolve**: o resumo e as habilidades. São exatamente os dois
   trechos endereçáveis que `suggestions-metrics` (bullets) e `suggestions-dates` (períodos)
   não tocam, e os dois onde o parser mais perde informação.
3. **A pontuação é derivada, não medida.** Ela existe na etapa 03 como leitura do progresso.
   A pergunta de desenho é de onde ela sai — e a resposta escolhida evita que o app crie um
   segundo juízo sobre o currículo, concorrendo com o da IA.

## Goals / Non-Goals

**Goals:**

- Duas sugestões de alto valor, ancoradas em `summary` e `skills`, no modelo comum.
- Uma pontuação determinística, explicável e que responde à marcação do usuário.
- Nenhuma heurística própria disputando com a IA a leitura do currículo.

**Non-Goals:**

- Reformatação estrutural (é da geração), sugestão em bullet ou período (são das outras duas
  changes), palavra-chave de vaga específica (não existe descrição de vaga no fluxo).
- Renderizar cartões, filtro por tipo ou a barra de 10 segmentos — `suggestion-review-ui`.
- Bloquear exportação por nota baixa. A pontuação informa; nunca impede.

## Decisions

**Com IA, ao contrário de `suggestions-dates`.** "Este resumo carrega palavra-chave?" é
julgamento sobre linguagem, e a variedade de profissão é o argumento inteiro: o resumo de um
enfermeiro, de um advogado e de um soldador não têm forma em comum, e qualquer lista de
adjetivos proibidos seria uma lista de currículos de tecnologia. Alternativa: regex sobre
`★`, `%` e barras para as habilidades, e dicionário de adjetivos para o resumo. Rejeitada
pela metade do resumo; e adotada só para habilidades, o caso mecânico, seria pior que
uniformizar — duas rotas de detecção para duas sugestões que aparecem no mesmo cartão. Uma
chamada, dois trechos.

**A chamada é uma só, com resumo e habilidades juntos.** São no máximo dois trechos: mandar
os dois no mesmo prompt custa menos que duas chamadas e deixa a IA ver o resumo ao propor a
lista de habilidades. `RawAtsSuggestionSchema` restringe `kind` a `ats` e `path` a `summary`
ou `skills`; o que vier fora disso é descartado por `validateSuggestions`, que já existe.

**A pontuação sai das sugestões, não de uma análise própria do currículo.** Fórmula:

```
pontuação = 100 − Σ peso(sugestão não marcada)      piso 0
peso: ats 12 · dates 8 · metric 4 · verb 3
```

O conjunto de sugestões **é** a lista de defeitos que o app conhece; marcar uma é resolver
aquele defeito. Alternativa considerada e rejeitada: calcular uma base analisando o currículo
diretamente (o `52` fixo do protótipo, ou uma versão dele derivada do texto). Ela obrigaria o
código a julgar por conta própria se o resumo é bom — exatamente a heurística que o projeto
proíbe, e que discordaria da IA na primeira divergência: um currículo sem sugestão de resumo
mas com base baixa mostraria uma nota que nenhum cartão explica. Na fórmula escolhida, cada
ponto que falta tem um cartão correspondente na tela.

**Currículo sem defeito pontua 100 desde o início**, e não é bug: se o app não tem nada a
apontar, não há por que exibir uma nota que insinua um problema que ele não sabe nomear.

**Os pesos ordenam por onde o dano acontece.** `ats` pesa mais porque o defeito é de
indexação — o texto não chega a ser lido; `dates` vem depois porque faz o parser calcular
tempo de experiência errado; `metric` e `verb` custam menos porque o texto é lido, só é
fraco. Os números são convenção, não medida: nenhuma fonte pública dá peso real de ATS, e
inventar precisão seria pior que assumir a convenção.

**Piso em 0, e a monotonia estrita vale acima dele.** Um currículo com mais de ~26 sugestões
satura; marcar ali não move a nota. É o extremo previsto no cenário, e preferível a
normalizar a soma pelo total — normalizar faria a nota de um currículo *piorar* quando a IA
encontrasse mais um problema no mesmo texto, o que confunde mais do que o piso.

**A pontuação é função pura, e recebe as sugestões de todos os tipos.** Assinatura:
`atsScore(suggestions: Suggestion[], selected: Set<string>): number`. Não recebe o currículo:
ele não entra na conta. `suggestion-review-ui` a chama a cada mudança de checkbox — é
aritmética sobre um array pequeno, sem custo que justifique memoização.

**Duas ações novas no enum compartilhado**: `rewrite` (resumo) e `toText` (habilidades). O
protótipo mostra os rótulos "Reescrever" e "Converter em texto"; rótulo é interface e vem do
i18n, o enum guarda só o identificador, como já acontece com `apply`, `fixDate` e `normalize`.

## Risks / Trade-offs

- **A reescrita do resumo é o texto mais autoral do currículo**, e uma proposta de IA nele é
  mais intrusiva que numa lista de habilidades. → Vale a regra geral — nada entra sem a
  marcação — e `unsupportedNumbers` sinaliza o "8 anos de experiência" que a IA escreveu
  fluentemente sem que o material sustente. Sem isso, uma reescrita boa esconderia um fato
  que o usuário nunca afirmou.
- **A conversão de habilidades pode perder informação que o usuário queria dar**: quem
  escreveu "Inglês — fluente" perde o "fluente" se a IA tratar o rótulo como indicador de
  nível. → O requisito manda preservar as competências e descartar só o indicador, e o caso
  vira teste. Na dúvida, o usuário compara os dois textos no cartão e ignora a sugestão.
- **Os pesos da pontuação são convenção.** → Assumido explicitamente acima. Ficam num único
  ponto do módulo, legíveis, para mudar sem caçar constante espalhada.
- **A nota pode subir sem o currículo melhorar de fato**, já que ela mede sugestões
  resolvidas, não qualidade absoluta. → É o que a etapa 03 precisa comunicar: progresso sobre
  o que o app apontou. A nota nunca aparece sozinha — vem com a contagem de pendências.
- **Mais uma chamada de IA na revisão**, somada à de métricas. → São dois trechos, prompt
  curto; e o caminho já existe, sem infraestrutura nova.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
