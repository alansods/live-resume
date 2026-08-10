## Context

Ver `proposal.md` — Why. A dificuldade não é guardar; é guardar num app renderizado no
servidor sem que o primeiro render do cliente discorde do HTML que veio pronto. O servidor
não tem como saber a preferência: ela vive no navegador.

## Goals / Non-Goals

**Goals**

- A escolha sobrevive à recarga sem que a hidratação acuse divergência.
- O que está guardado é a única verdade — sem uma segunda cópia em memória que possa
  discordar dela.

**Non-Goals**

- Evitar o instante inicial em que a interface aparece no padrão antes de assumir o idioma
  guardado. Eliminá-lo exigiria cookie lido no servidor ou script bloqueante antes da
  pintura — preço alto para um toggle de interface.
- Guardar qualquer outro estado do fluxo (fora de escopo na proposta).

## Decisions

**1. Estado externo lido por assinatura, não estado local corrigido por efeito.**

A primeira tentativa foi o caminho óbvio: estado local iniciado no padrão e um efeito de
montagem lendo o armazenamento. O lint do projeto barrou — atribuir estado dentro de efeito
é o antipadrão que a leitura de estado externo existe para substituir. A regra estava certa:
a preferência não é estado da árvore, é estado **de fora** dela, e sobrevive à árvore.

A leitura por assinatura resolve os dois lados: no servidor devolve "sem preferência" (vale
o padrão, e o HTML bate na hidratação), e no cliente devolve o que está guardado logo em
seguida.

**2. Sem cache em memória.**

A leitura vai ao armazenamento toda vez e devolve uma string, comparada por valor — então
não há por que memorizar. Um cache no módulo traria dois problemas concretos: sobreviveria
entre testes do mesmo arquivo, furando o isolamento que a tarefa de teste exige, e poderia
discordar do que outra aba escreveu. De brinde, sem cache a mudança feita em outra aba é
percebida.

**3. Validar contra a lista de idiomas, não confiar no que está guardado.**

O armazenamento é editável pelo usuário e sobrevive a versões do app: um idioma removido no
futuro continuaria lá. O valor só vale se ainda constar da lista oferecida; qualquer outra
coisa é tratada como ausência.

**4. Leitura e escrita toleram armazenamento proibido.**

Janela privada e políticas de navegador podem lançar exceção no acesso. Falhar aí seria
trocar uma conveniência por uma tela quebrada: sem armazenamento, o app funciona e a troca
vale na sessão.

## Risks / Trade-offs

- [Piscada de idioma no primeiro render] → Assumida (ver Non-Goals). Dura um render e
  atinge só quem escolheu o idioma não padrão.
- [Persistência real vaza entre testes do mesmo arquivo] → Um teste que troca o idioma
  decidiria o idioma dos seguintes. Mitigado limpando o armazenamento entre casos, na
  configuração de teste — o que também deixa a limpeza valer para qualquer coisa que venha
  a ser guardada depois.
- [Guardar algo abre precedente para guardar mais] → É exatamente o risco que a change
  existe para conter, e por isso o limite é requisito, não comentário.

## Migration Plan

Não há migração: quem nunca escolheu idioma não tem preferência guardada e vê o padrão,
como antes. Reverter é parar de ler o armazenamento; a chave remanescente no navegador de
quem já usou torna-se inerte.
