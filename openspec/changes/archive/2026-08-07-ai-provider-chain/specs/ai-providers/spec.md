## ADDED Requirements

### Requirement: A escolha do provedor não vaza da camada de IA

O projeto SHALL concentrar em uma única camada todo o conhecimento sobre provedores de IA.
Nenhum arquivo fora dela SHALL importar SDK de provedor nem nomear um provedor em código.
O retorno de uma chamada de IA SHALL NOT obrigar quem chamou a saber quem atendeu.

#### Scenario: Nada fora da camada de IA importa um SDK de provedor

- **WHEN** o código do projeto é varrido em busca de import de SDK de provedor
- **THEN** nenhum arquivo fora da camada de provedores importa um

#### Scenario: Nenhum nome de provedor aparece em regra de negócio ou rota

- **WHEN** o código fora da camada de IA é varrido em busca de nome de provedor
- **THEN** nenhum arquivo de regra de negócio ou de rota nomeia um provedor

#### Scenario: O provedor que atendeu não aparece no retorno

- **WHEN** uma chamada de IA é atendida por um provedor de fallback
- **THEN** quem chamou recebe o mesmo resultado que receberia do primeiro da fila

### Requirement: Falha temporária passa a vez para o próximo provedor

Quando um provedor não puder responder por motivo passageiro — limite de uso, serviço
indisponível, tempo esgotado, conexão caída —, o sistema SHALL tentar o próximo provedor da
ordem de prioridade, com o mesmo pedido, até que um responda. A troca SHALL ser automática e
SHALL NOT exigir nova ação do usuário.

#### Scenario: Sucesso no primeiro provedor não chega ao segundo

- **WHEN** o primeiro provedor da fila responde normalmente
- **THEN** a resposta dele é devolvida e nenhum outro provedor é chamado

#### Scenario: Falha temporária no primeiro provedor leva ao segundo

- **WHEN** o primeiro provedor recusa a chamada por limite de uso
- **THEN** o segundo provedor é chamado e a resposta dele é devolvida

#### Scenario: Indisponibilidade leva ao próximo provedor

- **WHEN** o primeiro provedor falha por indisponibilidade do serviço
- **THEN** o próximo provedor é chamado e a resposta dele é devolvida

#### Scenario: A cadeia percorre quantos provedores forem precisos

- **WHEN** os dois primeiros provedores falham por motivo passageiro
- **THEN** o terceiro é chamado e a resposta dele é devolvida

#### Scenario: O pedido chega igual a cada provedor

- **WHEN** um pedido é repassado ao provedor seguinte
- **THEN** ele chega idêntico ao que foi entregue ao provedor anterior

### Requirement: Falha definitiva interrompe a cadeia

Quando a falha indicar que o pedido está errado — parâmetro inválido, formato de resposta
inválido, credencial recusada, recurso inexistente —, o sistema SHALL falhar imediatamente e
SHALL NOT tentar os provedores seguintes. Insistir gastaria a cota de todos para chegar ao
mesmo resultado, escondendo o defeito.

#### Scenario: Pedido inválido não é tentado no próximo provedor

- **WHEN** um provedor recusa a chamada por pedido inválido
- **THEN** a falha é devolvida na hora e nenhum outro provedor é chamado

#### Scenario: Chave recusada não é tentada no próximo provedor

- **WHEN** um provedor recusa a chamada por credencial inválida
- **THEN** a falha é devolvida na hora e nenhum outro provedor é chamado

#### Scenario: Resposta que não é JSON não vira fallback

- **WHEN** um provedor responde com texto que não corresponde ao formato pedido
- **THEN** a falha é de resposta inválida e nenhum outro provedor é chamado

### Requirement: Provedor sem credencial é peça que falta, não falha

Um provedor sem chave configurada SHALL ser pulado sem consumir tentativa e sem produzir
erro. Quando nenhum provedor da cadeia tiver credencial, a falha SHALL ser de configuração
ausente, distinguível de indisponibilidade.

#### Scenario: Provedor sem chave é pulado sem gastar tentativa

- **WHEN** o primeiro provedor da fila não tem chave configurada
- **THEN** ele não é chamado e o próximo provedor atende

#### Scenario: Cadeia inteira sem chave falha por configuração ausente

