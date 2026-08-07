import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/client";
import { suggestAts } from "@/lib/ai/suggest-ats";
import { deserializeResume, SerializationError } from "@/lib/resume/serialize";

/**
 * Sugestões de ATS para um currículo.
 *
 * Handler fino, como o das métricas: recebe o currículo, chama a biblioteca, traduz
 * erro em status. Nenhum log inclui conteúdo do currículo.
 */

export const runtime = "nodejs";

const STATUS_POR_MOTIVO = {
  "missing-credentials": 500,
  "call-failed": 502,
  "invalid-response": 502,
  // 429 e não 502: 502 diria que o modelo está com problema. O limite é nosso.
  "quota-exceeded": 429,
} as const;

function erro(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erro("invalid-request", "Corpo da requisição não é JSON válido.", 400);
  }

  const payload = corpo as { resume?: unknown; extraUserText?: unknown };

  try {
    const resume = deserializeResume(payload.resume);
    const extraUserText = Array.isArray(payload.extraUserText)
      ? payload.extraUserText.filter((item): item is string => typeof item === "string")
      : [];

    const suggestions = await suggestAts(resume, { extraUserText });
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof SerializationError) {
      console.warn("suggestions/ats: currículo inválido", {
        fields: error.fields.join(","),
      });
      return erro("invalid-resume", error.message, 400);
    }

    if (error instanceof AiError) {
      console.warn("suggestions/ats: falha de IA", { reason: error.reason });
      return erro(error.reason, error.message, STATUS_POR_MOTIVO[error.reason]);
    }

    console.error("suggestions/ats: falha inesperada", {
      name: (error as Error).name,
    });
    return erro("unexpected", "Não foi possível gerar as sugestões.", 500);
  }
}
