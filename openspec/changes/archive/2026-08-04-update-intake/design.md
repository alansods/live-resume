## Context

Primeira change de interface do projeto. `resume-model` e `resume-import` estão
arquivadas; `components/` está vazia e não existe nenhum primitivo de UI. Motivação em
`proposal.md — Why`; requisitos em `specs/update-intake/spec.md`.

O handoff (`claude-design/README.md`, "Etapa 02 — Atualizar") e o protótipo
`CurriculoVivoApp.dc.html` definem aparência e comportamento em alta fidelidade. Os
`.dc.html` são referência, não código: o comportamento é recriado no stack, os valores
visuais são copiados dos tokens.

## Goals / Non-Goals

**Goals:**
- Primitivos de UI que sirvam às três telas seguintes, não só a esta.
- Estado local previsível: editar um campo mexe num item só, remover apaga o item certo.
- Nenhuma data entrando no sistema sem mês e ano.

**Non-Goals:**
- Shell, navegação entre etapas, home e landing — `app-shell-navigation`.
- Mesclar o que foi digitado com o currículo importado. As listas ficam separadas até a
  geração.
- Persistir o que foi digitado entre sessões: não há contas nem armazenamento.
- Analisar ou sugerir qualquer coisa sobre o que o usuário escreveu.

## Decisions

**Tokens por CSS custom properties, não por reimplementação em Tailwind.**
`claude-design/styles.css` já está importado no `globals.css` e traz tokens e classes de
componente do Nocturne. Os primitivos consomem `var(--color-*)`, `var(--space-*)`,
`var(--radius-*)` e as classes `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`.
Alternativa: traduzir a paleta para o `@theme` do Tailwind v4 e usar utilitários.
Rejeitada por criar uma segunda fonte da verdade para os mesmos valores — a regra do
projeto é que `styles.css` é a fonte, e um `bg-accent` do Tailwind seria uma cópia que
pode divergir. Tailwind continua disponível para layout, onde não há token envolvido.

**Estado da etapa em um `useReducer` por tipo de item, não `useState` espalhado.** As
operações são poucas e nomeadas — adicionar, editar campo, remover, abrir/fechar modal,
atualizar rascunho — e a regra "remover apaga o item certo" é justamente onde `useState`
com índice erra. Com id por item e ações nomeadas, o teste que remove o item do meio e
confere os outros dois vira trivial. Alternativa: biblioteca de estado. Rejeitada por ser
estado de uma tela, não do aplicativo.

**Id local por item, do mesmo gerador do modelo.** Os itens desta etapa usam `newItemId()`
de `resume-model`, mesmo ainda não sendo parte do currículo. Alternativa: o `nextId`
incremental do protótipo. Rejeitada porque na geração esses itens viram itens do currículo,
e um id incremental colidiria com os ids já existentes — melhor nascer com a identidade
definitiva.

**Data como texto `mm/aaaa` validado na saída do campo, não máscara que reescreve enquanto
se digita.** O campo aceita o que o usuário digitar e valida quando ele sai dali,
mostrando mensagem. Alternativa: máscara de entrada que força o formato. Rejeitada porque
máscara atrapalha colar valor, apagar e corrigir — e porque a mensagem explícita ensina o
formato exigido, enquanto a máscara só o impõe. A validação reaproveita `parsePeriod` de
`resume-model`, para que a etapa 02 e a importação concordem sobre o que é uma data válida.

**Períodos incompletos são uma seção própria, não um aviso.** A pendência aparece como uma
seção com os períodos a completar, cada um mostrando o texto original do arquivo, e some
quando não há nenhum. Alternativa: um alerta no topo com link. Rejeitada porque a ação —
digitar o mês — precisa estar onde o aviso está; um alerta que manda procurar é uma etapa a
mais.

**Um `<dialog>` nativo para o modal, com o comportamento do handoff por cima.** Ele entrega
de graça foco preso, `Esc` para fechar e semântica de diálogo — coisas que uma `div` com
`position: fixed` exigiria reimplementar e que o protótipo, sendo protótipo, não trata. O
overlay, a caixa de 420px e as animações de entrada seguem os valores do handoff.
Alternativa: replicar o `div` do `.dc.html`. Rejeitada: o `.dc.html` é referência de
aparência e comportamento visível, não de acessibilidade.

**i18n como dicionário tipado, sem biblioteca.** `lib/i18n/` expõe as chaves em PT e EN
com tipo, e um hook lê o idioma da interface. Alternativa: `next-intl` ou similar.
Rejeitada por peso desproporcional a um app de duas línguas e poucas telas; se o escopo
crescer, a troca é local. O tipo garante que uma chave nova não fique sem tradução.

**Testes de componente com `@vitest-environment jsdom` por arquivo.** A suíte roda em
`node` por padrão, porque a maior parte do código é biblioteca de servidor e o pdfjs se
confunde com um DOM presente. A diretiva por arquivo mantém os dois mundos sem
configuração condicional.

## Risks / Trade-offs

- **A etapa 02 nasce sem o shell**, então a página que a hospeda é provisória. → É a ordem
  acordada (shell como acabamento no fim). O componente da etapa não conhece a página que o
  hospeda, então o encaixe posterior é troca de contêiner.
- **Sem persistência, recarregar a página perde o que foi digitado.** → Consequência de não
  haver contas nem armazenamento no escopo. Vale registrar como decisão consciente, não
  como esquecimento; se virar problema real, o remédio natural é estado em
  `sessionStorage`, que não implica conta.
- **Validar data na saída do campo deixa passar erro até o usuário sair dali.** → Aceito: é
  menos intrusivo que máscara. O envio do modal revalida, então nada inválido entra na
  lista.
- **Os primitivos de UI nascem para uma tela e servirão outras três.** → Risco de
  generalizar cedo demais. Mitigação: cada primitivo cobre exatamente o que esta tela usa;
  as telas seguintes estendem quando precisarem.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