- **WHEN** nenhum provedor da cadeia tem chave configurada
- **THEN** a falha tem motivo de configuração ausente

#### Scenario: Cadeia vazia falha sem chamar ninguém

- **WHEN** a cadeia de provedores está vazia
- **THEN** a falha tem motivo de configuração ausente e nenhuma chamada é feita

### Requirement: Quando todos falham, o erro é um só e padronizado

Esgotada a cadeia, o sistema SHALL falhar com um erro do vocabulário do projeto. A mensagem
SHALL NOT nomear provedor nem repassar a resposta de erro de nenhum deles. O detalhe bruto de
cada falha SHALL ser registrado no servidor, no ponto em que aconteceu.

#### Scenario: O erro final não nomeia o provedor que falhou

- **WHEN** todos os provedores da cadeia falham
- **THEN** a mensagem da falha não contém nome de provedor nem trecho da resposta deles

#### Scenario: Erro cru de SDK é classificado como qualquer outro

- **WHEN** um provedor lança um erro que não passou pela classificação da camada
- **THEN** ele é classificado pelo status e a cadeia decide continuar ou parar como de costume

### Requirement: A ordem de prioridade é configuração, não código

A ordem em que os provedores são tentados SHALL ser dado configurável, e SHALL NOT estar
espalhada em condicionais pelo código. Chaves e modelos SHALL vir sempre do ambiente, nunca
fixos no código. A configuração SHALL permitir reordenar a cadeia, encurtá-la e desligar a IA
por inteiro sem alterar código.

#### Scenario: A ordem padrão é Gemini, Groq e Cerebras

- **WHEN** nenhuma ordem é definida no ambiente
- **THEN** a cadeia é montada com Gemini, Groq e Cerebras, nessa ordem

#### Scenario: A variável de ambiente reordena a cadeia

- **WHEN** o ambiente define outra ordem de provedores
- **THEN** a cadeia é montada nessa ordem

#### Scenario: A variável de ambiente desliga a IA por inteiro

- **WHEN** o ambiente define que nenhum provedor deve ser usado
- **THEN** a cadeia fica vazia

#### Scenario: Nome de provedor desconhecido é ignorado

- **WHEN** o ambiente nomeia um provedor que não existe no catálogo
- **THEN** ele é ignorado com aviso e os demais continuam na cadeia

#### Scenario: Chave e modelo vêm sempre do ambiente

- **WHEN** o ambiente define o modelo de um provedor
- **THEN** a chamada usa esse modelo, e não o padrão do código

### Requirement: Acrescentar um provedor é um arquivo e um registro

Todo provedor SHALL cumprir a mesma interface, tenha ou não API compatível com a OpenAI.
Provedores compatíveis SHALL compartilhar a implementação, declarando apenas endereço, nomes
das variáveis de ambiente e modelo padrão. Acrescentar um provedor SHALL NOT exigir mudança
fora da camada de IA.

#### Scenario: Todo provedor do catálogo cumpre a mesma interface

- **WHEN** cada provedor do catálogo é construído
- **THEN** todos expõem a mesma interface de geração

#### Scenario: Provedores compatíveis com a OpenAI compartilham a implementação

- **WHEN** dois provedores compatíveis com a OpenAI recebem o mesmo pedido
- **THEN** o pedido enviado é o mesmo, mudando apenas endereço, chave e modelo

#### Scenario: O provedor de SDK próprio traduz a interface para o seu formato

- **WHEN** um provedor com SDK próprio recebe um pedido no formato da camada
- **THEN** ele o traduz para o formato do seu SDK sem alterar o conteúdo

### Requirement: A saída estruturada vale em qualquer provedor

Toda chamada com formato de resposta declarado SHALL exigir saída estruturada do provedor que
atender, no dialeto que a API dele aceita. A resposta SHALL ser revalidada do nosso lado,
qualquer que tenha sido o provedor.

#### Scenario: O schema vai no formato estrito nos provedores compatíveis com a OpenAI

- **WHEN** uma chamada com formato declarado vai para um provedor compatível com a OpenAI
- **THEN** o schema é enviado no formato estrito que essa API exige

#### Scenario: O schema vai no dialeto próprio do Gemini

- **WHEN** uma chamada com formato declarado vai para o Gemini
- **THEN** o schema é enviado no dialeto que essa API aceita
