## 1. Permanência da escolha

- [x] 1.1 Ler e escrever o idioma escolhido no armazenamento do navegador, por assinatura
      de estado externo
      **Aceite**: trocar o idioma e recarregar mantém a escolha; o primeiro render do
      cliente não diverge do HTML do servidor (sem aviso de hidratação no console).
      **Visual**: `claude-design/CurriculoVivoApp.dc.html` e
      `claude-design/CurriculoVivoHome.dc.html` — o toggle não muda de aparência nem de
      posição; o que muda é qual lado nasce ativo.
- [x] 1.2 Teste `O idioma escolhido sobrevive a uma nova visita`
      **Aceite**: troca de idioma, nova montagem com o padrão de sempre, interface em
      inglês — falha se a nova montagem voltar ao padrão.

## 2. Limite do que se guarda

- [x] 2.1 Validar a preferência contra a lista de idiomas oferecidos e tolerar
      armazenamento indisponível
      **Aceite**: valor desconhecido cai no padrão; acesso proibido não lança para a
      interface.
- [x] 2.2 Testes `Preferência guardada inválida não derruba a interface` e `Armazenamento
      indisponível não impede o uso`
      **Aceite**: o primeiro escreve lixo antes de montar; o segundo simula acesso que
      lança, e a troca de idioma segue valendo na sessão.
- [x] 2.3 Teste `Nada do currículo é guardado no navegador`
      **Aceite**: percorre importar → digitar → aceitar, e verifica que o armazenamento
      contém somente a chave do idioma — é o teste que segura o invariante contra o
      próximo estado que alguém queira persistir.

## 3. Isolamento entre testes

- [x] 3.1 Limpar o armazenamento entre casos na configuração de teste
      **Aceite**: um teste que troca o idioma não altera o resultado do seguinte; a suíte
      passa igual em qualquer ordem de execução.

## 4. Fechamento

- [x] 4.1 `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run format:check` limpos
- [x] 4.2 `openspec validate locale-preference-persistence --strict` sem erro
