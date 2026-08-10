## Why

As três changes de sugestão produzem dados que ninguém vê. `atsScore` calcula uma nota que
não aparece em lugar nenhum, e `exportResume` recebe `patches` que hoje nenhuma tela produz.

A etapa 03 é onde o usuário decide. Tudo o que o app faz antes — importar, estruturar,
sugerir — existe para chegar aqui, e tudo o que vem depois depende do que ele marcar. É
também a tela onde a regra mais importante do produto se materializa ou se perde: **sugestão
é checklist, não edição**.

## What Changes

- **A tela da etapa 03**: currículo à esquerda, painel de sugestões à direita, empilhando em
  tela estreita.
- **O currículo é exibido como foi importado** — mesma ordem, mesmo texto, com marcadores
  numerados colados ao fim do trecho que cada sugestão endereça.
- **Marcar é a única ação sobre o currículo.** Cada cartão tem uma caixa: marcada, aquela
  sugestão entra no currículo final; desmarcada, não entra. Nada muda no papel do currículo
  ao marcar.
- **Tooltip no marcador**, com tipo, número, título e texto proposto, e "Ver detalhes" que
  rola até o cartão e o põe em foco. O lado do tooltip é escolhido medindo a posição do
  marcador na hora.
- **Filtro por tipo** (todas / métrica / datas / ATS) e contador de pendências.
- **Barra de pontuação de ATS** com 10 segmentos, alimentada por `atsScore` sobre o conjunto
  marcado — sobe conforme o usuário marca.
- **Ignorar uma sugestão** remove o cartão e o marcador da tela. É diferente de desmarcar:
  desmarcada continua na lista, ignorada some.
- **O aviso de datas organizadas**, exibido quando `suggestions-dates` indicou inferência.
- **Divergência deliberada do protótipo**: o `.dc.html` tem "Aplicar", "Desfazer", "Aplicar
  todas" e marca o trecho como "atualizado" no papel. Nada disso existe — são de um desenho
  anterior às regras de produto. Viram "marcar", "desmarcar" e "marcar todas", e o papel do
  currículo não muda nunca.

**Fora de escopo:**

- **Produzir as sugestões.** Elas chegam prontas das três capabilities de sugestão; a tela
  recebe a lista e o resultado das datas.
- **A top bar, o rail de etapas e a navegação** entre as quatro etapas —
  `app-shell-navigation`. Esta change entrega o componente da etapa, como
  `update-intake` fez.
- **A etapa 04** e o disparo do download.
- **Editar o currículo, desfazer, comparar antes/depois, reordenar.** Nenhum dos quatro
  existe no produto, e nenhum entra aqui.

## Capabilities

### New Capabilities

- `suggestion-review-ui`: a tela da etapa 03 — currículo importado com marcadores ancorados,
  cartões de sugestão como checklist, filtro, contador, pontuação de ATS projetada sobre o
  conjunto marcado e aviso de datas organizadas.

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo**: `components/suggestion-review/` (a tela, o papel do currículo, o marcador
  com tooltip, o cartão, o painel), `components/suggestion-review/state.ts` (a lógica de
  seleção, filtro e derivados, pura) e a rota provisória `app/revisar`.
- **Código tocado**: `lib/i18n/dictionary.ts` ganha as strings da etapa 03, em PT e EN.
- **Dependências**: nenhuma nova.
- **Contrato para a próxima change**: a tela devolve os `patches` das sugestões marcadas, no
  formato que `exportResume` já consome. É o que liga a revisão à exportação.
- **Consequência de produto registrada**: esta é a tela onde o usuário assume o que a IA
  escreveu. Por isso o texto proposto vive só dentro do cartão, e o papel do currículo
  continua sendo o que ele importou até o momento da geração — se o preview mostrasse o
  resultado aplicado, a marcação viraria formalidade e a confirmação deixaria de ser real.
- **Referência de design**: `claude-design/README.md` (seção "5. Etapa 03 — Revisar") e
  `claude-design/CurriculoVivoApp.dc.html` (papel do currículo, marcadores, tooltip, cartões,
  filtro e barra de pontuação) — recriados no stack, com as divergências acima.
