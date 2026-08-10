## Context

Motivação em `proposal.md — Why`; requisitos em `specs/app-shell-navigation/spec.md`.

Dez capabilities produzem partes que nunca se encontraram. Esta change é o encontro, e o
trabalho é quase todo de encaixe: o estado do fluxo num ponto só, as etapas recebendo tudo
por props, e as três chamadas de rede que faltavam.

## Goals / Non-Goals

**Goals:**

- Um fluxo que vai do arquivo enviado ao arquivo baixado, sem etapa órfã.
- Etapas 02 e 03 consumidas **sem alteração** — se precisarem mudar, o encaixe está errado.
- Espera sempre nomeada: quatro chamadas de IA no caminho, e nenhuma tela parada em branco.

**Non-Goals:**

- A home; persistir progresso; refazer chamadas a cada navegação.
- Mudar o comportamento de qualquer etapa existente.

## Decisions

**O estado do fluxo mora no shell, e as etapas continuam burras.** `UpdateIntake` e
`SuggestionReview` já recebem tudo por props e não buscam nada — foi decisão das changes
delas, e é o que permite montá-las aqui sem tocar em nenhuma. O shell é o único lugar que
conhece `fetch`.

**Sugestões são pedidas ao entrar na revisão, uma vez.** Alternativa: pedir logo após a
importação, em paralelo com a etapa 02, escondendo a espera atrás do tempo de digitação.
Rejeitada por enquanto — o usuário pode acrescentar experiências na etapa 02, e sugerir antes
disso produziria sugestões para um currículo que ainda vai mudar. O custo é uma espera
visível ao entrar na etapa 03; se incomodar, a solução é pedir ao **sair** da etapa 02, e é
uma change própria.

**Navegar não descarta nada.** Currículo, itens digitados, sugestões e marcações vivem no
shell, então ir e voltar é troca de tela, não recomeço. Só o recarregar da página zera — não
há storage, por decisão de produto.

**A trava de avanço é só na etapa 01.** Sem currículo não existe fluxo. Nas outras não há
trava: um usuário pode passar pela etapa 02 sem digitar nada (é legítimo — talvez nada tenha
mudado) e pela 03 sem marcar nada (também é legítimo — a geração ainda reformata o
documento).

**O download acontece no cliente, a partir do blob da resposta.** A rota devolve o arquivo
com `content-disposition`; o shell cria um link temporário e o dispara. Alternativa: navegar
para a rota. Rejeitada porque perderia o corpo POST e o estado do fluxo.

**`x-export-failures` vira aviso na tela.** O cabeçalho já existe e hoje ninguém lê. Como a
exportação entrega o que deu certo, o aviso aparece **junto** do download bem-sucedido — não
no lugar dele.

**As rotas provisórias somem.** `/atualizar` e `/revisar` existiam para conferir as etapas
contra o handoff antes de haver shell. Mantê-las duplicaria caminhos de entrada e deixaria
duas telas alimentadas por fixture na aplicação real.

## Risks / Trade-offs

- **Quatro chamadas de IA no caminho completo** — estruturar, sugerir, ordenar, traduzir. Em
  currículo grande, a soma é sentida. → Cada espera é nomeada na tela. Reduzir o número é
  possível (paralelizar sugestão com a etapa 02), e é uma change própria, não um remendo.
- **Divergências de contrato aparecem aqui pela primeira vez.** → É o motivo de esta change
  ser a última; qualquer ajuste necessário será reportado em vez de escondido.
- **Sem persistência, fechar a aba perde tudo.** → Consequência direta de "sem conta, arquivo
  descartado". Registrada, não mitigada.
- **A etapa 04 chama a exportação inteira a cada clique**, inclusive ordenar e traduzir de
  novo. → Aceitável: exportar é o fim do fluxo e acontece uma vez. Cachear traria a pergunta
  de quando invalidar, que não vale o ganho aqui.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
