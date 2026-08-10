## ADDED Requirements

### Requirement: Falha total da exportação é sinalizada em atenção

Quando a exportação não entregar nenhum arquivo — seja porque o servidor relatou que não
gerou saída, seja por falha de rede — o aplicativo SHALL exibir o aviso no tom de atenção
(o mesmo já usado para a cota de IA esgotada), não no tom de falha usado por importação e
análise. O aviso SHALL continuar oferecendo tentar de novo.

#### Scenario: Nenhum arquivo gerado usa o tom de atenção

- **WHEN** a exportação não entrega nenhum arquivo
- **THEN** o aviso exibido usa o mesmo tom da cota de IA esgotada, com ícone, e o botão de
  tentar de novo continua disponível
