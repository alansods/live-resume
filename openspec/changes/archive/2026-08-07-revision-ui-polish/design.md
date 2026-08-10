## Context

Ver `proposal.md` — Why. Três acertos pequenos, mas dois deles têm decisão técnica real
por trás: por que o resumo do marcador deixa de fechar no caminho, e em que camada a top
bar fixa passa a viver. O terceiro é rótulo.

O resumo do marcador é filho do elemento que escuta a saída do ponteiro. Entrar num filho
não é sair do pai — o resumo nunca foi o problema. O problema era o vão: o marcador tem
15px de altura e o resumo começa 6px abaixo dele, e esses 6px são papel do currículo.

## Goals / Non-Goals

**Goals**

- O percurso ponteiro → resumo é contínuo, sem depender de tempo.
- Uma única ordem de camadas escrita em um lugar só, do papel ao modal.

**Non-Goals**

- Reabrir o afordance de ponteiro para teclado/toque (fora de escopo na proposta).
- Qualquer biblioteca de posicionamento (`floating-ui` e afins): o resumo tem duas
  posições possíveis, medidas na entrada do ponteiro, e isso continua bastando.

## Decisions

**1. Ponte geométrica, não atraso de fechamento.**

A alternativa era manter o vão e adiar o fechamento por alguns milissegundos, cancelando o
temporizador na reentrada. Foi recusada: transforma uma questão de geometria em questão de
tempo, torna o cenário verificável só com relógio falso e deixa o resumo aberto sobre o
currículo depois que o ponteiro já saiu. A ponte é um pseudo-elemento do próprio resumo
cobrindo exatamente a altura do vão — o percurso passa a pertencer ao resumo, e "sair"
volta a significar sair.

A ponte cobre **só** a altura do vão, nunca a do marcador: esticá-la até o topo a
colocaria por cima do botão numerado (o resumo está em camada superior) e ela engoliria o
clique que foca o cartão. Um conserto que quebra o gesto vizinho.

**2. `sticky`, não `fixed`.**

A top bar é o primeiro filho em fluxo tanto na home quanto no shell. Fixa por `sticky` ela
reserva a própria altura, e nenhuma outra tela precisa de recuo compensatório no topo —
que é o cenário "a top bar não cobre o começo do conteúdo". Com `fixed` o recuo teria de
ser repetido em cada página e voltaria a divergir com o tempo, exatamente como as duas top
bars divergiram antes de virarem um componente só.

Requisito de estrutura que vem junto: nenhum ancestral da top bar pode ter `overflow`
diferente de `visible`, ou o `sticky` deixa de valer em silêncio. Hoje o `overflow: auto`
do conteúdo é irmão dela, não ancestral.

**3. Camadas: papel < resumo do marcador (20) < top bar (30) < modal (50).**

Números já existentes no projeto; a top bar entra entre os dois que já havia. A ordem é a
da spec: a barra cobre o currículo, o modal cobre a barra.

**4. Rótulo "aceitar" com a spec dizendo que aceitar é marcar.**

O risco do rótulo não é de código, é de leitura: "aceitar" convive com um requisito que
proíbe "aplicar". Por isso a mudança de texto vem acompanhada de um cenário afirmando que
aceitar não altera o currículo em revisão — sem ele, o rótulo pareceria a violação que não
é.

## Risks / Trade-offs

- [O ponteiro pode sair do marcador na diagonal, para os lados, e fechar o resumo] → A
  ponte tem a largura do resumo (bem maior que o marcador), então todo percurso
  descendente cai nela. Percurso lateral fecha o resumo — e deve fechar mesmo.
- [Uma barra fixa come altura útil em telas baixas] → São 46px, e o que ela mantém à vista
  (nota de ATS, volta) é justamente o que se consulta durante a rolagem.
- [Um futuro ancestral com `overflow` quebra o `sticky` sem erro nenhum] → Registrado como
  requisito de estrutura acima e verificado pelo cenário de rolagem.
- [Traduções e testes que citavam "Marcar" ficam para trás] → Os rótulos vivem só no
  dicionário; os testes passam a consultar os novos.

## Migration Plan

Não há migração: nada é persistido e nenhuma rota muda. Reverter é reverter o CSS e as três
chaves do dicionário.
