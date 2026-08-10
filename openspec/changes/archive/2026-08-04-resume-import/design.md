## Context

`resume-model` está pronta e arquivada. Motivação em `proposal.md — Why`; requisitos em
`specs/resume-import/spec.md`.

A divisão de trabalho desta change foi decidida por uma constatação prática: **heurística
de estruturação não escala**. Um dicionário de títulos de seção e regras do tipo "a
primeira linha é a empresa" formam uma lista finita contra a variedade infinita dos
currículos reais, e cada regra que erra produz um campo trocado que passa despercebido. Como
o produto já decidiu que quem organiza o conteúdo é a IA, a estruturação é dela.

O que **não** pode ser da IA é a extração. Ela precisa ser determinística, e há um problema
que nenhum modelo resolve depois: num PDF de duas colunas os dois lados compartilham a mesma
coordenada vertical, então montar linhas antes de separar colunas funde o texto da esquerda
com o da direita. O resultado observado, antes da correção, foi literalmente
`"Marina Alencar Experiência profissional"` e `"Kafka, Terraform • Conduzi rituais de
squad"`. Texto assim não é feio: é **errado**, e faria qualquer leitor associar o bullet à
experiência errada.

## Goals / Non-Goals

**Goals:**
- Extração determinística e testável sem rede, entregando texto em ordem de leitura
  correta.
- Uma fronteira de IA estreita e substituível, para que a suíte nunca chame a API real.
- Garantia verificável de que a IA distribuiu o texto sem reescrevê-lo.

**Non-Goals:**
- Interpretar o currículo com regras. Não há dicionário de seções nem regra de campo.
- Propor melhorias. Aqui a IA organiza o que existe; propor texto novo é das
  `suggestions-*`.
- OCR, tabelas complexas, ordem final do currículo exportado.

## Decisions

**Extração determinística, estruturação pela IA.** O pipeline é `extrair → estruturar →
verificar → relatar`. A extração produz `Block[]`; a IA recebe esses blocos e devolve o
modelo; a verificação confere o texto; o relatório descreve o que sobrou. Alternativa:
mandar o arquivo inteiro para o modelo multimodal. Rejeitada porque perderíamos o texto de
referência contra o qual verificar a resposta — sem ele, não há como distinguir distribuição
de invenção.

**Colunas são detectadas antes de as linhas serem montadas.** A detecção acha calhas
verticais — faixas horizontais no miolo da página que nenhum item de texto ocupa — a partir
das caixas reais dos itens (`x`, `width`), e particiona os itens por coluna antes de
agrupá-los em linhas. Alternativa: detectar depois e tentar desfazer a mistura. Rejeitada
porque, uma vez fundidos, os dois textos não têm separador confiável para desfazer. Faixas
vazias que encostam nas bordas são ignoradas: isso é margem, não calha.

**Bloco intermediário comum aos dois formatos.** DOCX e PDF são reduzidos ao mesmo
`Block = { text, kind, page?, column? }` antes de qualquer interpretação, para que a
fronteira com a IA seja escrita uma vez só. No DOCX o `kind` vem de graça (`li`, `p`,
`h1..h6`); no PDF, de marcador de lista no início da linha.

**DOCX via `convertToHtml`, não `extractRawText`.** O segundo perde a marcação de lista —
a pista que distingue bullet de entrega de linha de endereço. O HTML do mammoth é semântico
e previsível, então um scanner de elementos de bloco basta e evita uma dependência de parser
de HTML.

**Saída estruturada do Gemini, validada por Zod.** A chamada usa
`responseMimeType: "application/json"` com `responseSchema`, e a resposta ainda passa por
`ResumeSchema` antes de ser aceita. Alternativa: pedir JSON no prompt e confiar. Rejeitada
porque resposta fora do esquema viraria currículo parcial — e o requisito é falhar.

**A verificação anti-reescrita compara texto normalizado por contenção.** Cada texto
devolvido é normalizado (espaços colapsados, marcador de lista removido, caixa preservada) e
precisa estar contido no texto extraído normalizado. Isso aceita o que deve aceitar —
dividir um parágrafo em dois bullets, remover o "•" — e recusa reformulação, mesmo com o
mesmo sentido. Alternativa: comparação por similaridade. Rejeitada porque um limiar de
similaridade é exatamente a fresta por onde uma reescrita passa; contenção é binária e
auditável.

**A fronteira da IA é um port injetável.** `lib/ai/` expõe `structureResume(blocks)` por
trás de uma interface; a implementação Gemini é a padrão e os testes injetam uma gravada.
Alternativa: mockar o SDK. Rejeitada por acoplar os testes ao formato interno do cliente.

**Route handler fino, biblioteca pura.** `lib/parsing/` não conhece `Request` nem
`Response`. O handler só faz limite de tamanho, detecção de formato, tradução de erro para
status e descarte. O pipeline inteiro é testável sem subir servidor.

## Risks / Trade-offs

- **Toda importação agora custa uma chamada de IA, com latência e preço.** → É a
  consequência aceita da decisão de produto. O custo é limitado a uma chamada por
  importação, e a extração — a parte cara em CPU — continua local.
- **A estruturação deixa de ser determinística.** → Mitigado onde importa: a extração é
  determinística e testada isoladamente, a resposta é validada contra o esquema, e a
  verificação anti-reescrita rejeita o que não veio do arquivo. O que varia entre execuções
  é *como* o texto foi distribuído, não *qual* texto entrou.
- **Falso positivo na detecção de coluna** — uma tabela larga parecendo duas colunas. → O
  custo é baixo: o texto continua todo presente, só agrupado numa ordem que a IA remonta.
- **O conteúdo do currículo é enviado a um serviço externo.** → Decisão de produto
  implícita ao uso de IA, mas com consequência de privacidade real: a tela da etapa 01
  precisa dizer isso ao usuário. Registrado aqui para não passar em silêncio.
- **Currículo muito longo pode estourar o limite de contexto do modelo.** → O texto de um
  currículo é pequeno para os limites atuais; se aparecer um caso extremo, o erro é de
  chamada de IA e já tem cenário próprio.

## Open Questions

- Nenhuma que afete specs, abordagem ou tasks. O modelo Gemini específico e o limite de
  tamanho de arquivo são parâmetros de configuração, decididos na implementação.
