## 1. Tom de atenção na falha total da exportação

- [x] 1.1 Trocar `FailureNotice` por `WarningNotice` no ramo `error` de `ExportStep.tsx`
      **Aceite**: com o progresso em `error` (qualquer causa: `no-output` do servidor ou
      falha de rede), o aviso renderiza com as classes do `WarningNotice`; o botão "Tentar
      de novo" continua presente e funcional.
      **Visual**: `claude-design/styles.css` — mesmas cores âmbar já usadas no aviso de
      cota (`--color-warning-*`); nenhuma cor nova introduzida.
- [x] 1.2 Teste `Nenhum arquivo gerado usa o tom de atenção`
      **Aceite**: simula a resposta `422 no-output` de `/api/export`, chega ao estado de
      erro, e afirma que o aviso renderizado é o `WarningNotice` (classe `.warning`), não o
      `FailureNotice` (classe `.notice`).
- [x] 1.3 Confirmar que os avisos de falha de importação e análise não mudaram
      **Aceite**: `ImportStep` e o aviso de análise em `AppShell` continuam usando
      `FailureNotice` — nenhuma alteração fora do escopo desta change.

## 2. Fechamento

- [x] 2.1 `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run format:check` limpos
- [x] 2.2 `openspec validate export-error-attention-style --strict` sem erro
