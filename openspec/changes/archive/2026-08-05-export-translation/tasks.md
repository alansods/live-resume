## 1. Data por idioma

- [x] 1.1 Implementar `formatPeriodForLocale(period, locale)` em `lib/export/dates.ts`:
  `mm/aaaa` + `atual` em português, mês abreviado + `Present` em inglês, período incompleto
  com o texto original. `formatPeriod` de `resume-model` não muda.
  **Aceite**: cenários "Data em português usa mm/aaaa", "Data em inglês usa mês abreviado",
  "Fim aberto usa o rótulo do idioma" e "Período incompleto sai com o texto do arquivo".

## 2. Verificação da tradução

- [x] 2.1 Implementar a verificação de estrutura em `lib/export/translation.ts`: mesmos ids,
  mesmas contagens e mesma ordem; item faltando, sobrando ou desconhecido é recusado.
  **Aceite**: cenários "Ids e contagens são os mesmos", "Resposta que perde um bullet é
  recusada" e "Resposta que inventa item é recusada".
- [x] 2.2 Implementar a verificação de números por trecho, sobre `extractNumbers`.
  **Aceite**: cenários "Percentual sobrevive à tradução", "Número alterado é recusado",
  "Número inventado é recusado" e "Trecho sem número não é afetado pela verificação".

## 3. Tradução pela IA

- [x] 3.1 Implementar `translateResume` em `lib/ai/translate-resume.ts`: `responseSchema` só
  com os campos traduzíveis mais o idioma identificado, currículo montado campo a campo a
  partir do original, e nomes próprios, contato e períodos vindos sempre da entrada.
  **Aceite**: cenários "Bullets saem no idioma marcado", "Resumo, cargos, curso e habilidades
  também são traduzidos", "Seção ausente não é criada na tradução", "Nome da empresa atravessa
  intacto", "Nome da pessoa e contato atravessam intactos", "Instituição de ensino atravessa
  intacta" e "Período não é alterado pela tradução".
- [x] 3.2 Descartar a resposta quando o idioma identificado for o de saída, devolvendo o
  currículo de entrada como está.
  **Aceite**: cenários "Idioma coincidente devolve o original" e "Resposta é descartada quando
  o idioma coincide".
- [x] 3.3 Propagar erro em falha de comunicação, resposta fora do esquema e verificação
  reprovada — sem nenhum caminho que devolva o currículo de origem no lugar da tradução.
  **Aceite**: cenários "Falha de comunicação na tradução é distinguível" e "Tradução não
  degrada para o original".
- [x] 3.4 Marcar todo trecho traduzido com origem proposta e confirmada, conservando a origem
  dos trechos não traduzidos.
  **Aceite**: cenários "Trecho traduzido registra origem de máquina" e "Trecho não traduzido
  conserva a origem".

## 4. Fechamento

- [x] 4.1 Verificar isolamento da IA nos testes.
  **Aceite**: cenário "Nenhuma chamada real de tradução na suíte" — os testes injetam
  `recordedClient`/`failingClient`/`neverCalledClient`.
- [x] 4.2 Verificar cobertura e qualidade.
  **Aceite**: `lib/spec-coverage.test.ts` reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
