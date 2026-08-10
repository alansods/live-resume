## 1. Modelo

- [x] 1.1 Trocar `DEFAULT_MODEL` para `gemini-3.6-flash` em `lib/ai/client.ts`, registrando no
  comentário por que é fixado por versão e não um alias.
  **Aceite**: `grep gemini-2.5-flash` não encontra mais nada no repositório; a suíte continua
  passando sem alteração (a fronteira do modelo é mockada, então nenhum teste depende do
  nome).

## 2. Fechamento

- [x] 2.1 Confirmar que as quatro chamadas reais respondem, com a chave no ambiente.
  **Aceite**: `POST /api/resume-import` devolve 200 com um currículo válido, contra o servidor
  de desenvolvimento — o que hoje devolve 502.
- [x] 2.2 Verificar qualidade e arquivar.
  **Aceite**: `npm test`, `npm run build`, `npm run lint` e `npx tsc --noEmit` passam;
  `openspec archive model-upgrade --yes`.
