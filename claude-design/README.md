# Handoff: Currículo Vivo

## Visão geral
Aplicação web que atualiza currículos: o usuário importa o currículo antigo (DOCX/PDF), informa o que mudou (formação, experiência, habilidades), revisa sugestões automáticas (métricas, inconsistências de data, regras de ATS) e exporta o resultado em PT-BR e/ou inglês, em DOCX e/ou PDF. Serve a qualquer área profissional, não só tecnologia.

## Sobre os arquivos de design
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é **recriar esses designs no ambiente do codebase alvo** (React, Vue, Next, etc.) com os padrões e bibliotecas já estabelecidos ali. Se ainda não existe codebase, escolha o framework mais adequado e implemente os designs nele.

## Fidelidade
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, estados e microinterações são finais. Recrie a UI fielmente usando os componentes do codebase.

## Telas

### 1. Home (`CurriculoVivoHome.dc.html`)
- **Objetivo**: apresentar o produto e levar o usuário ao fluxo.
- **Layout**: top bar fixa (altura ~46px, `padding: 12px 24px`, fundo `#1c1e2b`, hairline inferior `rgba(233,233,237,0.08)`) com o nome "Currículo Vivo" (15px, weight 500, `#9184d9`) à esquerda e o toggle PT-BR/EN à direita. Conteúdo em coluna central `max-width: 1120px`, `padding: 0 24px 112px`.
- **Header**: grid de 2 colunas `minmax(0,1.35fr) minmax(0,1fr)`, `gap: 56px`, alinhado ao fim, `margin-bottom: 72px`.
  - H1 52px, `max-width: 15ch`, `text-wrap: pretty`: "Atualizar o currículo deveria levar dez minutos."
  - Parágrafo 17px, `max-width: 52ch`, opacidade .82, com `<code>` em `#d2cefd`.
  - CTA primário "Começar agora" + ícone `ph-arrow-right`, 15px, `padding: 11px 22px`. Navega para a aplicação.
  - Coluna direita: tags `PT-BR ⇄ EN`, `DOCX · PDF`, `ATS-first` e nota de download em lote.
- **Fluxo**: grid de 4 cards (`repeat(4, minmax(0,1fr))`, gap 16px): 01 Importa, 02 Atualiza, 03 Revisa, 04 Exporta.

### 2. Aplicação — shell (`CurriculoVivoApp.dc.html`)
- **Top bar** idêntica à home, mais um link "Voltar" (13px, `#b2b6ca`, ícone `ph-arrow-left`) e um divisor vertical 1px.
- **Rail lateral**: largura 236px, `padding: 24px 18px`, borda direita `rgba(233,233,237,0.10)`. Título "Etapas · 4 passos" e quatro botões full-width, cada um com o número (11px, opacidade .6, largura fixa 16px) seguido do rótulo: 01 Importar, 02 Atualizar, 03 Revisar, 04 Exportar. Etapa ativa usa `btn-primary`; as outras, `btn-ghost`.
- **Área de conteúdo**: `flex: 1`, `overflow: auto`. Cada etapa entra com `animation: stepIn .22s ease-out` (`opacity 0 → 1`, `translateY(8px) → 0`).
- **Cabeçalho de etapa**: kicker "PASSO 0X DE 04" (12px, letter-spacing .08em, cor muted) + `<h2>` + linha de apoio.
- **Navegação de etapa** ao pé do conteúdo: `margin-top: 36px`, `padding-top: 20px`, borda superior hairline; "Voltar" (`btn-secondary`) à esquerda e "Avançar" (`btn-primary`, `margin-left: auto`) à direita, desabilitados nos extremos.

### 3. Etapa 01 — Importar
- Coluna `max-width: 720px`, `padding: 56px 48px`.
- Dropzone: borda tracejada `1px dashed #595d6c`, raio 14px, `padding: 44px`, fundo `#1e2030`, ícone `ph-file-arrow-up` 34px `#9184d9`, texto "Arraste o arquivo aqui", separador "ou", botão "Selecionar arquivo".
- Após importar: linha de confirmação (fundo `#2b2741`, raio 8px) com `ph-check-circle` `#b5abfc`, nome do arquivo e metadados; campo de área de atuação.

