import { z } from "zod";
import { chronologicalOrder } from "@/lib/resume/chronological";
import type { ResumeOrder } from "@/lib/resume/generate";
import { asItemId, type ItemId } from "@/lib/resume/ids";
import type { Resume } from "@/lib/resume/schema";
import { AiError, createAiClient, type AiClient } from "./client";

/**
 * Ordem do conteúdo do currículo final.
 *
 * `resume-model` já sabe aplicar uma ordem — `ResumeOrder`, permutação de ids, recusa
 * de permutação parcial. O que falta é quem a produz, e quem produz é a IA: a ordem do
 * arquivo importado costuma ser ruim (o estágio de 2014 acima da promoção de 2023), e
 * quem lê decide nos primeiros centímetros.
 *
 * A resposta é **só de ids**. Qualquer texto que venha junto é descartado pelo Zod na
 * volta: é a mesma trava do `verify.ts` da importação, aplicada a outro momento. Sem
 * ela, a geração viraria a porta dos fundos por onde conteúdo não marcado entraria no
 * currículo.
 *
 * Falha aqui não aborta a exportação. Ver `chronologicalOrder`.
 */

const SYSTEM = `Você organiza a ordem do conteúdo de um currículo que será exportado.

Devolva APENAS ordens de identificadores. Você não escreve, não corrige e não reescreve
nada — outro passo cuida disso.

O que ordenar:
1. jobs — as experiências, na ordem em que devem aparecer.
2. bullets — para cada experiência, a ordem dos seus bullets.
3. education — as formações.

Critérios:
- A convenção de currículo é cronológica inversa: a experiência em curso primeiro, depois
  a mais recente. Só fuja disso quando houver motivo claro no próprio material.
- Dentro de uma experiência, o bullet mais forte vem primeiro: o que traz resultado,
  escala ou responsabilidade maior. Atividade rotineira desce.
- Formação mais recente ou de maior nível primeiro.

Regras invioláveis:
- Cite CADA id exatamente uma vez. Não invente id, não repita id, não deixe item de fora.
- Os bullets de uma experiência só podem aparecer na lista daquela experiência.
- Não devolva texto do currículo. Só identificadores.`;

const responseSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    jobs: { type: "array", items: { type: "string" } },
    bullets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          bulletIds: { type: "array", items: { type: "string" } },
        },
        required: ["jobId", "bulletIds"],
      },
    },
    education: { type: "array", items: { type: "string" } },
  },
  required: ["jobs", "bullets", "education"],
};

/**
 * A ordem dos bullets vem como lista de pares, não como objeto indexado por id: chave
 * dinâmica não se descreve em JSON Schema, e o modelo obedece melhor a uma lista.
 */
const RawOrderSchema = z.strictObject({
  jobs: z.array(z.string()),
  bullets: z.array(
    z.strictObject({
      jobId: z.string(),
      bulletIds: z.array(z.string()),
    }),
  ),
  // Ausente vira lista vazia: o provedor pode gerar uma resposta sem citar a chave (ver
  // `lib/ai/providers/openai-compatible.ts`), e currículo sem formação é um caso legítimo.
  education: z
    .array(z.string())
    .optional()
    .transform((valor) => valor ?? []),
});

type RawOrder = z.infer<typeof RawOrderSchema>;

/** O currículo como lista de ids com o conteúdo ao lado, para a IA poder julgar. */
export function renderItems(resume: Resume): string {
  const linhas: string[] = [];

  for (const job of resume.jobs) {
    linhas.push(
      `experiência ${job.id} | ${job.company} · ${job.role} | ${job.period.raw}`,
    );
    for (const bullet of job.bullets) {
      linhas.push(`  bullet ${bullet.id} | ${bullet.value.text}`);
    }
  }
  for (const item of resume.education) {
    linhas.push(
      `formação ${item.id} | ${item.course} · ${item.school} | ${item.period.raw}`,
    );
  }

  return linhas.join("\n");
}

/** Permutação completa: cada id do currículo citado exatamente uma vez. */
function ehPermutacao(
  esperados: readonly ItemId[],
  recebidos: readonly string[],
): boolean {
  if (recebidos.length !== esperados.length) return false;

  const restantes = new Set<string>(esperados as readonly string[]);
  for (const id of recebidos) {
    if (!restantes.delete(id)) return false;
  }
  return restantes.size === 0;
}

/**
 * A ordem devolvida vira `ResumeOrder` só se for permutação de ponta a ponta.
 *
 * `applyOrder` recusaria a permutação ruim de qualquer forma, mas lançando no meio da
 * geração — tarde demais para trocar pela ordem de recurso sem embrulhar tudo num try.
 * Validar aqui deixa o recurso explícito.
 */
export function toResumeOrder(resume: Resume, raw: RawOrder): ResumeOrder | null {
  if (
    !ehPermutacao(
      resume.jobs.map((job) => job.id),
      raw.jobs,
    )
  )
    return null;
  if (
    !ehPermutacao(
      resume.education.map((item) => item.id),
      raw.education,
    )
  )
    return null;

  const bullets: Record<string, readonly ItemId[]> = {};
  const vistos = new Set<string>();

  for (const { jobId, bulletIds } of raw.bullets) {
    const job = resume.jobs.find((candidato) => (candidato.id as string) === jobId);
    if (!job) return null;
    // Duas listas para a mesma experiência: resposta inconsistente, não meia ordem.
    if (vistos.has(jobId)) return null;
    vistos.add(jobId);

    if (
      !ehPermutacao(
        job.bullets.map((bullet) => bullet.id),
        bulletIds,
      )
    )
      return null;
    bullets[jobId] = bulletIds.map(asItemId);
  }

  // Experiência sem lista de bullets conserva a ordem dela — omitir é permitido.
  return {
    jobs: raw.jobs.map(asItemId),
    bullets,
    education: raw.education.map(asItemId),
  };
}

export type OrganizeContentOptions = {
  client?: AiClient;
  model?: string;
};

export async function organizeContent(
  resume: Resume,
  options: OrganizeContentOptions = {},
): Promise<ResumeOrder> {
  // Sem experiência e sem formação não há o que ordenar — e uma chamada para descobrir
  // isso é desperdício previsível de dinheiro e latência.
  if (resume.jobs.length === 0 && resume.education.length === 0) {
    return chronologicalOrder(resume);
  }

  const client = options.client ?? createAiClient();

  let raw: RawOrder;
  try {
    raw = await client.generateStructured({
      system: SYSTEM,
      prompt: `Itens do currículo, um por linha:\n\n${renderItems(resume)}`,
      responseSchema,
      validate: RawOrderSchema,
      model: options.model,
    });
  } catch (error) {
    // Degrada em vez de abortar: aqui já existe currículo, patches marcados e um
    // usuário que clicou em baixar. Nenhum conteúdo do currículo vai para o log.
    if (error instanceof AiError) {
      console.warn("organize-content: ordem da IA indisponível", {
        reason: error.reason,
      });
      return chronologicalOrder(resume);
    }
    throw error;
  }

  const order = toResumeOrder(resume, raw);
  if (order === null) {
    // Permutação que não serve é resposta que não veio. Pedir de novo dobraria latência
    // e custo no download, e o mesmo prompt tende ao mesmo erro.
    console.warn("organize-content: ordem inválida devolvida pela IA");
    return chronologicalOrder(resume);
  }

  return order;
}
