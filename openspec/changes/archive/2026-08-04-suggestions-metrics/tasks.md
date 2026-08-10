## 1. Modelo de sugestão

- [x] 1.1 Definir o modelo em `lib/suggestions/model.ts` — id, tipo, path, local, título,
  texto atual, texto proposto, justificativa, rótulo de ação e números não apoiados — com
  schema Zod e tipos por `z.infer`.
  **Aceite**: cenários "Sugestão traz o que o cartão precisa exibir" e "Ids são únicos no
  conjunto".
- [x] 1.2 Implementar a validação de conjunto em `lib/suggestions/validate.ts`: descartar
  path que não resolve ou que não endereça bullet, e manter no máximo uma por path.
  **Aceite**: cenários "Path inexistente é descartado", "Path malformado é descartado",
  "Todas as sugestões entregues resolvem", "Duas propostas para o mesmo bullet viram uma"
  e "Paths distintos convivem".

## 2. Números não apoiados

- [x] 2.1 Implementar a extração de números e a comparação com o material do usuário
  (currículo importado + itens digitados na etapa 02) em `lib/suggestions/numbers.ts`,
  normalizando separador de milhar e decimal.
  **Aceite**: cenários "Número inédito é sinalizado", "Número que o usuário escreveu não é
  sinalizado", "Proposta sem número não sinaliza nada" e "Sinalização não impede a
  sugestão".

## 3. Geração pela IA

- [x] 3.1 Escrever o prompt e o schema de saída em `lib/ai/suggest-metrics.ts`, cobrindo
  métrica ausente e verbo genérico, com o port de IA já existente e respostas gravadas
  para os testes.
  **Aceite**: cenários "Bullet sem número recebe proposta", "Verbo genérico recebe
  proposta", "Proposta começa por verbo de ação" e "Nenhuma chamada real na suíte".
- [x] 3.2 Preencher texto atual e local a partir do currículo, e garantir que o sentido do
  bullet é preservado.
  **Aceite**: cenários "Texto atual corresponde ao trecho", "O sentido do bullet é
  preservado" e "Bullet que já tem métrica não recebe proposta de métrica".
- [x] 3.3 Tratar as falhas: resposta fora do esquema, comunicação e currículo sem bullets.
  **Aceite**: cenários "Resposta fora do esquema é rejeitada", "Falha de comunicação é
  distinguível" e "Currículo sem bullets não é erro".

## 4. Invariantes

- [x] 4.1 Garantir que sugerir não altera o currículo.
  **Aceite**: cenários "Currículo permanece intacto" e "Nenhuma sugestão vem aplicada".

## 5. Fronteira HTTP

- [x] 5.1 Criar o route handler em `app/api/suggestions/metrics/route.ts`, recebendo o
  currículo serializado e devolvendo as sugestões, com tradução de erro para status.
  **Aceite**: erros da IA viram status distinguíveis; nenhum conteúdo de currículo em log.

## 6. Fechamento

- [x] 6.1 Verificar cobertura e qualidade.
  **Aceite**: o teste de cobertura reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
