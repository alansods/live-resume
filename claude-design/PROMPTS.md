# Prompts para Claude Code

## Bootstrap (uma vez, na raiz do repo)
```
Leia docs/design/README.md e docs/design/SDD_OPENSPEC.md.
Preencha openspec/project.md com: produto, stack (proponha e justifique em 3 linhas),
convenções de código e teste, design system (tokens em docs/design/styles.css, Inter,
Phosphor Icons) e as restrições de produto listadas no handoff.
Não escreva código de aplicação ainda. Ao final, liste as capabilities que você
pretende criar e espere minha aprovação.
```

## Proposta de uma change
```
/openspec:proposal

Capability: resume-import
Contexto: docs/design/README.md (seções "Visão geral", "Etapa 01 — Importar" e "Backend / dados").
Escopo: receber DOCX ou PDF e produzir o modelo canônico do currículo, com relatório
de parsing (nº de experiências, formações, bullets sem número, datas conflitantes).
Fora de escopo: UI final, sugestões, exportação.
Escreva os requisitos como cenários WHEN/THEN e liste as tasks com critério de aceite.
```

## Change de UI
```
/openspec:proposal

Capability: suggestion-review-ui
Referências: docs/design/README.md (seção "Etapa 03 — Revisar", "Design tokens",
"Interações e comportamento") e docs/design/CurriculoVivoApp.dc.html.
Os arquivos .dc.html são referência de aparência e comportamento — recrie no nosso
stack, não copie o HTML. Fidelidade alta: use os hex, medidas, raios e sombras do handoff.
Cubra: marcadores numerados ancorados ao trecho, tooltip com lado escolhido em runtime,
"Ver detalhes" rolando até o cartão, aplicar / desfazer / ignorar / aplicar todas,
filtro por tipo e score de ATS em 10 segmentos.
```

## Implementação
```
/openspec:apply

Implemente a change <id> seguindo tasks.md na ordem.
Pare e me mostre o diff quando terminar cada task com critério de aceite visual.
```

## Conferência visual
```
Compare o componente implementado com docs/design/CurriculoVivoApp.dc.html
(etapa 3). Liste divergências de cor, tamanho, espaçamento, raio, sombra e estado,
com o valor esperado e o valor atual. Não corrija nada até eu escolher.
```

## Fechamento
```
/openspec:archive

Arquive a change <id>. Atualize openspec/specs/ com os requisitos finais e
confirme que todos os cenários têm teste correspondente.
```

## Guardas úteis para colar no project.md
```
- Nenhum código antes de proposta aprovada.
- Nenhuma métrica ou data inventada: toda sugestão cita a origem (texto importado
  ou entrada do usuário) e exige confirmação do usuário.
- O documento exportado é sempre ATS-safe: coluna única, sem tabelas, caixas de texto
  ou barras de proficiência; datas mm/aaaa; PDF com texto selecionável.
- Nenhuma feature de conta/login no escopo.
```
