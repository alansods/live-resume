## Why

O projeto inteiro dependia de um provedor de IA só. `lib/ai/client.ts` era, ao mesmo tempo, a
fronteira do modelo, o cliente do Gemini e o tradutor de erro — e `createGeminiClient()` era
chamado por nome em cinco lugares. A consequência prática apareceu duas vezes:

**A aposentadoria do `gemini-2.5-flash`.** O modelo saiu do ar para chaves novas, a suíte
continuou verde — nenhum teste chama a API — e o produto inteiro devolveu 502 até alguém
editar uma constante à mão. Um provedor de reserva teria absorvido a queda enquanto a
constante era corrigida.

**A cota diária.** O plano gratuito são 20 requisições por dia e um fluxo completo gasta 4:
cinco currículos esgotam o dia. A change `2026-08-05-ai-quota-notice` fez o app *avisar* bem
que a cota acabou — o que era o certo a fazer com um provedor só. Com dois, a resposta certa
deixa de ser um aviso: é continuar funcionando na cota de outro serviço.

Nenhum dos dois problemas é do Gemini. São de depender de um fornecedor único num ponto que o
produto não sabe contornar. E a forma como a dependência estava escrita — nome do provedor no
código de quem chama — significava que trocar de fornecedor ou acrescentar um segundo obrigaria
a mexer em regra de negócio, que não tem nada a ver com o assunto.

## What Changes

- **Nasce a camada `ai-providers`**, com uma interface única (`AiProvider`) que todo provedor
  cumpre. O resto do projeto passa a consumir só `createAiClient()` e `aiService`, e não sabe
  mais qual IA respondeu.
- **A cadeia de fallback**: os provedores são tentados em ordem de prioridade até um responder.
  Cai para o próximo apenas em falha **temporária** — limite de uso, 5xx, tempo esgotado,
  conexão caída. Pedido inválido, credencial recusada e resposta fora do formato interrompem a
  cadeia na hora, porque o provedor seguinte falharia igual.
- **Groq e Cerebras entram como reserva**, atrás do Gemini. Como os dois têm API compatível com
  a OpenAI, compartilham a implementação inteira: cada arquivo de provedor declara só endereço,
  nomes das variáveis de ambiente e modelo padrão. O Gemini, que tem SDK e dialeto próprios,
  implementa a interface direto — e é ele que prova que a abstração não é "OpenAI com outra URL".
- **A ordem de prioridade vira configuração** (`AI_PROVIDERS`), não código. Dá para reordenar,
  encurtar e desligar a IA por inteiro (`none`) sem deploy. Chave e modelo de cada provedor vêm
  do ambiente; nada fixo no código.
- **Provedor sem chave é pulado**, não é erro: o app roda com um provedor só, ou com três.
- **O motivo de cota passa a valer para a cadeia inteira.** Ele só chega ao usuário quando
  *todos* os provedores recusaram — que é quando o aviso da change anterior volta a ser o
  conselho certo.
- **Uma trava de teste guarda o desacoplamento**: `lib/ai/encapsulation.test.ts` varre `app/`,
  `lib/`, `components/` e `scripts/` e falha se algum arquivo fora da camada importar um SDK de
  provedor ou nomear um provedor em código.

**Fora de escopo:**

- **Repetir a chamada no mesmo provedor.** A cadeia troca de fornecedor; ela não insiste com
  quem acabou de recusar. Espera curta não resolve cota diária — isso continua valendo.
- **Escolher provedor por qualidade, custo ou tamanho do pedido.** A ordem é fixa e
  configurada; não há roteamento por conteúdo, medição de latência nem preferência aprendida.
- **Paralelizar provedores.** Um de cada vez, em ordem. Disparar para todos gastaria a cota de
  todos para usar uma resposta só.
- **Unificar o comportamento dos modelos.** Provedores diferentes escrevem diferente; o que a
  camada garante é o **formato** da resposta, revalidado por Zod, não o estilo dela. As travas
  de conteúdo (`verify.ts`, checklist de sugestões) continuam sendo o que protege o currículo.
- **Contar cota ou prever estouro.** Continua fora, como estava: o app reage ao que recebeu.
- **Provedor de xAI, OpenRouter ou OpenAI.** A camada foi feita para recebê-los — é um arquivo
  e um registro —, mas nenhum entra agora.
- **Mudar qualquer texto de tela.** Nenhuma mensagem de interface muda com esta change.

## Capabilities

### New Capabilities

- `ai-providers`: a camada de IA e a cadeia de fallback entre provedores. Encapsulamento,
  ordem de prioridade, classificação de falha, extensibilidade.

### Modified Capabilities

- `resume-import`: o requisito de cota passa a falar da cadeia — o motivo próprio de cota vale
  quando todos os provedores recusaram, e passar a vez para outro provedor não conta como
  repetir a chamada.

## Impact

- **Código tocado**: `lib/ai/` inteiro (`errors.ts`, `service.ts`, `client.ts`, `index.ts`,
  `testing.ts` e `providers/` novo), os cinco pontos que chamavam `createGeminiClient()`,
  `.env.local`, `scripts/smoke.mjs` e os testes que provavam "nenhuma chamada real" limpando
  `GEMINI_API_KEY` — que deixou de ser prova quando passou a haver mais de uma chave.
- **Comportamento**: nenhum fluxo bem-sucedido muda. Muda o que acontece quando o primeiro
  provedor não pode responder: antes o usuário via uma falha, agora vê a resposta do próximo.
- **Contrato de rota**: inalterado. Os quatro motivos de `AiFailureReason` continuam os mesmos,
  e os status HTTP também.
- **Dependências**: entra `openai` (^7), usada como cliente dos provedores compatíveis, sempre
  por import dinâmico — nunca entra no bundle do cliente. `@google/genai` continua, agora
  isolada em `providers/gemini.ts`.
- **Configuração**: `GROQ_API_KEY`/`GROQ_MODEL`, `CEREBRAS_API_KEY`/`CEREBRAS_MODEL`,
  `GEMINI_MODEL`, `AI_PROVIDERS`, `AI_LOG`, `AI_TIMEOUT_MS`. Todas opcionais: sem nenhuma
  delas, o comportamento é o de antes, com Gemini.
- **Referência de design**: nenhuma. A change não toca em interface — `claude-design/README.md`
  permanece como está, e nenhum `.dc.html` é referenciado.
