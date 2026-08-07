import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/client";
import { exportResume } from "@/lib/export/export";
import type { ExportFormat } from "@/lib/export/filename";
import { GenerationError } from "@/lib/resume/generate";
import { deserializeResume, SerializationError } from "@/lib/resume/serialize";
import { locales, type Locale } from "@/lib/i18n/dictionary";

/**
 * Exportação do currículo final.
 *
 * Handler fino, como os demais: valida o corpo, chama a biblioteca, traduz erro em
 * status. Nada é persistido — o arquivo vive na resposta e morre com ela. Nenhum log
 * inclui conteúdo do currículo.
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

const FORMATOS: ExportFormat[] = ["docx", "pdf"];

function filtrar<T extends string>(valor: unknown, permitidos: readonly T[]): T[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is T => permitidos.includes(item as T));
}

export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erro("invalid-request", "Corpo da requisição não é JSON válido.", 400);
  }

  const payload = corpo as {
    resume?: unknown;
    patches?: unknown;
    locales?: unknown;
    formats?: unknown;
  };

  try {
    const resume = deserializeResume(payload.resume);
    const patches = Array.isArray(payload.patches)
      ? (payload.patches as { path: string; text: string }[])
      : [];

    const resultado = await exportResume({
      resume,
      patches,
      locales: filtrar<Locale>(payload.locales, locales),
      formats: filtrar<ExportFormat>(payload.formats, FORMATOS),
    });

    if (resultado.download === null) {
      return NextResponse.json(
        {
          error: { code: "no-output", message: "Nenhum arquivo foi gerado." },
          failures: resultado.failures,
        },
        { status: 422 },
      );
    }

    return new NextResponse(resultado.download.bytes as BodyInit, {
      status: 200,
      headers: {
        "content-type": resultado.download.contentType,
        "content-disposition": `attachment; filename="${resultado.download.name}"`,
        // O que falhou vai no cabeçalho: o corpo é o arquivo.
        ...(resultado.failures.length > 0
          ? { "x-export-failures": JSON.stringify(resultado.failures) }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof SerializationError) {
      console.warn("export: currículo inválido", { fields: error.fields.join(",") });
      return erro("invalid-resume", error.message, 400);
    }

    if (error instanceof GenerationError) {
      console.warn("export: geração recusada");
      return erro("invalid-generation", error.message, 400);
    }

    if (error instanceof AiError) {
      console.warn("export: falha de IA", { reason: error.reason });
      return erro(error.reason, error.message, STATUS_POR_MOTIVO[error.reason]);
    }

    console.error("export: falha inesperada", { name: (error as Error).name });
    return erro("unexpected", "Não foi possível exportar o currículo.", 500);
  }
}
