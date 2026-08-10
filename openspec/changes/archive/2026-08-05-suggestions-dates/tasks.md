## 1. Sobreposição

- [x] 1.1 Implementar a detecção de pares sobrepostos em `lib/suggestions/dates.ts`,
  reutilizando `periodsOverlap`, calculando os meses de sobreposição e ignorando períodos
  incompletos.
  **Aceite**: cenários "Par sobreposto vira sugestão", "Períodos sem sobreposição não geram
  sugestão", "Período incompleto não é comparado" e "Experiência em curso sobrepõe as
  posteriores".
- [x] 1.2 Derivar a correção do início da experiência seguinte, endereçando o período da
  anterior, com a justificativa citando a data de origem e a sugestão marcada como derivada.
  **Aceite**: cenários "Fim proposto é o mês anterior ao início seguinte", "A justificativa
  cita a data de origem", "Correção incide sobre a experiência anterior", "Sem base para
  derivar, não há proposta de data", "Local nomeia as duas experiências" e "Correção derivada
  não é marcada como inferida".

## 2. Organização de períodos incompletos

- [x] 2.1 Propor período completo em `mm/aaaa` para cada período sem mês, preservando os
  anos, derivando o mês de datas vizinhas quando possível e inferindo (janeiro no início,
  dezembro no fim) quando não houver como derivar.
  **Aceite**: cenários "Período sem mês recebe proposta completa", "Mês derivado de vizinho
  não é inferido", "Período completo não é apontado" e "Formação incompleta também é
  organizada".
- [x] 2.2 Marcar as sugestões com mês inferido e expor a exigência do aviso.
  **Aceite**: cenários "Mês inferido é marcado como tal", "Inferência exige o aviso", "Sem
  inferência, sem aviso" e "Currículo sem defeito de data não exige aviso".

## 3. Contrato comum

- [x] 3.1 Respeitar o modelo de sugestão, a unicidade por trecho (sobreposição antes de
  incompletude) e a imutabilidade do currículo.
  **Aceite**: cenários "Modelo comum é respeitado", "Um trecho, uma sugestão de data", "O que
  o usuário informou tem precedência" e "Currículo permanece intacto ao sugerir datas".
- [x] 3.2 Verificar o determinismo e a ausência de IA.
  **Aceite**: cenários "Mesmo currículo, mesmas sugestões" e "Nenhuma chamada de IA" —
  teste que o módulo não importa nada de `lib/ai/`.

## 4. Fechamento

- [x] 4.1 Verificar cobertura e qualidade.
  **Aceite**: o teste de cobertura reconhece os cenários desta capability; `npm test`,
  `npm run build`, `npm run lint` e `npx tsc --noEmit` passam.