### 4. Etapa 02 — Atualizar
- Coluna `max-width: 920px`, `padding: 56px 48px`. Três seções empilhadas com `gap: 26px`: **Formação e certificações**, **Experiências e promoções**, **Novas habilidades**.
- Cada cabeçalho de seção: ícone (`ph-graduation-cap`, `ph-briefcase`, `ph-code`) `#9184d9`, rótulo 14px/500, contador de itens (11px muted) e botão `btn-secondary` "Adicionar …" com `ph-plus`, no tamanho padrão de `.btn` (não miniaturizado).
- Cada item é um card `#1e2030`, raio 8px, `padding: 18px`, com "Remover" (`btn-ghost` + `ph-trash`) alinhado à direita **acima** dos campos, e os campos abaixo em linhas flex com `gap: 12px`.
  - Formação: Curso (flex 2), Instituição (flex 1); Início e Conclusão (flex 1 cada).
  - Experiência: Empresa, Cargo (flex 1), Início e Fim (largura 110px); textarea "O que você entregou? (números ajudam)" `min-height: 86px`.
  - Habilidade: chip com input de 170px e botão `ph-x`.
- Lista vazia mostra texto muted explicativo.
- **Adicionar é sempre via modal**, nunca linha em branco inline. Modal: overlay `position: fixed; inset: 0` centralizado com `display: flex; align-items: center; justify-content: center`, cor `rgba(10,10,16,0.6)` com `animation: modalFade .18s ease-out`; caixa 420px (`max-width: 90vw`), `padding: 26px`, raio 10px, fundo `#232532`, `box-shadow: 0 0 0 1px #595d6c, 0 24px 60px rgba(0,0,0,0.6)`, `animation: modalPop .2s ease-out` (`scale(.94) translateY(6px) → scale(1)`). Título dinâmico ("Nova formação/experiência/habilidade"), campos do tipo, ações "Cancelar" e "Adicionar". Fecha ao clicar no overlay (clique interno com `stopPropagation`) ou pressionar Esc.
- Nota final em `#2b2741` com `ph-lightbulb`: o app propõe métrica provável, nunca inventa dado sozinho.

### 5. Etapa 03 — Revisar
- Grid `repeat(auto-fit, minmax(460px,1fr))` — currículo à esquerda, painel de sugestões à direita; empilha em telas estreitas.
- **Papel do currículo**: fundo `#f3f5fe`, texto `#292b31`, `padding: 44px 48px`, raio 4px, `font-size: 12.5px`, `line-height: 1.5`, `min-width: 460px`, `max-width: 760px`, sombra `0 16px 40px rgba(0,0,0,0.45)`. Nome 22px/600; cargo 13px; contato 11px `#595d6c`; divisor 1px `#cfd3e5`; títulos de seção 11px/600, uppercase, letter-spacing .08em, cor `#595d6c`.
- **Marcadores de sugestão**: círculo 15px `#796cbf`, texto 9px/600 `#f5f4ff`, `vertical-align: super`, colado ao fim do trecho (resumo, bullet, período ou habilidades). No hover abre um tooltip 290px (fundo `#232532`, raio 8px, `box-shadow: 0 0 0 1px #595d6c, 0 16px 40px rgba(0,0,0,0.65)`) com tipo + número, título da sugestão, texto proposto em `#d2cefd` e botão "Ver detalhes". O lado do tooltip é escolhido em runtime pela posição medida do marcador (mede `getBoundingClientRect()` e ancora à direita quando falta espaço).
- **"Ver detalhes"** (e o clique no próprio marcador) rola o primeiro ancestral rolável até o cartão correspondente (`id="sug-<n>"`, offset −24px) e marca o cartão como "em foco".
- **Cartões de sugestão**: fundo `#1e2030`, raio 8px, `padding: 14px`, `gap: 8px`. Contêm: badge numérico 18px, tag de tipo (Métrica / Datas / ATS), local, título 14px/500, texto atual riscado (`text-decoration: line-through`, cor `#b2b6ca`, linha `#75798c`), texto proposto `#d2cefd`, justificativa 11.5px muted e ações "Aplicar"/"Corrigir data"/"Normalizar" + "Ignorar". Aplicado exibe `ph-check` `#b5abfc` e "Desfazer".
- Cabeçalho do painel: "Sugestões", nota "os números aparecem no currículo", contador de pendências e "Aplicar todas".
- Score de ATS: 10 segmentos de 4px (`#9184d9` preenchido, `#3f424d` vazio) com nota textual.

### 6. Etapa 04 — Exportar
- Coluna `max-width: 760px`, `padding: 56px 48px`.
- Checkboxes (quadrados, `border-radius: 4px`) para **Português (BR)** / **English** e **PDF (texto selecionável)** / **DOCX (estilos nativos)**.
- CTA primário com `ph-download-simple` cujo rótulo é `idiomas × formatos`: "Baixar N arquivos" (ou "Selecione idioma e formato" com zero). Nota: "Um clique baixa todas as versões marcadas, em .zip".
- Lista de garantias de ATS (coluna única, sem tabela, datas mm/aaaa, PDF com texto selecionável, uma fonte, nome de arquivo padronizado).

