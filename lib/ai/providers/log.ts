/**
 * Registro da cadeia de provedores.
 *
 * Tudo passa por aqui — nenhum `console.log` solto nos provedores — para que desligar
 * seja mexer em um lugar só, e para que nunca escape conteúdo de currículo: o que se
 * registra é provedor, modelo e tipo de falha, jamais o texto do pedido.
 *
 * Ligado em desenvolvimento, calado em produção e em teste. `AI_LOG=on` liga em
 * qualquer ambiente (útil para depurar um deploy), `AI_LOG=off` cala em qualquer um.
 */

const REGUA = "-".repeat(50);

function habilitado(): boolean {
  const flag = process.env.AI_LOG;
  if (flag === "on") return true;
  if (flag === "off") return false;
  const ambiente = process.env.NODE_ENV;
  return ambiente !== "production" && ambiente !== "test";
}

function bloco(linhas: string[]): void {
  if (!habilitado()) return;
  console.info([REGUA, ...linhas, REGUA].join("\n"));
}

export const aiLog = {
  sucesso(provider: string, model: string): void {
    bloco([`AI Provider: ${provider}`, `Modelo: ${model}`, "Status: Success"]);
  },

  /** Falha passageira: o motivo, e o aviso de que a cadeia continua. */
  tentandoProximo(provider: string, motivo: string, proximo: string): void {
    bloco([
      `AI Provider: ${provider}`,
      `Erro: ${motivo}`,
      `Tentando próximo provider: ${proximo}...`,
    ]);
  },

  /** Falha definitiva: a cadeia para aqui, e o motivo precisa aparecer inteiro. */
  interrompido(provider: string, motivo: string, detalhe?: string): void {
    bloco([
      `AI Provider: ${provider}`,
      `Erro: ${motivo}`,
      ...(detalhe ? [`Detalhe: ${detalhe}`] : []),
      "Status: Falha definitiva — a cadeia não continua",
    ]);
  },

  /** Provedor sem chave: não é falha, é peça que não está montada. */
  ignorado(provider: string): void {
    bloco([`AI Provider: ${provider}`, "Status: Ignorado (sem chave configurada)"]);
  },

  esgotado(tentativas: string[]): void {
    bloco([
      "AI Service: nenhum provedor respondeu",
      `Tentados: ${tentativas.join(" → ") || "(nenhum)"}`,
    ]);
  },

  aviso(mensagem: string): void {
    bloco([`AI Service: ${mensagem}`]);
  },
};
