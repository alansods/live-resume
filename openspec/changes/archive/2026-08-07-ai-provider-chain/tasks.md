## 1. A interface e a classificação de falha

- [x] 1.1 Criar `lib/ai/providers/types.ts` com `AiProvider`, `ChatMessage`,
  `GenerationOptions` e `AiResponse` — o contrato que todo provedor cumpre. `isConfigured()`
  entra na interface: provedor sem chave é peça que falta, não falha.
  **Aceite**: cenário "Todo provedor do catálogo cumpre a mesma interface", em
  `lib/ai/providers/registry.test.ts`.

- [x] 1.2 Criar `lib/ai/providers/errors.ts` com `ProviderError`, `classifyFailure` e
  `isTemporary`. Classificação por duck typing (status → código de rede → nome → mensagem),
  sem importar as classes de erro dos SDKs.
  **Aceite**: `lib/ai/providers/errors.test.ts` cobre 429, 5xx, 408, códigos de rede,
  400/401/403/404 e erro ilegível; e prova que status vence mensagem.

- [x] 1.3 Mover `AiError` e as mensagens de usuário para `lib/ai/errors.ts`, fora do cliente,
  para que serviço e cliente compartilhem o vocabulário sem ciclo de import.
  **Aceite**: os quatro motivos de `AiFailureReason` continuam iguais; nenhuma rota muda.

## 2. Os provedores

- [x] 2.1 Criar `lib/ai/providers/openai-compatible.ts`: a implementação compartilhada por
  todo provedor com API compatível com a OpenAI. SDK por import dinâmico, `maxRetries: 0`
  (quem decide o que fazer com 429 é a cadeia), timeout por ambiente.
  **Aceite**: cenários "Provedores compatíveis com a OpenAI compartilham a implementação" e
  "Chave e modelo vêm sempre do ambiente", em `lib/ai/providers/openai-compatible.test.ts`.

- [x] 2.2 Criar `lib/ai/providers/json-schema.ts`: tradução do dialeto do projeto (Gemini, com
  `nullable`) para o modo estrito da OpenAI (`additionalProperties: false`, `required`
  completo, `type` com `"null"`). Função pura, para não manter dois schemas por chamada.
  **Aceite**: cenário "O schema vai no formato estrito nos provedores compatíveis com a
  OpenAI"; e `json-schema.test.ts` roda a tradução sobre o schema real do currículo.

- [x] 2.3 Criar `lib/ai/providers/groq.ts` e `cerebras.ts` — só configuração: endereço, nomes
  das variáveis e modelo padrão.
  **Aceite**: os dois arquivos não têm lógica; o teste de 2.1 prova que mandam o mesmo pedido.

- [x] 2.4 Criar `lib/ai/providers/gemini.ts` implementando `AiProvider` sobre o SDK próprio,
  com `systemInstruction` e o schema no dialeto dele.
  **Aceite**: cenários "O provedor de SDK próprio traduz a interface para o seu formato" e "O
  schema vai no dialeto próprio do Gemini", em `lib/ai/providers/gemini.test.ts`.

## 3. A cadeia

- [x] 3.1 Criar `lib/ai/providers/registry.ts`: catálogo, ordem padrão e leitura de
  `AI_PROVIDERS` (incluindo `none`). Nome desconhecido é ignorado com aviso, não derruba a app.
  **Aceite**: cenários "A ordem padrão é Gemini, Groq e Cerebras", "A variável de ambiente
  reordena a cadeia", "A variável de ambiente desliga a IA por inteiro" e "Nome de provedor
  desconhecido é ignorado", em `lib/ai/providers/registry.test.ts`.

- [x] 3.2 Criar `lib/ai/service.ts`: percorre a cadeia, pula quem não tem chave, cai para o
  próximo só em falha temporária, e traduz a falha final para os quatro motivos conhecidos —
  cota prevalece sobre indisponibilidade.
  **Aceite**: os onze cenários de fallback, interrupção e provedor sem chave, em
  `lib/ai/service.test.ts`.

- [x] 3.3 Criar `lib/ai/providers/log.ts`: registro em blocos, ligado em desenvolvimento e
  calado em produção e teste, com `AI_LOG=on|off`. Nenhum `console.log` solto nos provedores.
  **Aceite**: a suíte roda sem poluir a saída; nenhum registro contém texto de currículo.

## 4. A fronteira pública

- [x] 4.1 Reescrever `lib/ai/client.ts` sobre o serviço: monta as mensagens, parseia o JSON e
  revalida com Zod. `createGeminiClient` vira `createAiClient`.
  **Aceite**: cenários "O provedor que atendeu não aparece no retorno" e "Resposta que não é
  JSON não vira fallback", em `lib/ai/client.test.ts`.

- [x] 4.2 Criar `lib/ai/index.ts` como superfície pública e trocar os cinco pontos de uso
  (`structure`, `suggest-metrics`, `suggest-ats`, `translate-resume`, `organize-content`).
  **Aceite**: `npm test` verde sem mudança em nenhum teste de feature.

- [x] 4.3 Criar `lib/ai/encapsulation.test.ts`: varre o projeto e falha se algum arquivo fora
  da camada importar SDK de provedor ou nomear um provedor em código.
  **Aceite**: cenários "Nada fora da camada de IA importa um SDK de provedor" e "Nenhum nome
  de provedor aparece em regra de negócio ou rota".

- [x] 4.4 Acrescentar `fakeProvider` a `lib/ai/testing.ts`, para exercitar a cadeia sem rede.
  **Aceite**: nenhum teste da suíte chama API real; `createProviderChain()` não devolve
  nenhum provedor configurado no ambiente de teste.

## 5. Configuração e o que ficou desatualizado

- [x] 5.1 Reescrever `.env.local` com as chaves e variáveis dos três provedores, documentadas.
  **Aceite**: sem nenhuma variável nova definida, o comportamento é o de antes.

- [x] 5.2 Trocar as provas de "nenhuma chamada real" que limpavam `GEMINI_API_KEY` por
  `AI_PROVIDERS=none` ou por verificação da cadeia inteira — a chave única deixou de ser prova.
  **Aceite**: `lib/parsing/structure.test.ts`, `lib/suggestions/suggestions.test.ts`,
  `lib/suggestions/ats.test.ts`, `lib/export/translation.test.ts`, `lib/export/export.test.ts`.

- [x] 5.3 Tornar `scripts/smoke.mjs` e as specs de teste independentes de provedor.
  **Aceite**: o smoke aceita a chave de qualquer provedor; nenhuma spec fora de `ai-providers`
  nomeia o Gemini.

- [x] 5.4 Atualizar `openspec/config.yaml` e `CLAUDE.md` para descreverem a camada.
  **Aceite**: a seção de stack fala em cadeia de provedores; `CAPABILITIES` inclui
  `ai-providers`.
