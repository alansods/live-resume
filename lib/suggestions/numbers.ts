/**
 * Números que a IA propôs e o material do usuário não sustenta.
 *
 * A comparação é por token numérico, não por semântica: pedir à IA que declare a
 * origem de cada número seria confiar no mesmo modelo que o inventou. A verificação
 * tem de ser nossa.
 *
 * O custo é ser grosseira — um "12" do texto proposto casa com um "12" que era de
 * outra coisa. O erro cai para o lado seguro: deixa de sinalizar algo que o usuário
 * talvez confirmasse de qualquer jeito. Falso alarme constante seria pior, porque
 * treinaria o usuário a ignorar o aviso.
 */

/** Números com separador de milhar e decimal, em qualquer das duas convenções. */
const NUMERO = /\d[\d.,]*/g;

/**
 * `1.200,50`, `1,200.50` e `1200.5` são o mesmo número. Tiramos os separadores de
 * milhar e unificamos o decimal para comparar.
 */
export function normalizeNumber(bruto: string): string {
  const limpo = bruto.replace(/[.,]$/, "");

  // Última pontuação seguida de 1 ou 2 dígitos é decimal; o resto é milhar.
  const decimal = /[.,](\d{1,2})$/.exec(limpo);
  if (decimal) {
    const inteiro = limpo.slice(0, decimal.index).replace(/[.,]/g, "");
    const fracao = decimal[1].replace(/0+$/, "");
    return fracao.length > 0 ? `${inteiro}.${fracao}` : inteiro;
  }

  return limpo.replace(/[.,]/g, "");
}

export function extractNumbers(texto: string): string[] {
  return [...texto.matchAll(NUMERO)].map((match) => match[0]);
}

/**
 * Os números do texto proposto que não aparecem no material do usuário — currículo
 * importado mais o que ele digitou na etapa 02.
 */
export function unsupportedNumbers(
  proposto: string,
  materialDoUsuario: string,
): string[] {
  const conhecidos = new Set(extractNumbers(materialDoUsuario).map(normalizeNumber));

  const naoApoiados: string[] = [];
  for (const bruto of extractNumbers(proposto)) {
    const normalizado = normalizeNumber(bruto);
    if (normalizado.length === 0) continue;
    if (conhecidos.has(normalizado)) continue;
    if (!naoApoiados.includes(bruto)) naoApoiados.push(bruto);
  }

  return naoApoiados;
}

/** A marca de aproximação: o número é estimativa, não medição. */
const TIL = "~";

/**
 * Número colado a uma letra é parte de um nome, não uma quantidade: `p95`, `H1`, `Q3`,
 * `IPv6`. Marcá-lo produziria `p~95`, que não é aproximação de nada — é um identificador
 * quebrado no meio.
 */
const COLADO_A_LETRA = /\p{L}/u;

/**
 * O mesmo julgamento de `unsupportedNumbers`, escrito no texto: cada número que o
 * material do usuário não sustenta sai precedido de `~` — "reduzi a fila em ~20%".
 *
 * A lista sinaliza para a revisão, que é onde o usuário confirma; o til sinaliza para
 * **depois** dela. Sugestão marcada vira currículo exportado, e sem a marca uma
 * estimativa chega ao recrutador com a mesma cara de um dado medido. Quem apenas
 * confirmou "sim, foi mais ou menos isso" não deveria estar afirmando precisão.
 *
 * Marcar é do código, não da IA: pedir ao modelo que declare quais números ele inventou
 * é perguntar ao inventor. A comparação com o material do usuário já responde.
 */
export function markEstimates(proposto: string, materialDoUsuario: string): string {
  const conhecidos = new Set(extractNumbers(materialDoUsuario).map(normalizeNumber));

  let resultado = "";
  let consumido = 0;

  for (const match of proposto.matchAll(NUMERO)) {
    const inicio = match.index;
    if (inicio === undefined) continue;

    const normalizado = normalizeNumber(match[0]);
    if (normalizado.length === 0) continue;
    if (conhecidos.has(normalizado)) continue;
    // O til que a proposta já trouxe conta como marca: duplicá-lo seria ruído.
    if (proposto[inicio - 1] === TIL) continue;
    if (inicio > 0 && COLADO_A_LETRA.test(proposto[inicio - 1])) continue;

    resultado += proposto.slice(consumido, inicio) + TIL;
    consumido = inicio;
  }

  return resultado + proposto.slice(consumido);
}
