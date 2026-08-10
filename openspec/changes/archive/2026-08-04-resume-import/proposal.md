## Why

`resume-model` definiu o alvo — a estrutura canônica, os ids estáveis, os paths — mas nada
preenche esse alvo ainda: o modelo só existe em fixtures escritas à mão. A etapa 01 do
produto é a que transforma o arquivo do usuário nesse modelo, e sem ela nenhuma capability
seguinte tem sobre o que operar.

DOCX e PDF descrevem **aparência, não significado**: nenhum dos dois marca "isto é uma
experiência". Interpretar isso com heurística — dicionário de títulos de seção, "a primeira
linha é a empresa" — é uma lista finita de regras contra a variedade infinita dos
currículos reais, e cada regra que erra produz um campo trocado que ninguém percebe. Como o
produto já decidiu que **quem organiza o conteúdo é a IA**, a estruturação é dela também: o
código extrai o texto em ordem de leitura correta, o Gemini preenche o modelo, e o código
valida o que voltou.

## What Changes

- Recebe um arquivo **DOCX ou PDF** e devolve um **currículo canônico** válido segundo
  `resume-model`, com ids gerados e origem `imported` em todos os trechos.
- **Extrai o texto em ordem de leitura correta.** No DOCX, itens de lista, parágrafos e
  títulos vêm marcados pelo próprio formato. No PDF, linhas são reconstruídas por posição.
- **Detecta layout em duas ou mais colunas** e separa o texto por coluna **antes** de
  montar as linhas. Sem isso, os dois lados da página — que compartilham a mesma
  coordenada vertical — saem fundidos, e a IA receberia um bullet colado numa habilidade.
- **Entrega o texto extraído ao Gemini**, que devolve o modelo canônico preenchido: seções,
  experiências com empresa/cargo/período/bullets, formações e habilidades, na ordem de
  leitura correta mesmo quando o arquivo era de múltiplas colunas.
- **Trava contra reescrita**: a IA apenas distribui o texto extraído nos campos. Todo texto
  devolvido é verificado contra o texto do arquivo; o que não estiver lá é rejeitado.
  Reescrever é papel das sugestões, que passam pelo checklist.
- **Períodos** passam pelo parser de `resume-model`: o que vier sem mês fica incompleto,
  para o usuário completar.
- Produz um **relatório de importação**: contagens do que foi reconhecido, períodos
  incompletos, períodos sobrepostos, bullets sem número e texto extraído que a IA não
  aproveitou em nenhum campo.
- Rejeita com erro claro e distinguível o que não dá para processar: formato não suportado,
  arquivo corrompido, PDF sem camada de texto e arquivo acima do limite de tamanho.
- Traz o **cliente Gemini** do projeto (`@google/genai`, saída estruturada validada por
  Zod), que as changes de sugestão vão reutilizar.
- Expõe a operação como **route handler**, com o arquivo processado em memória e
  **descartado** ao fim da requisição.

**Fora de escopo** (cada um é a sua própria change):
- A tela da etapa 01 — dropzone, linha de confirmação, campo de área de atuação.
- Qualquer **sugestão de melhoria** sobre o conteúdo importado — `suggestions-*`. Aqui a IA
  organiza o que já existe; ela não propõe texto novo.
- Decidir a **ordem final** das experiências no currículo exportado —
  `content-organization`. A ordem aqui é a de leitura do arquivo.
- Completar os períodos incompletos com o usuário — `update-intake`.
- OCR de PDF digitalizado. Aqui isso é erro reportado, não funcionalidade.

## Capabilities

### New Capabilities
- `resume-import`: extração de DOCX e PDF em ordem de leitura correta, separação por
  coluna, estruturação do modelo canônico pela IA com verificação contra o texto extraído,
  relatório de importação e descarte do arquivo após o processamento.

### Modified Capabilities

Nenhuma. `resume-model` é consumida como está.

## Impact

- **Código novo**: `lib/parsing/` (extração DOCX, extração PDF, colunas, relatório),
  `lib/ai/` (cliente Gemini e saída estruturada) e um route handler em
  `app/api/resume-import/`.
- **Dependências**: `mammoth` (DOCX), `pdfjs-dist` (PDF) e `@google/genai` (Gemini).
  `docx`, `pdf-lib` e `jszip` entram como devDependencies para gerar as fixtures binárias.
- **Configuração**: passa a existir uma chave de API do Gemini, lida só no servidor. Sem
  ela, a importação falha com erro claro de configuração — não com um currículo vazio.
- **Custo e latência**: cada importação faz uma chamada ao Gemini. Testes nunca chamam a
  API real: a fronteira do modelo é mockada com respostas gravadas.
- **Contrato para as próximas changes**: `update-intake` recebe o currículo e a lista de
  períodos incompletos; as `suggestions-*` recebem um currículo canônico já endereçável por
  path; a etapa 01 da UI recebe o relatório para exibir.
- **Privacidade**: o arquivo existe apenas em memória durante a requisição; nada é gravado
  em disco e nenhum log inclui o conteúdo do currículo. O texto **é** enviado ao Gemini —
  fato que a tela da etapa 01 precisa deixar claro ao usuário.
- **Referência de design**: `claude-design/README.md`, seções "Backend / dados" e "Etapa 01
  — Importar". Sem referência a `.dc.html` — esta change não tem UI.
