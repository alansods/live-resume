## 1. Provedor: parar de recusar por chave ausente

- [x] 1.1 Em `lib/ai/providers/openai-compatible.ts`, trocar `strict: true` por
  `strict: false` no `response_format.json_schema`. Nenhuma outra mudança nesse arquivo — o
  schema continua traduzido por `toStrictJsonSchema`, só a garantia binária do provedor sai.
  **Aceite**: cenário "Provedor compatível com a OpenAI não recusa por chave ausente que a
  validação da camada aceita", em `lib/ai/providers/openai-compatible.test.ts`.

## 2. Upload: formação e habilidades toleram ausência

- [x] 2.1 Em `lib/ai/structure.ts`, tornar `education` e `skills` de
  `StructuredResumeSchema` tolerantes a ausência (`.optional()` + valor padrão via
  `.transform`), mantendo o tipo inferido igual ao de hoje.
  **Aceite**: cenários "Resposta sem formação estrutura currículo com lista vazia" e
  "Resposta sem habilidades estrutura currículo com habilidades vazias", em
  `lib/ai/structure.test.ts`.

## 3. Exportação: formação ausente na ordem não derruba a organização

- [x] 3.1 Em `lib/ai/organize-content.ts`, tornar `education` de `RawOrderSchema` tolerante a
  ausência (lista vazia como padrão).
  **Aceite**: cenário "Ordem sem chave de formação é aceita como lista vazia", em
  `lib/ai/organize-content.test.ts`.

## 4. Verificação

- [x] 4.1 `npx vitest run lib/ai lib/spec-coverage.test.ts` — suíte de IA e cobertura de spec
  verdes.
- [x] 4.2 `npm run lint` e `npm test` completos antes de arquivar a change.
