import { ResumeSchema, type Resume } from "./schema";

/**
 * Fronteira do currículo.
 *
 * O currículo atravessa cliente/servidor a cada operação — importação, análise pela
 * IA, geração — e nenhuma dessas travessias pode perder id, ordem, origem de conteúdo
 * ou o estado de completude de um período. Desserializar valida antes de produzir:
 * payload inválido vira erro nomeado, nunca um currículo pela metade.
 */

export class SerializationError extends Error {
  constructor(
    message: string,
    /** Caminhos dos campos que falharam, para a mensagem de quem chamou. */
    readonly fields: string[],
  ) {
    super(message);
    this.name = "SerializationError";
  }
}

/** Currículo → texto de transporte. */
export function serializeResume(resume: Resume): string {
  return JSON.stringify(resume);
}

/**
 * Texto ou objeto de transporte → currículo validado. Aceita os dois porque a mesma
 * fronteira recebe corpo de requisição já parseado e texto cru.
 */
export function deserializeResume(payload: unknown): Resume {
  const raw = typeof payload === "string" ? parseJson(payload) : payload;

  const result = ResumeSchema.safeParse(raw);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    const detalhes = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("; ");
    throw new SerializationError(`Currículo inválido na fronteira. ${detalhes}`, fields);
  }

  return result.data;
}

function parseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new SerializationError(
      `Payload não é JSON válido: ${(error as Error).message}`,
      [],
    );
  }
}
