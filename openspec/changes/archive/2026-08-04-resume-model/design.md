## Context

Repositório sem código de aplicação: esta é a primeira change com implementação, então ela
também inicializa o projeto. Motivação em `proposal.md — Why`; requisitos em
`specs/resume-model/spec.md`.

Três restrições externas moldam o desenho, e as três vieram de decisões do usuário que
contradizem partes do handoff (registradas em `proposal.md — Impact`):

1. **A IA define a ordem do conteúdo, na geração.** O usuário nunca ordena o currículo, e o
   currículo em revisão conserva a ordem do arquivo importado. Isso significa que a posição
   de um item muda entre o que a revisão exibe e o que é exportado, e que a âncora entre
   sugestão e trecho não pode depender dela.
2. **A revisão não edita o currículo.** Sugestão é item de checklist: o preview mostra o
   currículo importado como veio, com os marcadores numerados indicando onde cada sugestão
   incide, e o currículo final é gerado do conjunto marcado. Não existe desfazer porque não
   existe aplicação a desfazer, e não existe antes/depois no papel do currículo — o texto
   proposto vive no cartão da sugestão.
3. **O currículo é monolíngue.** O toggle da top bar traduz a interface; o conteúdo do
   usuário só é traduzido na exportação, se ele marcar essa saída.

## Goals / Non-Goals

**Goals:**
- Um único módulo `lib/resume/` de funções puras, sem I/O, consumível igualmente por route
  handler (inclusive nas idas ao Gemini) e por componente cliente.
- Tipos derivados de um só lugar, para que a fronteira HTTP e os tipos de compilação não
  possam divergir.
- Falhas de path, de ordem e de validação altas e explícitas, nunca degradadas em
  `undefined`.
- Uma estrutura que aguente a IA reordenar o conteúdo na geração sem invalidar as
  sugestões que o usuário ancorou durante a revisão.

**Non-Goals:**
- Desfazer, histórico de edição, versionamento ou qualquer diff entre currículos —
  inclusive comparar o currículo de origem com o final.
- Decidir ordem. A geração aplica uma ordem recebida; quem a decide é
  `content-organization` com o Gemini.
- Qualquer estrutura de tradução ou par de idiomas dentro do currículo.
- Falar com o Gemini: cliente, prompt e validação de resposta são de `ai-analysis`.
- Persistência: nada é gravado em disco ou banco.

## Decisions

**Zod como fonte única de tipo.** Os schemas ficam em `lib/resume/schema.ts` e os tipos
saem por `z.infer`. Alternativa considerada: interfaces TypeScript com validadores à mão —
rejeitada porque duplica a definição e deixa a validação de fronteira livre para divergir
do tipo. Zod já é a escolha de fronteira do projeto e vai ser reusado em `ai-analysis` para
validar o que o Gemini devolve, então a decisão paga duas vezes.

**Id opaco por item, e path construído a partir dele.** Cada experiência, bullet, formação
e habilidade carrega um id; o path é `jobs.<jobId>.bullets.<bulletId>`, não
`jobs.0.bullets.1`. Alternativa considerada: manter índices e reancorar as sugestões toda
vez que a ordem mudar. Rejeitada porque a reancoragem seria uma operação corretiva
executada em cima de sugestões já exibidas — exatamente o tipo de estado que dá marcador
apontando para o trecho errado na etapa 3. Com id, reordenar é uma permutação da lista e
nenhum path muda. Custo aceito: paths ficam mais longos e ilegíveis em log e em fixture,
e o handoff exemplifica paths por índice — este desenho diverge dele de propósito.

**Ordem como permutação validada, não como campo de posição por item.** A geração recebe a
sequência completa de ids e falha se ela omitir, repetir ou inventar um id.
Alternativa: um campo `order: number` em cada item. Rejeitada porque admite estados
inconsistentes (dois itens com a mesma posição, buracos na sequência) que teriam de ser
tolerados em algum lugar. Exigir a permutação completa faz uma resposta truncada da IA
falhar imediatamente, em vez de reordenar metade do currículo em silêncio.

