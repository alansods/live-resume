/**
 * Tradução do nosso JSON Schema para o dialeto estrito da OpenAI.
 *
 * Os schemas do projeto foram escritos para o Gemini e usam `nullable: true`, além de
 * omitir `additionalProperties`. O modo estrito da OpenAI — que Groq e Cerebras herdam —
 * recusa os dois: exige `additionalProperties: false` e `required` com **todas** as
 * chaves em cada objeto, e não conhece `nullable`.
 *
 * A alternativa seria manter dois schemas por chamada, escritos à mão e condenados a
 * divergir em silêncio. Uma função pura de tradução é mais barata e testável: o schema
 * continua um só, e cada provedor pede o seu dialeto.
 *
 * Campo opcional some no caminho: no modo estrito tudo é obrigatório, e "ausente" vira
 * "nulo". É o mesmo que o Zod do nosso lado já espera dos campos `nullable`.
 */

type Schema = Record<string, unknown>;

function ehObjeto(valor: unknown): valor is Schema {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** `{ type: "string", nullable: true }` → `{ type: ["string", "null"] }`. */
function aplicarNulo(schema: Schema): Schema {
  const { nullable, ...resto } = schema;
  if (nullable !== true) return resto;

  const tipo = resto.type;
  if (typeof tipo === "string") return { ...resto, type: [tipo, "null"] };
  if (Array.isArray(tipo) && !tipo.includes("null")) {
    return { ...resto, type: [...tipo, "null"] };
  }
  return resto;
}

export function toStrictJsonSchema(schema: Schema): Schema {
  const atual = aplicarNulo(schema);

  if (Array.isArray(atual.anyOf)) {
    atual.anyOf = atual.anyOf.filter(ehObjeto).map(toStrictJsonSchema);
  }
  if (Array.isArray(atual.oneOf)) {
    atual.oneOf = atual.oneOf.filter(ehObjeto).map(toStrictJsonSchema);
  }

  if (ehObjeto(atual.items)) {
    atual.items = toStrictJsonSchema(atual.items);
  }

  if (ehObjeto(atual.properties)) {
    const propriedades: Schema = {};
    for (const [chave, valor] of Object.entries(atual.properties)) {
      propriedades[chave] = ehObjeto(valor) ? toStrictJsonSchema(valor) : valor;
    }
    atual.properties = propriedades;
    atual.required = Object.keys(propriedades);
    atual.additionalProperties = false;
  }

  return atual;
}
