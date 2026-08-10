## Context

Motivação em `proposal.md — Why`; requisitos em `specs/export-docx-pdf/spec.md`.

Esta é a change que liga os fios. `generateFinal`, `organizeContent` e `translateResume`
existem, estão testados e ninguém os chama. O trabalho aqui é menos inventar e mais compor —
na ordem certa, com as falhas isoladas — e depois escrever bytes que um ATS leia.

## Goals / Non-Goals

**Goals:**

- Arquivos que sobrevivem ao parser: coluna única, sem tabela, texto selecionável.
- Uma exportação que entrega o que deu certo mesmo quando parte falha.
- Verificação por reabertura, não por confiança no gerador.

**Non-Goals:**

- A tela da etapa 04 (`app-shell-navigation`), a revisão (`suggestion-review-ui`).
- Layout com personalidade. O modelo padrão é deliberadamente sem graça.
- Persistir qualquer coisa: não há conta, e o arquivo morre com a requisição.

## Decisions

**A composição acontece numa ordem que não é negociável.** Primeiro `generateFinal` — com as
sugestões marcadas e a ordem —, depois a tradução. Traduzir antes significaria traduzir texto
que o usuário talvez não tenha marcado, e pior: a verificação de números da tradução compara
com o currículo de origem, então ela precisa rodar sobre o texto que de fato vai para o
arquivo. Alternativa: traduzir o currículo importado e aplicar patches depois. Rejeitada — os
patches estão no idioma do usuário e não caberiam no currículo traduzido.

**A ordem é pedida uma vez, antes de tudo.** Ela vale para os quatro arquivos: dois arquivos
do mesmo currículo com ordens diferentes seriam um defeito visível. A tradução, uma vez por
idioma — DOCX e PDF de uma língua compartilham o mesmo currículo traduzido.

**A falha é isolada por idioma, não por arquivo.** É onde o erro nasce: a tradução falha para
uma língua inteira, e os dois formatos daquela língua caem juntos. Um erro na escrita do DOCX
derruba só aquele arquivo. O resultado carrega `files` e `failures` lado a lado, e um lote
totalmente fracassado devolve `files` vazio com as falhas nomeadas — nunca um `.zip` com zero
entradas, que o usuário abriria sem entender.

**Títulos de seção são conteúdo, não interface.** "EXPERIÊNCIA PROFISSIONAL" e "PROFESSIONAL
EXPERIENCE" aparecem *dentro* do currículo do usuário, como os nomes de mês de
`export-translation`. Ficam no módulo de exportação, fora de `lib/i18n` — a mesma fronteira
que o projeto mantém desde o começo.

**DOCX por estilos nativos, não por formatação direta.** `docx` permite negrito e tamanho
soltos; usar `HeadingLevel` faz o Word registrar o parágrafo como título de verdade. Importa
porque parser de ATS e leitor de tela usam a estrutura, não a aparência — e porque é a
diferença entre um documento e um texto que parece um documento.

**PDF por `@react-pdf/renderer`, com import dinâmico.** É a única dependência nova, e entra
pelo mesmo padrão do SDK do Gemini: `await import(...)` dentro da função, para não encostar
no bundle do cliente. `pdf-lib` já está no projeto e foi considerado — ele gera texto
selecionável, mas sem motor de layout: quebra de linha, medição e paginação seriam manuais, e
currículo é conteúdo de altura imprevisível. Trocar uma dependência por um algoritmo de
layout caseiro é o tipo de economia que se paga com bugs de página.

**A verificação é por reabertura, com os parsers da importação.** O DOCX volta por `mammoth`
e o PDF por `pdfjs-dist` — já dependências, porque o app sabe ler currículo. Um PDF sem texto
selecionável falha no teste exatamente como falharia num ATS. Para o que `mammoth` não
mostra — tabela, caixa de texto, coluna —, o `.docx` é aberto como zip e o
`word/document.xml` é inspecionado direto: `w:tbl`, `w:txbxContent` e `w:cols` não podem
aparecer.

**O nome do arquivo é derivado, não configurável.** `curriculo-<nome>-pt.docx` e
`resume-<nome>-en.pdf`, sem acento, espaço ou maiúscula: a ASCII é o denominador comum dos
sistemas de candidatura, e um `Currículo Final (2).docx` é o que se quer evitar. Nome vazio
degrada para `curriculo-pt.docx` em vez de produzir um hífen solto.

## Risks / Trade-offs

- **`@react-pdf/renderer` é uma dependência pesada** e carrega um motor de layout inteiro. →
  Import dinâmico mantém o cliente limpo; o peso fica no servidor, onde a exportação roda.
- **A fidelidade visual entre DOCX e PDF não é garantida** — são dois renderizadores
  diferentes, e o mesmo currículo sai com quebras de linha distintas. → Aceito: o alvo é ser
  lido corretamente, não ser pixel-idêntico. Nenhum requisito compara os dois.
- **Currículo muito longo pagina sem controle fino.** → O modelo padrão é linear e sem
  elemento que atravesse página; a paginação natural é aceitável e não quebra a leitura.
- **A verificação por reabertura testa o que o parser enxerga, não o que o Word mostra.** →
  É exatamente o que interessa. O leitor humano vem depois do parser.
- **Uma falha de idioma é silenciosa se a UI não mostrar `failures`.** → A biblioteca devolve
  o dado nomeado; exibir é responsabilidade da tela, e o contrato está registrado aqui.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks.
