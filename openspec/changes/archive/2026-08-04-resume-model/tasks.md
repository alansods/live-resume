## 1. Inicialização do projeto

- [x] 1.1 Criar o projeto Next.js (App Router) com TypeScript em modo strict, Tailwind e a
  estrutura de pastas definida no contexto do projeto (`app/`, `components/`, `lib/`,
  `types/`, `fixtures/`), sem nenhuma rota ou componente além do scaffolding mínimo.
  **Aceite**: `npm run build` e `npx tsc --noEmit` passam; `strict: true` no tsconfig;
  nenhum arquivo em `components/`.
- [x] 1.2 Configurar Vitest com um teste de fumaça, ESLint (config do Next) e Prettier.
  **Aceite**: `npm test` roda e passa; `npm run lint` passa sem aviso.
- [x] 1.3 Adicionar `zod` e expor os tokens de `claude-design/styles.css` para a app sem
  redefinir nenhum hex.
  **Aceite**: `zod` no `package.json`; os custom properties de `styles.css` resolvem numa
  página em branco servida pela app; nenhum literal de cor fora de `styles.css`.
  **Nota**: `@google/genai` NÃO entra nesta change — é de `ai-analysis`.

## 2. Esquema, ids e tipos

- [x] 2.1 Escrever os schemas Zod do currículo canônico em `lib/resume/schema.ts`:
  cabeçalho, resumo, experiências com bullets, formações, habilidades; exportar os tipos
  por `z.infer`. Currículo monolíngue — nenhum campo aceita par de idiomas.
  **Aceite**: cenários "Currículo completo é aceito", "Seções opcionais ausentes", "Campo
  obrigatório ausente é rejeitado" (erro nomeia o caminho) e "Modelo não admite conteúdo
  multilíngue".
- [x] 2.2 Implementar a geração de id opaco em `lib/resume/ids.ts` e aplicá-la a
  experiência, bullet, formação e habilidade; validar unicidade no schema.
  **Aceite**: cenários "Ids duplicados são rejeitados" e "Id de item removido não retorna";
  teste que nenhuma informação (ordem, tipo) é derivável do valor do id.
- [x] 2.3 Modelar a origem do conteúdo (importado / digitado / proposto pela IA) e a
  confirmação, dentro do valor do trecho — sem campo de valor anterior.
  **Aceite**: cenário "Origem preservada na importação"; o tipo impede construir valor
  proposto sem o campo de confirmação; nenhum campo guarda texto pré-patch.
- [x] 2.4 Montar fixtures em `fixtures/` com ids fixos e falantes, cobrindo os casos do
  handoff: bullets sem número, períodos sobrepostos, período só com anos (`2018 - 2019`),
  período em aberto, habilidades como texto corrido.
  **Aceite**: as fixtures validam contra o schema e são usadas pelos testes seguintes.

## 3. Período

- [x] 3.1 Implementar o período em `lib/resume/period.ts` com mês e ano obrigatórios,
  fim aberto, `raw` preservado e marca de completude.
  **Aceite**: cenário "Formato completo é normalizado", incluindo fim em aberto.
- [x] 3.2 Marcar como incompleto o período sem mês ou em formato não reconhecido, sem
  inferir nada, e implementar a operação de completar com o mês informado pelo usuário.
  **Aceite**: cenários "Período sem mês fica incompleto", "Formato não reconhecido" e
  "Usuário completa o período"; teste que nenhum caminho do código atribui mês por conta
  própria.
- [x] 3.3 Implementar comparação, detecção de sobreposição e formatação `mm/aaaa`, com o
  rótulo de fim aberto vindo do i18n da interface.
  **Aceite**: cenários "Comparação de períodos", "Período incompleto não é comparado
  silenciosamente" e "Renderização em mm/aaaa".

## 4. Paths por id

