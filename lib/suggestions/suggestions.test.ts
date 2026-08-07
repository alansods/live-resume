import { describe, expect, test } from "vitest";
import { importedResume } from "@/fixtures/resumes";
import {
  comNumeroDoUsuario,
  metricaAusente,
  semNumeros,
  verboAindaGenerico,
  verboGenerico,
  type RawSuggestionTemplate,
} from "@/fixtures/suggestion-responses";
import { createProviderChain } from "@/lib/ai";
import { AiError } from "@/lib/ai/client";
import { suggestMetrics } from "@/lib/ai/suggest-metrics";
import { failingClient, recordedClient } from "@/lib/ai/testing";
import { jobBulletPath, jobPeriodPath, resolvePath } from "@/lib/resume/paths";
import { SuggestionSchema, type RawSuggestion } from "./model";
import {
  extractNumbers,
  markEstimates,
  normalizeNumber,
  unsupportedNumbers,
} from "./numbers";
import { startsWithGenericVerb, userMaterial, validateSuggestions } from "./validate";

const kobo = importedResume.jobs[0];
const orion = importedResume.jobs[2];
/** "Liderei a migração da plataforma de pagamentos." — sem número. */
const bulletSemMetrica = jobBulletPath(kobo.id, kobo.bullets[0].id);
/** "Participei da melhoria da qualidade do código." */
const bulletVerboGenerico = jobBulletPath(orion.id, orion.bullets[1].id);
/** "Reduzi o custo ... R$ 1,2M/ano" — já tem número. */
const bulletComMetrica = jobBulletPath(
  importedResume.jobs[1].id,
  importedResume.jobs[1].bullets[1].id,
);

const em = (path: string, modelo: RawSuggestionTemplate): RawSuggestion => ({
  ...modelo,
  path,
});

const gerar = (raw: RawSuggestion[]) =>
  validateSuggestions(importedResume, raw, {
    makeId: (() => {
      let n = 0;
      return () => `s${(n += 1)}`;
    })(),
  });

describe("Modelo de sugestão", () => {
  test("Sugestão traz o que o cartão precisa exibir", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    expect(SuggestionSchema.safeParse(sugestao).success).toBe(true);
    expect(sugestao.where).toBe("Fintech Kobo · Tech Lead");
    expect(sugestao.title).toBe("Bullet sem resultado mensurável");
    expect(sugestao.action).toBe("apply");
    expect(sugestao.why.length).toBeGreaterThan(0);
  });

  test("Texto atual corresponde ao trecho", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    const trecho = resolvePath(importedResume, sugestao.path);
    expect(sugestao.before).toBe((trecho.value as { text: string }).text);
    expect(sugestao.before).toBe("Liderei a migração da plataforma de pagamentos.");
  });

  test("Ids são únicos no conjunto", () => {
    const sugestoes = gerar([
      em(bulletSemMetrica, metricaAusente),
      em(bulletVerboGenerico, verboGenerico),
    ]);

    expect(sugestoes).toHaveLength(2);
    expect(new Set(sugestoes.map((s) => s.id)).size).toBe(2);
  });

  test("Ação fora do conjunto conhecido é rejeitada", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    // O identificador da ação é fechado: o rótulo exibido vem do i18n, e uma ação que
    // a tela não sabe traduzir não pode entrar no modelo.
    expect(SuggestionSchema.safeParse({ ...sugestao, action: "aplicar" }).success).toBe(
      false,
    );
    for (const acao of ["apply", "fixDate", "normalize", "rewrite", "toText"]) {
      const candidata = SuggestionSchema.safeParse({ ...sugestao, action: acao });
      expect(candidata.success, acao).toBe(true);
    }
  });
});

describe("Ancoragem validada", () => {
  test("Path inexistente é descartado", () => {
    const sugestoes = gerar([
      em("jobs.job-fantasma.bullets.b1", metricaAusente),
      em(bulletSemMetrica, metricaAusente),
    ]);

    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].path).toBe(bulletSemMetrica);
  });

  test("Path malformado é descartado", () => {
    const sugestoes = gerar([
      em("resumo", metricaAusente),
      em("jobs..bullets", metricaAusente),
      em(bulletVerboGenerico, verboGenerico),
    ]);

    expect(sugestoes).toHaveLength(1);
  });

  test("Todas as sugestões entregues resolvem", () => {
    const sugestoes = gerar([
      em(bulletSemMetrica, metricaAusente),
      em(bulletVerboGenerico, verboGenerico),
      em("jobs.nada.bullets.nada", metricaAusente),
    ]);

    for (const sugestao of sugestoes) {
      expect(
        () => resolvePath(importedResume, sugestao.path),
        sugestao.path,
      ).not.toThrow();
    }
  });

  test("Sugestão para trecho que não é bullet é descartada", () => {
    // Período é de `suggestions-dates`; aqui não passa.
    const sugestoes = gerar([em(jobPeriodPath(kobo.id), metricaAusente)]);
    expect(sugestoes).toEqual([]);
  });
});

