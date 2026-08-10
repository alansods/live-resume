## Context

Motivação em `proposal.md — Why`; requisitos em `specs/suggestions-dates/spec.md`.

Duas coisas moldam o escopo:

1. O protótipo tem uma sugestão "Formato de data fora do padrão". Ela não tem o que corrigir:
   `resume-model` guarda período estruturado e `formatPeriod` sempre emite `mm/aaaa`, então o
   documento exportado já sai no formato certo qualquer que fosse o texto original. O que
   sobra do caso é o período sem mês.
2. O app **organiza** as datas em conflito ou incompletas, propondo período completo — e
   quando o mês não vem de nenhuma data do usuário, ele é inferido. Isso é decisão de
   produto, tomada com a contrapartida de um aviso explícito na revisão.

Daí a distinção que atravessa o desenho: **derivado** é mês calculado de uma data que o
usuário escreveu; **inferido** é mês escolhido pelo app. Só o segundo aciona o aviso.

## Goals / Non-Goals

**Goals:**
- Detecção exata e explicável de sobreposição.
- Correção derivada de dados existentes, com a origem declarada na justificativa.

**Non-Goals:**
- Inferir mês em silêncio. Toda inferência é marcada e aciona o aviso.
- Decidir qual das duas experiências está errada. Propomos a leitura mais provável e o
  usuário decide.
- Renderizar o aviso e os cartões, e chamar IA.

## Decisions

**Sem IA.** Sobreposição é aritmética de calendário; a correção é uma subtração de um mês
sobre uma data que o usuário escreveu. Alternativa: passar pelo Gemini como as outras
sugestões, por uniformidade. Rejeitada por três razões: custa dinheiro e latência sem
acrescentar julgamento, o resultado deixaria de ser determinístico, e — o que pesa mais —
data é o campo onde uma escolha do app precisa ser auditável, então tirar o modelo do caminho
deixa toda escolha de data numa regra fixa que dá para ler no código e explicar ao usuário.

**A correção incide sobre a experiência anterior, não a seguinte.** Quem começou depois
define o corte: se o usuário entrou na Kobo em `03/2022`, a saída do emprego anterior é no
máximo `02/2022`. Alternativa: propor adiar o início da seguinte. Rejeitada porque a data de
entrada num emprego novo costuma ser a que a pessoa lembra com precisão, e a de saída do
anterior a que ela arredonda.

**Sobreposição com fim em aberto conta.** Um emprego "atual" que começou antes do fim de
outro é sobreposição real, e `periodsOverlap` já trata o fim aberto como infinito.

**Período incompleto recebe proposta completa, com o mês derivado sempre que possível.** A
ordem de tentativa é: derivar do início da experiência seguinte (ou do fim da anterior), e só
então inferir. Alternativa: inferir direto, por simplicidade. Rejeitada porque cada derivação
a mais é um aviso a menos — e o aviso, sendo raro, é lido; sendo constante, vira ruído.

**A inferência é uma regra fixa e explicável, não uma escolha estética.** Início de período
sem mês assume janeiro; fim sem mês assume dezembro. É a leitura mais generosa e a mais comum
em currículo ("2018 - 2019" quase sempre quer dizer o ano inteiro), e sendo fixa, é
determinística e auditável. Alternativa: distribuir os meses para "parecer natural".
Rejeitada por ser invenção sem critério defensável.

**O que o usuário informou tem precedência.** Período completado na etapa 02 não recebe
sugestão de organização: o app não sobrepõe a informação de quem viveu a experiência.

**Uma sugestão de data por trecho.** Uma experiência pode estar sobreposta com duas outras e
ainda incompleta; o trecho é um só, e a geração recusa dois patches no mesmo path. Prioridade:
sobreposição antes de incompletude, porque a primeira traz proposta e a segunda só aponta.

## Risks / Trade-offs

- **A correção proposta pode estar errada** — o usuário pode de fato ter tido dois empregos
  simultâneos. → Por isso é sugestão, com justificativa dizendo de onde a data saiu, e o
  usuário marca ou ignora.
- **Uma data inferida é uma afirmação factual que o usuário assina ao exportar**, e pode
  divergir do que um empregador anterior confirmaria numa checagem. → Mitigado, não
  eliminado, pelo aviso: ele diz que as datas foram organizadas, que não precisam ser
  exatamente as reais e que cabe ao usuário conferir. O aviso só aparece quando houve
  inferência, para não virar ruído. A decisão final é do usuário, que é quem assina.
- **A sugestão "Normalizar" do protótipo não existe aqui**, então a etapa 03 mostra um
  cartão a menos que o handoff. → O modelo já garante `mm/aaaa` na exportação; um cartão que
  não corrige nada seria ruído.
- **Sem IA aqui, a etapa 03 mistura sugestões de origens diferentes.** → Não é problema: o
  modelo de sugestão é o mesmo, e a tela não precisa saber quem produziu cada uma.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
