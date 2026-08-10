# Currículo Vivo com Claude Code + OpenSpec

## 1. Preparar o repositório
```bash
mkdir curriculo-vivo && cd curriculo-vivo && git init
npx openspec@latest init      # cria openspec/ (project.md, specs/, changes/) e o AGENTS.md
claude                        # abre o Claude Code na raiz
```
Copie este pacote de handoff para `docs/design/` no repositório — é o material de referência que o Claude Code vai ler.

## 2. Preencher `openspec/project.md`
É o contexto permanente do projeto. Inclua:
- **Produto**: em uma frase, mais os quatro passos (importar → atualizar → revisar → exportar).
- **Stack escolhida** (ex.: Next.js + TypeScript + Tailwind; parsing em Node com `mammoth` para DOCX e `pdf-parse`/`pdfjs` para PDF; geração com `docx` e Puppeteer/React-PDF).
- **Convenções**: estrutura de pastas, padrão de testes, lint.
- **Design system**: aponte para `docs/design/styles.css` e diga que os tokens de lá são a fonte da verdade; cite Inter e Phosphor Icons.
- **Restrições de produto**: sem contas de usuário; arquivo descartado após exportação; o app nunca inventa métrica sem confirmação; modelo de currículo sempre ATS-safe (coluna única, sem tabela, datas mm/aaaa).

## 3. Fatiar em capabilities (specs)
OpenSpec organiza requisitos por *capability*. Sugestão de fatias, cada uma uma `change` própria:

| # | Capability | Entrega |
|---|---|---|
| 1 | `resume-import` | upload DOCX/PDF → estrutura canônica + relatório de parsing |
| 2 | `resume-model` | modelo canônico, IDs estáveis por trecho (`jobs.0.bullets.1`), serialização |
| 3 | `update-intake` | etapa 2: listas de formação/experiência/skills, modais, validação |
| 4 | `suggestions-metrics` | sugestões de métrica e verbo de ação |
| 5 | `suggestions-dates` | detecção de sobreposição e normalização de formato |
| 6 | `suggestions-ats` | regras de ATS (resumo, skills, cabeçalhos, datas) |
| 7 | `suggestion-review-ui` | etapa 3: papel, marcadores numerados, tooltips, aplicar/desfazer/ignorar/aplicar todas |
| 8 | `bilingual-content` | par PT/EN sincronizado, marcação de pendência, cargos por mercado |
| 9 | `export-docx-pdf` | exportação individual e .zip das 4 combinações |
| 10 | `app-shell-navigation` | home, top bar, rail de etapas, transições |

Ordem recomendada: 2 → 1 → 3 → 4/5/6 → 7 → 8 → 9 → 10 (o shell no fim, ou stub simples no começo para poder rodar).

## 4. Ciclo por change
Para cada fatia, o loop do OpenSpec:
```
/openspec:proposal   → cria openspec/changes/<id>/ com proposal.md, tasks.md e specs/ deltas
# revise a proposta e os requisitos ANTES de codar
/openspec:apply      → implementa seguindo tasks.md
/openspec:archive    → move a change para archive e atualiza openspec/specs/
```
Regras que valem a pena impor no `project.md`:
- Nenhuma linha de código antes da proposta aprovada por você.
- Cada requisito escrito como cenário verificável (`WHEN … THEN …`).
- Cada task com critério de aceite e teste correspondente.

## 5. O que passar do design
- **Sempre**: `docs/design/README.md` (o handoff — tem tokens, medidas, estados e comportamento) e `styles.css`.
- **Nas changes de UI** (3, 7, 9, 10): também o `.dc.html` da tela em questão. Diga explicitamente que é referência de comportamento e aparência, não código a copiar.
- **Nas changes de backend** (1, 2, 4, 5, 6, 8): só o README — a seção "Backend / dados" e a lista de tipos de sugestão bastam.

## 6. Imagens
Nenhum asset raster é necessário; o design é todo tokens + Phosphor Icons. Screenshots são úteis apenas como conferência visual da etapa 3 (papel do currículo + marcadores + painel) e do modal da etapa 2 — peça se quiser que eu gere e adicione ao pacote.

## 7. Definição de pronto por change
- Requisitos do delta cobertos por teste.
- UI comparada lado a lado com o `.dc.html` correspondente.
- Nada de dado inventado: toda métrica sugerida vem do texto importado ou do que o usuário digitou.
- Export validado num leitor de ATS real (ou parser open source) antes de fechar a change 9.