describe("No máximo uma sugestão por trecho", () => {
  test("Duas propostas para o mesmo bullet viram uma", () => {
    const sugestoes = gerar([
      em(bulletSemMetrica, metricaAusente),
      em(bulletSemMetrica, { ...metricaAusente, after: "Outra proposta qualquer." }),
    ]);

    expect(sugestoes).toHaveLength(1);
    // Primeira vence — o texto entregue é o dela, já com os números marcados.
    expect(sugestoes[0].after).toBe(
      markEstimates(metricaAusente.after, userMaterial(importedResume)),
    );
    expect(sugestoes[0].after).not.toContain("Outra proposta");
  });

  test("Paths distintos convivem", () => {
    const sugestoes = gerar([
      em(bulletSemMetrica, metricaAusente),
      em(bulletVerboGenerico, verboGenerico),
    ]);

    expect(sugestoes.map((s) => s.path)).toEqual([bulletSemMetrica, bulletVerboGenerico]);
  });
});

describe("Sugestão de métrica ausente", () => {
  test("Bullet sem número recebe proposta", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    expect(sugestao.kind).toBe("metric");
    expect(sugestao.after).not.toBe(sugestao.before);
    expect(sugestao.after).toMatch(/\d/);
  });

  test("Bullet que já tem métrica não recebe proposta de métrica", () => {
    const sugestoes = gerar([em(bulletComMetrica, metricaAusente)]);
    expect(sugestoes).toEqual([]);
  });

  test("O sentido do bullet é preservado", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    // A proposta continua tratando da mesma entrega.
    expect(sugestao.after.toLowerCase()).toContain(
      "migração da plataforma de pagamentos",
    );
  });

  test("Proposta idêntica ao atual é descartada", () => {
    const atual = "Liderei a migração da plataforma de pagamentos.";
    const sugestoes = gerar([em(bulletSemMetrica, { ...metricaAusente, after: atual })]);
    expect(sugestoes).toEqual([]);
  });
});

describe("Sugestão de verbo genérico", () => {
  test("Verbo genérico recebe proposta", () => {
    const [sugestao] = gerar([em(bulletVerboGenerico, verboGenerico)]);

    expect(sugestao.kind).toBe("verb");
    expect(sugestao.before).toBe("Participei da melhoria da qualidade do código.");
  });

  test("Proposta começa por verbo de ação", () => {
    const [sugestao] = gerar([em(bulletVerboGenerico, verboGenerico)]);
    expect(startsWithGenericVerb(sugestao.after)).toBe(false);

    // E a proposta que continua genérica não passa.
    expect(gerar([em(bulletVerboGenerico, verboAindaGenerico)])).toEqual([]);
  });

  test("Bullet que já começa por verbo de ação recusa proposta de verbo", () => {
    // "Liderei a migração da plataforma de pagamentos." — já começa por verbo de ação.
    const jaBom = jobBulletPath(kobo.id, kobo.bullets[0].id);
    expect(startsWithGenericVerb(kobo.bullets[0].value.text)).toBe(false);

    const sugestoes = gerar([
      em(jaBom, { ...verboGenerico, after: "Comandei a migração da plataforma." }),
    ]);

    expect(sugestoes).toEqual([]);
  });

  test("Construções genéricas são reconhecidas com e sem acento", () => {
    for (const texto of [
      "Responsável por manter o serviço",
      "responsavel pela squad",
      "Participei de reuniões",
      "Worked on the payments API",
      "Trabalhei com Go",
    ]) {
      expect(startsWithGenericVerb(texto), texto).toBe(true);
    }
    expect(startsWithGenericVerb("Reescrevi a API de pagamentos")).toBe(false);
  });
});