**Uma só transformação: geração.** A operação exposta é
`generateFinal(resume, patches, order)`, que aplica de uma vez o conjunto de patches
marcados e a ordem que a IA devolveu; não existe `applyPatch` nem `applyOrder` público que
altere o currículo em revisão. Substituição e reordenação acontecem no mesmo ponto porque
acontecem no mesmo momento — a geração — e mantê-las separadas exporia um estado
intermediário (currículo reordenado mas sem patches) que nenhuma tela mostra. Alternativa: manter a aplicação
trecho a trecho e deixar a seleção só na UI. Rejeitada porque reintroduziria o estado que a
decisão do usuário elimina — um currículo "meio aplicado" que precisa de desfazer para
voltar. Com geração em lote, o currículo de origem é imutável por construção durante toda a
revisão, e desmarcar é simplesmente não incluir o patch no conjunto. `applyPatch` continua
existindo como primitiva interna, não exportada.

**Conjunto de patches, não sequência.** `generateFinal` recebe um conjunto e rejeita dois
patches no mesmo path em vez de deixar o último vencer. Alternativa: aplicar em ordem, com
o último sobrescrevendo. Rejeitada porque tornaria o resultado dependente da ordem de
iteração da UI — dois checkboxes marcados na ordem inversa produziriam currículos
diferentes. Rejeitar torna o conflito visível para quem o criou (as capabilities de
sugestão, que não devem emitir duas propostas concorrentes para o mesmo trecho sem que a UI
as trate como exclusivas).

**Sem valor anterior e sem marca de alteração no trecho.** O trecho guarda origem e
confirmação — não o texto que tinha antes, nem sinalização de "atualizado". Alternativa:
guardar o valor anterior "por via das dúvidas" e marcar o que mudou. Rejeitada por duas
razões: seria a metade de um desfazer que a regra de produto proíbe, e alimentaria
exatamente o antes/depois no papel do currículo que a decisão do usuário elimina. É também
desnecessário: o currículo de origem inteiro continua intacto ao lado do final. O texto
proposto que o cartão de sugestão exibe é do próprio cartão (`before`/`after`).

**Origem é metadado, não conteúdo.** O registro de origem sobrevive à geração porque é o
que torna verificável a regra de que conteúdo gerado pela IA não substitui o original sem
marcação, mas ele nunca é renderizado: o currículo final lido para exibição ou exportação
tem um texto só por trecho. Alternativa: descartar a origem na geração, já que o documento
exportado é texto puro. Rejeitada porque apagaria a evidência que a restrição de produto
exige.

**A fronteira da invenção é a sugestão, não o modelo.** `generateFinal` aplica o texto
proposto sem avaliar o mérito do que ele afirma — inclusive quando introduz uma métrica que
não constava do currículo importado. Isso não afrouxa a regra: a regra é sobre
**substituição sem consentimento**, e o consentimento é o checklist. Alternativa: verificar
no modelo se o texto proposto introduz número ou fato ausente do original e descartá-lo.
Rejeitada porque tornaria impossível a própria feature — uma sugestão de melhoria que só
pode repetir o que já estava escrito não melhora nada. O que o modelo garante é o
complemento disso: trecho não marcado é intocado, e trecho substituído fica registrado como
proposto pela máquina.

**Metadados dentro do valor, não em mapas paralelos.** Origem, confirmação e marca de
atualizado moram no mesmo objeto do texto. Alternativa: mapas `path → metadado` ao lado do
currículo. Rejeitada porque exigiria manter estruturas alinhadas a cada patch e porque os
metadados precisam sobreviver à serialização junto com o texto que descrevem — inclusive na
ida ao Gemini, onde o que importa é justamente distinguir o que é dado do usuário do que é
proposta da máquina.

**Path como string, parseada para um acessador tipado.** `parsePath` transforma a string
numa união discriminada (`summary` | `skills` | `jobPeriod` | `jobBullet` |
`educationPeriod`) e falha com erro nomeado quando a forma não existe; `resolvePath` falha
de novo quando o id não existe. Alternativa: acesso genérico estilo `lodash.get`.
Rejeitada porque aceitaria qualquer caminho e devolveria `undefined` em vez de erro. A
string continua sendo a forma de transporte porque é o que a IA devolve em cada sugestão e
o que a UI usa como âncora.