- [x] 4.1 Implementar `parsePath` em `lib/resume/paths.ts`, transformando a string na união
  discriminada das formas endereçáveis, com erro nomeado para forma inválida, mais os
  construtores de path (nenhum chamador concatena string à mão).
  **Aceite**: cenário "Path malformado é erro"; nenhuma ocorrência de path concatenado
  fora de `paths.ts`.
- [x] 4.2 Implementar `resolvePath` por id, com erro explícito quando o id não existe.
  **Aceite**: cenários "Path resolve o trecho correspondente" e "Path de item inexistente
  é erro".

## 5. Geração do currículo final

- [x] 5.1 Implementar `applyPatch` e a reordenação como primitivas **internas** (não
  exportadas), imutáveis, reconstruindo só o necessário.
  **Aceite**: teste que o currículo de entrada não é mutado; nenhuma das duas aparece no
  índice público do módulo.
- [x] 5.2 Implementar `generateFinal(resume, patches, order)` em `lib/resume/generate.ts`,
  aplicando patches e ordem numa única operação.
  **Aceite**: cenários "Conjunto selecionado gera o currículo final", "Conjunto vazio",
  "Resultado independe da ordem do conjunto" e "Ordem recebida é aplicada na geração".
- [x] 5.3 Tratar a ordem como permutação completa, rejeitando id omitido, repetido ou
  desconhecido, e conservar a ordem de origem quando nenhuma é informada.
  **Aceite**: cenários "Ordem incompleta é rejeitada", "Ordem com id desconhecido é
  rejeitada" e "Geração sem ordem informada".
- [x] 5.4 Rejeitar conjunto de patches inválido — dois no mesmo path, ou path que não
  resolve — sem produzir currículo parcial.
  **Aceite**: cenários "Dois patches no mesmo trecho são rejeitados" e "Patch em path
  inexistente é rejeitado".
- [x] 5.5 Fazer a geração registrar origem "proposto" + confirmado nos trechos marcados, e
  implementar a consulta de trechos propostos ainda não confirmados.
  **Aceite**: cenários "Patch selecionado registra proposta confirmada" e "Conteúdo não
  confirmado é distinguível".
- [x] 5.6 Garantir que só o conjunto marcado substitui texto, e que a proposta marcada é
  aplicada mesmo introduzindo conteúdo novo.
  **Aceite**: cenários "Sugestão não marcada não deixa rastro no currículo final",
  "Conteúdo original não é substituído sem marcação" e "Proposta marcada pode conter
  conteúdo novo" — teste com patch que introduz métrica ausente do currículo importado é
  aplicado quando marcado e não altera nada quando não marcado.
- [x] 5.7 Garantir que o currículo final não carrega antes/depois e que o módulo não expõe
  edição incremental, reversão nem comparação.
  **Aceite**: cenários "Currículo final não carrega antes e depois" e "Não existe aplicação
  incremental nem reversão" — nenhum campo com valor anterior ou marca de alteração;
  nenhuma função de desfazer/reverter/restaurar/comparar exportada.
- [x] 5.8 Verificar as invariantes que motivam o desenho por id.
  **Aceite**: cenários "Path sobrevive à reordenação", "Id sobrevive à transformação" e
  "Currículo em revisão conserva a ordem do arquivo".

## 6. Serialização

- [x] 6.1 Implementar serialização e desserialização validada em `lib/resume/serialize.ts`.
  **Aceite**: cenários "Ida e volta preserva o currículo" (currículo gerado, com ordem
  aplicada e períodos incompletos, com todos os paths resolvendo os mesmos trechos) e
  "Payload inválido é rejeitado na fronteira".

## 7. Fechamento

- [x] 7.1 Conferir que todo cenário de `specs/resume-model/spec.md` tem um teste que o
  nomeia, e que nenhum caminho do código substitui texto do currículo sem marcação.
  **Aceite**: mapa cenário → teste completo; `npm test`, `npm run lint` e `npx tsc
  --noEmit` passam.
