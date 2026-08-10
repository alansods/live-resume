## Context

Ver `proposal.md — Why`. O que condiciona a solução:

- `components/ui/ui.test.tsx` tem um guard que quebra com qualquer cor literal em
  `components/`, incluindo CSS. Tudo sai dos tokens.
- Há um segundo guard, em `UpdateIntake.test.tsx` e `AppShell.test.tsx`, que varre o JSX
  atrás de texto de interface fixo em componente.
- `@phosphor-icons/react` já é dependência e já é usada na etapa 02, com `size` numérico —
  o padrão a seguir.
- A home é renderizada por um Server Component (`app/page.tsx`) e o shell por um Client
  Component. As duas top bars de hoje já são cliente, porque o toggle tem estado.

## Goals / Non-Goals

**Goals:**

- Uma top bar só, com a aparência do handoff, nas duas telas.
- Ícone como decoração, nunca como rótulo.

**Non-Goals:**

- Animação (fundo deslizante do toggle, fade entre páginas) — vai junto com a transição de
  página, que é decisão do item 4.
- Redesenhar qualquer coisa. Onde o código já bate com o handoff, ele não é tocado.

## Decisions

### 1. `TopBar` mora em `components/ui/`, não em `shell/` nem em `home/`

É usada pelas duas features e não pertence a nenhuma. Fica ao lado dos outros primitivos, e é
o que torna verificável o requisito "uma única top bar": duas telas importando o mesmo
componente não podem divergir.

A prop de volta é opcional (`backHref`), e a home simplesmente não a passa. Alternativa
descartada: uma prop `variant: "home" | "app"` — ela reintroduz a diferença que a change
existe para apagar.

### 2. O toggle adotado é o da home

A pílula com fundo de superfície e sem borda é o que o handoff descreve. O do shell, com
borda de 1px por botão, é a versão que ninguém especificou. Adotar o da home é escolher entre
duas implementações, não redesenhar.

O `aria-pressed` de cada botão e o `role="group"` continuam como estão — a acessibilidade do
toggle já estava certa nos dois.

### 3. Ícones entram como `aria-hidden`

Todo ícone é decorativo: o nome acessível do controle continua vindo do texto, que vem do
i18n. É a mesma regra do modelo padrão do currículo ("sem ícone no lugar de rótulo") aplicada
à interface, e é o que o cenário "Ícone não vira rótulo de controle" verifica.

`@phosphor-icons/react` não marca os seus SVGs como escondidos por padrão, então o
`aria-hidden` é explícito em cada uso.

### 4. Os dois "Voltar" se separam pelo rótulo acessível

Texto visível igual nos dois, como no protótipo. O da top bar recebe `aria-label` próprio,
vindo do dicionário (`shell.backHomeLabel`), em PT e EN. É o mínimo que resolve a ambiguidade
sem inventar uma palavra que o handoff não escolheu.

Consequência para os testes: `getByRole("button", { name: "Voltar" })` continua encontrando o
botão de etapa, porque o link de volta é `link`, não `button`, e tem outro nome acessível.

### 5. Nada de comportamento muda

Nenhuma rota, nenhum estado, nenhuma prop de dados. O critério de pronto inclui a suíte
inteira passando **sem** alteração em teste de comportamento: se um deles precisar mudar, a
change passou do escopo dela.

## Risks / Trade-offs

- **Trocar o toggle do shell muda pixels em telas já aprovadas** → é o objetivo; a aprovação
  anterior era da versão divergente.
- **O `aria-label` do link de volta é texto de interface novo** → entra no dicionário nos dois
  idiomas, e o cenário "O rótulo acessível do caminho de volta muda com o idioma" impede que
  ele fossilize em português.
