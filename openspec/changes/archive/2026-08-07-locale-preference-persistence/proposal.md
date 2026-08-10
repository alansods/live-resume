## Why

O idioma da interface voltava para português a cada recarregamento e a cada troca de
página. Quem usa o app em inglês reescolhia o idioma no meio do fluxo — uma decisão já
tomada, refeita a cada navegação.

Guardar essa escolha é comportamento **novo em espécie**, não só em grau: até aqui o app
não gravava nada no navegador, e o invariante de produto é que o arquivo é processado e
descartado. Por isso esta change é separada dos outros acertos de interface: ela precisa
dizer, em requisito, o que pode e o que não pode ser guardado. Sem essa linha escrita, a
próxima pessoa a mexer no assunto não tem como saber onde ela está.

## What Changes

- O idioma escolhido no toggle da top bar passa a sobreviver ao recarregamento e à troca de
  página, valendo no navegador em que foi escolhido.
- Fica escrito que **só** a preferência de idioma é guardada: nada do currículo, do que foi
  digitado, das sugestões marcadas ou das saídas escolhidas.
- Preferência ausente, ilegível ou de idioma inexistente cai no padrão em vez de quebrar a
  interface — inclusive quando o navegador proíbe armazenamento (janela privada).
- Guardar a preferência SHALL NOT introduzir conta, sessão ou identificação: é uma
  preferência local e anônima, apagável pelo próprio navegador.

## Capabilities

### New Capabilities

Nenhuma. O idioma da interface já é da `app-shell-navigation`.

### Modified Capabilities

- `app-shell-navigation`: o requisito de interface bilíngue ganha a permanência da escolha,
  mais o limite explícito do que pode ser guardado no navegador.

## Fora de escopo

- Detectar o idioma pelo navegador ou pelo cabeçalho da requisição. O padrão continua sendo
  português; só a escolha explícita do usuário é lembrada.
- Idioma na URL, em rota (`/en/...`) ou em cookie lido pelo servidor. A escolha é do
  cliente, e a página servida é a mesma.
- Guardar qualquer outra coisa: etapa atual, currículo importado, sugestões marcadas,
  formatos de exportação. Todos continuam morrendo com a aba.
- Sincronizar a preferência entre dispositivos — não há conta e não haverá.
- O idioma **da exportação**, que é escolha por saída na etapa 04 e não tem relação com o
  idioma da interface.

## Impact

- Código: `lib/i18n/context.tsx` (leitura, escrita e validação da preferência).
- Testes: `lib/i18n/i18n.test.tsx`; configuração de teste precisa isolar o armazenamento
  entre casos, senão um teste que troca o idioma decide o idioma dos seguintes.
- Referências de design: `claude-design/CurriculoVivoApp.dc.html` e
  `claude-design/CurriculoVivoHome.dc.html` (o toggle não muda de aparência),
  `claude-design/README.md`.
- Nenhum impacto em rotas, na fronteira de IA, no modelo canônico ou na exportação.
