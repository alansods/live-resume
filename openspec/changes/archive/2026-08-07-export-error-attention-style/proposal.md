## Why

A falha total da exportação ("Nenhum arquivo foi gerado") aparece hoje no mesmo tom roxo do
`FailureNotice` — a família reservada, por design, para "algo quebrou". Mas a causa mais
comum dessa falha total é a mesma da cota de IA esgotada, que já usa o tom âmbar de atenção:
tradução ou geração dependem da IA, e um limite ali (cota, indisponibilidade, timeout) derruba
a saída inteira. O tom atual sugere um defeito do app quando, na maior parte dos casos, é um
limite temporário — a mesma natureza que a cota já sinaliza em âmbar.

## What Changes

- O aviso de erro da etapa 04 (estado `error` do progresso — falha total, tanto o
  `no-output` do servidor quanto a falha de rede) passa a usar o tom de atenção (âmbar, com
  ícone), o mesmo já usado para a cota de IA esgotada — em vez do tom roxo de falha.
- Nenhuma outra tela muda: os avisos de erro de importação e de análise (etapa 01 e a
  espera entre 02 e 03) continuam no tom de falha, porque ali o significado é outro —
  arquivo ilegível, resposta que não veio.

## Capabilities

### Modified Capabilities

- `app-shell-navigation`: novo requisito sobre o tom do aviso de falha total da exportação.

## Fora de escopo

- Mudar a cor do `FailureNotice` em si, ou de qualquer outro uso dele (importação, análise).
- Mudar a lógica de quando a exportação falha totalmente — só o tom do aviso.
- Unificar `FailureNotice`/`WarningNotice` num componente só, ou remover a distinção
  documentada em `components/ui/Notice.tsx`.

## Impact

- Código: `components/shell/ExportStep.tsx` (troca de componente na renderização do estado
  de erro).
- Testes: novo teste em `components/shell/AppShell.test.tsx` ou `ExportStep` cobrindo o
  tom do aviso — hoje não há nenhum teste de UI que exercite esse estado de erro.
- Referências de design: `claude-design/styles.css` (tokens de âmbar já em uso pela cota).
- Sem impacto em rotas, na fronteira de IA ou no modelo canônico.