describe("Números não apoiados são sinalizados", () => {
  test("Número inédito é sinalizado", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    // "77" não aparece em lugar nenhum do currículo importado.
    expect(userMaterial(importedResume)).not.toContain("77");
    expect(sugestao.unsupportedNumbers).toContain("77");
  });

  test("Número que o usuário escreveu não é sinalizado", () => {
    const [sugestao] = gerar([
      em(
        jobBulletPath(importedResume.jobs[1].id, importedResume.jobs[1].bullets[0].id),
        comNumeroDoUsuario,
      ),
    ]);

    // "1,2" já constava do currículo, em "R$ 1,2M/ano".
    expect(sugestao.unsupportedNumbers).toEqual([]);
  });

  test("Proposta sem número não sinaliza nada", () => {
    const [sugestao] = gerar([em(bulletVerboGenerico, semNumeros)]);
    expect(sugestao.unsupportedNumbers).toEqual([]);
  });

  test("Sinalização não impede a sugestão", () => {
    const [sugestao] = gerar([em(bulletVerboGenerico, verboGenerico)]);

    expect(sugestao.unsupportedNumbers.length).toBeGreaterThan(0);
    expect(SuggestionSchema.safeParse(sugestao).success).toBe(true);
  });

  test("Número inédito sai marcado com til no texto proposto", () => {
    const [sugestao] = gerar([em(bulletSemMetrica, metricaAusente)]);

    // O mesmo "77" que a cena acima vê na lista aparece marcado no texto entregue.
    expect(sugestao.unsupportedNumbers).toContain("77");
    expect(sugestao.after).toContain("~77");
    expect(sugestao.after).not.toContain("~~");

    expect(markEstimates("reduzi a fila de tickets em 20%", "sem numeros aqui")).toBe(
      "reduzi a fila de tickets em ~20%",
    );
  });

  test("Número apoiado não recebe til", () => {
    const [sugestao] = gerar([
      em(
        jobBulletPath(importedResume.jobs[1].id, importedResume.jobs[1].bullets[0].id),
        comNumeroDoUsuario,
      ),
    ]);

    // "1,2" já constava do currículo: é dado do usuário, não estimativa.
    expect(sugestao.after).not.toContain("~");
    expect(markEstimates("cortei 12% do custo", "reduzi 12% no ano")).toBe(
      "cortei 12% do custo",
    );
  });

  test("Til que a IA já escreveu não é duplicado", () => {
    expect(markEstimates("reduzi a fila em ~20%", "sem numeros")).toBe(
      "reduzi a fila em ~20%",
    );
    // E o número seguinte, sem til, continua recebendo o seu.
    expect(markEstimates("de ~20% para 30%", "sem numeros")).toBe("de ~20% para ~30%");
  });

  test("Números equivalentes são reconhecidos", () => {
    expect(normalizeNumber("1.200")).toBe(normalizeNumber("1,200"));
    expect(normalizeNumber("1.200,50")).toBe("1200.5");
    expect(normalizeNumber("1,200.50")).toBe("1200.5");
    expect(extractNumbers("p95 de 840ms para 190ms (-77%)")).toEqual([
      "95",
      "840",
      "190",
      "77",
    ]);
    expect(unsupportedNumbers("cortei 12% do custo", "reduzi 12% no ano")).toEqual([]);
  });
});

describe("Sugerir não altera o currículo", () => {
  test("Currículo permanece intacto", async () => {
    const antes = structuredClone(importedResume);

    await suggestMetrics(importedResume, {
      client: recordedClient({
        suggestions: [em(bulletSemMetrica, metricaAusente)],
      }),
    });

    expect(importedResume).toEqual(antes);
  });

  test("Nenhuma sugestão vem aplicada", async () => {
    const sugestoes = await suggestMetrics(importedResume, {
      client: recordedClient({
        suggestions: [
          em(bulletSemMetrica, metricaAusente),
          em(bulletVerboGenerico, verboGenerico),
        ],
      }),
    });

    for (const sugestao of sugestoes) {
      const trecho = resolvePath(importedResume, sugestao.path);
      expect((trecho.value as { text: string }).text).toBe(sugestao.before);
      expect((trecho.value as { text: string }).text).not.toBe(sugestao.after);
    }
  });
});

describe("Falhas da IA na geração de sugestões", () => {
  test("Resposta fora do esquema é rejeitada", async () => {
    await expect(
      suggestMetrics(importedResume, {
        client: recordedClient({ suggestions: [{ path: bulletSemMetrica }] }),
      }),
    ).rejects.toThrow(AiError);
  });

  test("Falha de comunicação é distinguível", async () => {
    await expect(
      suggestMetrics(importedResume, { client: failingClient("call-failed") }),
    ).rejects.toMatchObject({ reason: "call-failed" });

    await expect(
      suggestMetrics(importedResume, { client: failingClient("missing-credentials") }),
    ).rejects.toMatchObject({ reason: "missing-credentials" });
  });

  test("Currículo sem bullets não é erro", async () => {
    const semBullets = {
      ...importedResume,
      jobs: importedResume.jobs.map((job) => ({ ...job, bullets: [] })),
    };
    const client = recordedClient({ suggestions: [] });

    await expect(suggestMetrics(semBullets, { client })).resolves.toEqual([]);
    // E a IA nem foi chamada.
    expect(client.calls).toHaveLength(0);
  });

  test("Nenhuma chamada real na suíte", () => {
    // Nenhum provedor da cadeia tem credencial no ambiente de teste: qualquer chamada
    // real falharia antes de sair da máquina.
    const configurados = createProviderChain().filter((provider) =>
      provider.isConfigured(),
    );
    expect(configurados.map((provider) => provider.name)).toEqual([]);
  });
});
