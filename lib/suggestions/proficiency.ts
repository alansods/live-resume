/**
 * Indicador de nível nas habilidades.
 *
 * É o defeito que a sugestão de habilidades alega: barra, símbolo repetido, percentual ou
 * rótulo de proficiência. O parser de ATS descarta o indicador e a linha vai junto, então
 * "Go ★★★★☆" chega ao recrutador como "Go" — ou como nada.
 *
 * A detecção é aqui, e não no prompt, porque isto é **artefato de formatação**: dá para
 * olhar o texto e responder sim ou não sem julgar conteúdo. Confiar a recusa ao modelo faz
 * uma proposta gratuita sobre habilidades já boas custar 12 pontos de uma nota que nenhum
 * cartão explica depois.
 *
 * Não confundir com o invariante de não-heurística do projeto, que é sobre **estruturar** o
 * currículo — decidir o que é seção, empresa ou cargo. Isso continua com a IA. Aqui só se
 * verifica se o defeito alegado existe, do mesmo jeito que `TEM_NUMERO` e
 * `VERBOS_GENERICOS` já fazem em `validate.ts`.
 */

/**
 * Símbolo repetido de escala — cheio e vazio, nas formas que aparecem em currículo.
 * Dois seguidos bastam: um sozinho pode ser marcador de lista.
 */
const SIMBOLO_REPETIDO = /[★☆✩✭✮●○◉◌■□▪▫▮▯█▓▒░⬤◆◇]{2,}/u;

/** "80%", "80 %" — proficiência escrita como porcentagem. */
const PERCENTUAL = /\d{1,3}\s*%/u;

/**
 * Rótulo de proficiência nos dois idiomas da interface. Só conta como indicador quando
 * qualifica um nível — "avançado" solto numa frase de resumo não passa por aqui, porque
 * esta função só é aplicada ao texto de habilidades.
 */
const ROTULO =
  /\b(b[áa]sico|iniciante|intermedi[áa]rio|avan[çc]ado|fluente|nativo|especialista|basic|beginner|intermediate|advanced|fluent|native|proficient|expert|elementary)\b/iu;

/** "nível: X", "level: X" — o rótulo anunciado como campo. */
const NIVEL = /\bn[íi]vel\b|\blevel\b/iu;

export function hasProficiencyIndicator(texto: string): boolean {
  return (
    SIMBOLO_REPETIDO.test(texto) ||
    PERCENTUAL.test(texto) ||
    ROTULO.test(texto) ||
    NIVEL.test(texto)
  );
}
