import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/client";
import { ImportError, MAX_FILE_BYTES, importResume } from "@/lib/parsing";
import { RewriteDetectedError } from "@/lib/parsing/verify";

/**
 * Importação de currículo pela rede.
 *
 * O handler é fino de propósito: recebe o arquivo, chama a biblioteca e traduz erro
 * em status. Toda a lógica vive em `lib/parsing/`, que não conhece `Request` nem
 * `Response` e por isso é testável sem subir servidor.
 *
 * O arquivo existe só em memória, pelo tempo da requisição. Nada é gravado em disco,
 * e nenhum log inclui conteúdo do currículo — só tipo de falha.
 */

export const runtime = "nodejs";

const STATUS_POR_MOTIVO = {
  "unsupported-format": 415,
  "file-too-large": 413,
  "corrupted-file": 422,
  "pdf-without-text-layer": 422,
  // 422 como os outros "o arquivo não serve": abriu, foi lido, e não dá para processar.
  "not-a-resume": 422,
  // O leitor que não sobe é defeito do servidor: 4xx culparia o arquivo do usuário.
  "pdf-reader-unavailable": 500,
} as const;

const STATUS_POR_MOTIVO_IA = {
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
  let bytes: Uint8Array;
  let fileName: string | undefined;

  try {
    const form = await request.formData();
    const arquivo = form.get("file");

    if (!(arquivo instanceof File)) {
      return erro(
        "missing-file",
        'Envie o currículo no campo "file" de um formulário multipart.',
        400,
      );
    }

    // O limite é conferido de novo dentro da biblioteca; aqui evitamos ler para a
    // memória um arquivo absurdamente grande.
    if (arquivo.size > MAX_FILE_BYTES) {
      return erro(
        "file-too-large",
        `Arquivo excede o limite de ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.`,
        413,
      );
    }

    fileName = arquivo.name;
    bytes = new Uint8Array(await arquivo.arrayBuffer());
  } catch {
    return erro("invalid-request", "Não foi possível ler o formulário enviado.", 400);
  }

  try {
    const { resume, report } = await importResume(bytes, { fileName });
    return NextResponse.json({ resume, report });
  } catch (error) {
    if (error instanceof ImportError) {
      // Log sem conteúdo do currículo: só o motivo e os detalhes seguros.
      console.warn("resume-import: falha de arquivo", {
        reason: error.reason,
        ...error.detail,
      });
      return erro(error.reason, error.message, STATUS_POR_MOTIVO[error.reason]);
    }

    if (error instanceof RewriteDetectedError) {
      // Campo e forma da divergência. O texto do currículo nunca vai para o log — e
      // truncá-lo não desidentificaria nada.
      console.warn("resume-import: a IA reescreveu conteúdo nas duas tentativas", {
        field: error.field,
        divergence: error.divergence,
      });
      return erro(
        "rewrite-detected",
        "A organização automática alterou o texto do currículo, o que não é permitido nesta etapa. Tente novamente.",
        502,
      );
    }

    if (error instanceof AiError) {
      console.warn("resume-import: falha de IA", { reason: error.reason });
      return erro(error.reason, error.message, STATUS_POR_MOTIVO_IA[error.reason]);
    }

    console.error("resume-import: falha inesperada", {
      name: (error as Error).name,
    });
    return erro("unexpected", "Não foi possível importar o currículo.", 500);
  } finally {
    // Sem referência ao buffer, ele fica elegível para coleta imediatamente.
    bytes = new Uint8Array(0);
  }
}