## Interações e comportamento
- **Navegação de etapas**: rail lateral, botões Voltar/Avançar; `step` limitado a 1–4.
- **Transição entre páginas** (home ⇄ app): fade-out do body (`opacity → 0`, 200ms) antes de navegar; a página de destino entra com `@keyframes pageIn` (250ms).
- **Toggle de idioma**: pílula com fundo deslizante (`transform: translateX(0 → 100%)`, `transition: transform .22s ease`). Trocar o idioma re-renderiza currículo, sugestões e tooltips no idioma escolhido.
- **Aceitar sugestão**: aplica o texto proposto ao caminho correspondente (`jobs.0.bullets.0`, `summary`, `skills`, `jobs.2.period`…), marca o trecho como "atualizado" no papel e o cartão como aplicado; "Desfazer" reverte; "Ignorar" remove o cartão e o marcador; "Aplicar todas" aplica tudo o que não foi ignorado.
- **Filtro de sugestões** por tipo; estado vazio informa que nada está pendente.
- **Campos controlados**: todos os inputs da etapa 2 são controlados por estado (remover apaga o item certo e nada digitado se perde).

## Estado necessário
```
step: 1..4
imported: boolean
lang: 'pt' | 'en'
done: Record<suggestionId, true>
dismissed: Record<suggestionId, true>
filter: 'all' | 'metric' | 'dates' | 'ats'
focusedSug: string | null
hoverMark: string | null      // caminho do trecho sob o cursor
hoverRight: boolean           // tooltip ancorado à direita
eduItems / jobItems / skillItems: Item[]  (id + campos)
nextId: number
modal: 'edu' | 'job' | 'skill' | null
draft: objeto do item em criação
exp: { pt, en, pdf, docx }: boolean
```
Derivados: currículo com patches aplicados, mapa `path → sugestão`, contagem de pendências, score de ATS, rótulo do botão de download.

## Backend / dados (a especificar no SDD)
- Parse de DOCX e PDF → estrutura canônica (cabeçalho, resumo, experiências com bullets, formação, habilidades).
- Geração de sugestões: métricas ausentes, verbos genéricos, sobreposição e formato de datas, regras de ATS.
- Tradução PT⇄EN mantendo par sincronizado (editar um lado marca o outro como pendente) e equivalência de cargos por mercado.
- Exportação DOCX (estilos nativos de parágrafo) e PDF (texto selecionável), individual ou em .zip.
- Nenhuma conta de usuário no escopo atual; arquivo processado e descartado após exportação.

## Design tokens (Nocturne)
Cores base: bg `#161826`, superfície `#232532`, texto `#e9e9ed`, accent `#9184d9`, accent-2 `#a7a1db`, divisor `color-mix(in srgb, #e9e9ed 16%, transparent)`.
Neutros 100→900: `#f3f5fe #e4e7f5 #cfd3e5 #b2b6ca #9397ab #75798c #595d6c #3f424d #292b31`.
Accent 100→900: `#f5f4ff #e7e5fe #d2cefd #b5abfc #968ae0 #796cbf #5d5294 #423a6a #2b2741`.
Atenção (âmbar) 100→900: `#fff9ec #fdf0cf #f8e2a4 #f0cd6d #d9b34a #b08f36 #866c2a #5c4a20 #3a3018`. Única família fora do accent, reservada a avisos que não são falha do app — cota diária esgotada. Cartão: fundo `warning-900`, borda `warning-400` a 28%, ícone `ph-warning` em `warning-400`.
Superfícies locais do app: header `#1c1e2b`, card `#1e2030`.
Tipografia: Inter (headings weight 500), corpo Inter.
Espaço: 2.8 / 5.6 / 8.4 / 11.2 / 16.8 / 22.4px. Raio: 4 / 8 / 14px.
Sombras: sm `0 0 0 1px #3f424d`; md `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55)`; lg `0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,0.65)`.

## Assets
- Ícones: [Phosphor Icons](https://phosphoricons.com) (weight regular), via CDN `@phosphor-icons/web@2.1.1`.
- Nenhuma imagem raster. Sem logotipo definido.
- `styles.css` (incluído) traz todos os tokens e classes do design system.

## Arquivos deste pacote
- `CurriculoVivoHome.dc.html` — home da aplicação.
- `CurriculoVivoApp.dc.html` — as quatro etapas, sugestões, marcadores, modais e exportação.
- `CurriculoVivo.dc.html` — página de proposta do produto (contexto e racional).
- `CurriculoVivoLanding.dc.html` — landing page.
- `styles.css` — tokens e classes do design system Nocturne.
- `SDD_OPENSPEC.md` — como conduzir o desenvolvimento com Claude Code + OpenSpec.
- `PROMPTS.md` — prompts prontos para cada fase.