**Patch imutável por reconstrução direcionada.** `applyPatch` reconstrói apenas o caminho
até o trecho alterado, compartilhando o resto por referência; sem biblioteca de
imutabilidade. Alternativa: Immer — dependência desnecessária num documento pequeno com um
número fechado de formas de trecho.

**Período exige mês e ano; o que falta é estado, não default.** O período é
`{ start, end, raw, complete }`, com `end` podendo ser aberto. Entrada sem mês vira
`complete: false` com o `raw` intacto. Alternativa: inferir janeiro quando só há ano.
Rejeitada pela regra de datas: toda data tem mês e ano, e o mês que falta é **completado
pelo usuário**, não escolhido pelo sistema — `01/2018` derivado de `2018` seria um mês que
ninguém informou. Isso é independente de a IA poder propor conteúdo novo: a IA propõe e o
usuário marca; aqui não haveria proposta nem marcação, só um default silencioso. A
consequência é que a comparação de períodos precisa lidar com incompletude explicitamente
(sinaliza impossibilidade em vez de assumir mês), e que `suggestions-dates` tem um insumo
concreto: a lista de períodos incompletos a completar com o usuário.

**Formatação `mm/aaaa` fica no modelo; tradução não.** `formatPeriod` produz o texto de
data, e o rótulo de fim aberto vem do i18n da interface — que é a única coisa que o toggle
de idioma afeta. Traduzir conteúdo é `export-translation`, na exportação.

**Inicialização do projeto dentro desta change.** Next.js (App Router) + TypeScript strict
+ Tailwind + Vitest entram aqui, sem nenhuma rota, componente ou estilo além do
scaffolding mínimo. `@google/genai` não entra ainda — não há chamada de IA nesta change.
Alternativa: uma change `project-setup` separada — rejeitada porque seria uma change sem
comportamento observável.

## Risks / Trade-offs

- **Ids tornam fixtures e mensagens de erro menos legíveis.** → Ids são gerados por uma
  função única do módulo, e as fixtures usam ids fixos e falantes (`job-kobo-lead`) em vez
  de aleatórios, para que os testes e os logs continuem legíveis.
- **A IA pode devolver uma ordem parcial ou com id inventado.** → `applyOrder` rejeita a
  permutação inteira nesse caso. O tratamento — repetir a chamada, ou seguir com a ordem
  anterior — é decisão de `content-organization`, que é quem fala com o Gemini.
- **O preview não mostra o efeito das sugestões nem a ordem final.** → É a decisão do
  usuário, e o desenho a sustenta: o papel do currículo é o arquivo importado, e o que o
  usuário vê ali não muda ao marcar itens. O marcador numerado diz onde a sugestão incide e
  o cartão diz o quê; o score de ATS projetado sobre o conjunto marcado é o único
  indicador que se move. Sem diff, sem trecho riscado no papel, sem modo "ver como vai
  ficar".
- **"Marcar todas" não tem risco**, porque nada é aplicado: desmarcar resolve, e a geração
  só acontece na exportação.
- **A ordem do exportado difere da ordem do preview.** → Consequência inevitável de a IA
  ordenar na geração. Cabe a `content-organization` e a `suggestion-review-ui` decidir se e
  como avisar o usuário; o modelo apenas não finge que a ordem do preview é definitiva.
- **Erro em vez de valor vazio ao resolver path deixa a UI quebrável por uma sugestão com
  path inválido.** → Validar a sugestão contra o currículo é responsabilidade de
  `ai-analysis` e das capabilities de sugestão; aqui a falha é explícita de propósito, para
  aparecer no teste em vez de virar um marcador silenciosamente ausente na etapa 3.
- **O modelo monolíngue empurra toda a complexidade de tradução para a exportação.** →
  Aceito: é o que a decisão do usuário determina, e concentra tradução num só lugar em vez
  de espalhá-la por todo o modelo.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
