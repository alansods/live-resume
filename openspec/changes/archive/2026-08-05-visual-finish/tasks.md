## 1. Top bar comum

- [x] 1.1 Criar `components/ui/TopBar.tsx` com marca, toggle de idioma (a pílula da home) e
  link de volta opcional (`ph-arrow-left`, 13px, divisor vertical antes).
  **Aceite**: cenários "As duas telas usam a mesma top bar" e "A home usa a top bar do
  produto". Critério visual: altura 46px, `padding: 12px 24px`, marca 15px/500 accent,
  hairline inferior — conforme `claude-design/README.md`, seções "1. Home" e "2. Aplicação".
- [x] 1.2 Home e `AppShell` passam a usar a `TopBar`; as regras duplicadas saem dos dois CSS.
  **Aceite**: `Home.module.css` e `Shell.module.css` não definem mais `topBar`, `brand`,
  `langToggle`, `lang` nem `langOn`.
- [x] 1.3 Acrescentar ao dicionário o rótulo acessível do link de volta, em PT e EN.
  **Aceite**: cenários "O caminho de volta é distinguível do voltar de etapa", "Voltar à home
  não muda a etapa", "A top bar leva de volta à home", "A home não oferece caminho de volta
  para si mesma" e "O rótulo acessível do caminho de volta muda com o idioma".

## 2. Ícones

- [x] 2.1 Home: `ph-arrow-right` no CTA.
  **Aceite**: cenário "O ícone da chamada não vira o rótulo dela"; os cenários "A chamada leva
  ao fluxo" e "A chamada é identificável" continuam passando.
- [x] 2.2 Etapa 01: `ph-file-arrow-up` (34px, accent) na dropzone e `ph-check-circle` na linha
  de confirmação. Etapa 04: `ph-translate` e `ph-files` nas legendas e `ph-download-simple` no
  botão. Navegação de etapa: `ph-arrow-left` e `ph-arrow-right`.
  **Aceite**: cenário "Os ícones do handoff estão nos seus lugares". Critério visual comparado
  às seções "3. Etapa 01" e "6. Etapa 04" do handoff.
- [x] 2.3 Todo ícone com `aria-hidden`.
  **Aceite**: cenários "Ícone não vira rótulo de controle" e "Nenhuma cor fora do design
  system no shell".

## 3. Fechamento

- [x] 3.1 Conferir home e etapas 01 e 04 no navegador contra os `.dc.html`.
  **Aceite**: screenshot das duas telas comparado ao protótipo; a top bar é indistinguível
  entre elas. **Feito em parte**: home e etapa 01, sim — as duas top bars saíram idênticas, o
  link de volta com seta e divisor está lá, e a dropzone e os botões de navegação têm os seus
  ícones. A **etapa 04 não**: chegar nela exige importar, que exige `GEMINI_API_KEY` (item 5).
  Os ícones dela estão cobertos pelo cenário "Os ícones do handoff estão nos seus lugares".
- [x] 3.2 Verificar qualidade e arquivar.
  **Aceite**: nenhum teste de **comportamento** precisou mudar; `lib/spec-coverage.test.ts`
  reconhece os cenários novos; `npm test`, `npm run build`, `npm run lint` e `npx tsc
  --noEmit` passam; `openspec archive visual-finish --yes`.
