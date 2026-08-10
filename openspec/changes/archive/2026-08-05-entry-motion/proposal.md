## Why

Duas decisões de produto ficaram abertas desde a change `home-page`, que as registrou
explicitamente como "decisão sua". Foram tomadas agora:

- **A landing não entra no escopo.** Ao ler `claude-design/CurriculoVivoLanding.dc.html`
  inteira, ela se revelou a página de **outro produto**: promete desfazer nas sugestões, "duas
  versões vivas" em PT e inglês no mesmo documento com par sincronizado, e um bloco de preço
  com assinatura, histórico de versões e currículo ajustado por vaga. As três primeiras
  contrariam invariantes do `openspec/config.yaml` — não existe desfazer, o modelo é
  monolíngue, e não há conta nem cobrança no escopo. Construí-la hoje exigiria remover metade
  do que ela diz.
- **A transição entre páginas fica só na entrada.** A página de destino já entra com
  `pageIn`; o que falta do protótipo é o fade-out **antes** de navegar, e ele exige
  interceptar o clique. O CTA da home é um `Link` de verdade por decisão registrada em
  `Home.tsx` — funciona com clique do meio, nova aba e sem JavaScript —, e trocar isso por
  200ms de animação num fluxo que já tem dois minutos e meio de espera de IA é caro pelo que
  entrega.

Decidir "manter como está" não produz código de fluxo, mas produz duas obrigações. A
primeira é registrar a decisão para ela não voltar à mesa a cada sessão. A segunda apareceu
ao conferir o que existe: **três animações ignoram `prefers-reduced-motion`** — a da home
(`pageIn`), a das etapas do shell e a da revisão (`stepIn`). A da etapa 02 e a dos primitivos
respeitam. Uma animação que a pessoa não consegue desligar não é acabamento: é um problema de
acessibilidade, e é justamente a animação que a decisão acima escolheu manter.

## What Changes

- **A animação de entrada passa a respeitar a preferência de movimento**, nas três telas que
  faltavam. Quem pede menos movimento no sistema vê a página aparecer, sem transição.
- **A navegação da home para o fluxo vira requisito**, e não só um comentário no componente:
  a chamada para ação é um link de verdade, a navegação não espera animação nenhuma, e
  ninguém pode "melhorá-la" interceptando o clique sem quebrar um teste.
- **A decisão sobre a landing entra no `openspec/config.yaml`**, junto do contexto de
  produto, com o motivo. É lá que mora o que o produto é e não é.

**Fora de escopo:**

- **Construir a landing**, em qualquer rota. Fica adiada, com as divergências escritas: se um
  dia houver assinatura, histórico de versões e ajuste por vaga, ela volta como change própria
  — e aí é só construir, sem editar promessa.
- **O fade-out ao navegar.** É a decisão que acabou de ser tomada; reabri-la é mudar a
  decisão, não implementá-la.
- **Trocar as animações que já existem.** Duração, curva e deslocamento seguem o handoff e não
  mudam; o que muda é poder desligá-las.
- **Auditar movimento no resto do app.** As animações de modal e de etapa 02 já respeitam a
  preferência; nada mais anima.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-page`: ganha o requisito de que o caminho para o fluxo é um link de verdade, sem
  interceptação, e de que a animação de entrada é desligável.
- `app-shell-navigation`: ganha o requisito de que a animação de entrada das etapas respeita a
  preferência de movimento do sistema.

## Impact

- **Código tocado**: `components/home/Home.module.css`, `components/shell/Shell.module.css`,
  `components/suggestion-review/Review.module.css` (uma consulta de mídia em cada);
  `openspec/config.yaml` (a decisão sobre a landing).
- **Comportamento**: nenhum fluxo muda. Para quem não pede menos movimento, nada muda na tela.
- **Dependências**: nenhuma.
- **Consequência registrada**: `openspec/config.yaml` é o arquivo das invariantes, e passa a
  dizer que a landing está fora do escopo. Se o produto ganhar assinatura, essa linha é a
  primeira a mudar.
- **Referência de design**: `claude-design/README.md`, seção "Interações e comportamento"
  (transição entre páginas); `claude-design/CurriculoVivoLanding.dc.html`, lido inteiro para a
  decisão e **não recriado**.
