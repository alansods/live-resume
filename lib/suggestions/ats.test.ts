import { describe, expect, test, vi } from "vitest";
import { importedResume, minimalResume, nonIndexableResume } from "@/fixtures/resumes";
import {
  atsForaDeEscopo,
  habilidadesNaoIndexaveis,
  resumoSemPalavraChave,
} from "@/fixtures/suggestion-responses";
import { AiError } from "@/lib/ai/client";
import { suggestAts } from "@/lib/ai/suggest-ats";
import { failingClient, neverCalledClient, recordedClient } from "@/lib/ai/testing";
import { generateFinal } from "@/lib/resume/generate";
import { jobBulletPath } from "@/lib/resume/paths";
import { suggestDates } from "./dates";
import { serializeResume } from "@/lib/resume/serialize";
import { atsScore, MAX_SCORE, SCORE_WEIGHTS } from "./ats";
import { SuggestionSchema, type RawAtsSuggestion, type Suggestion } from "./model";
import { hasProficiencyIndicator } from "./proficiency";
import { validateSuggestions } from "./validate";

const ids = () => {
  let n = 0;
  return () => `s${(n += 1)}`;
};

/** Gera as sugestões a partir de uma resposta gravada, sem tocar na API. */
async function gerar(
  resume = nonIndexableResume,
  suggestions: RawAtsSuggestion[] = [resumoSemPalavraChave, habilidadesNaoIndexaveis],
) {
  const client = recordedClient({ suggestions });
  const resultado = await suggestAts(resume, { client, makeId: ids() });
  return { resultado, client };
}

const porPath = (sugestoes: Suggestion[], path: string) =>
  sugestoes.find((sugestao) => sugestao.path === path);

/** Sugestões sintéticas para a pontuação — o que importa é o tipo e o id. */
const sug = (id: string, kind: Suggestion["kind"]): Suggestion => ({
  id,
  kind,
  path: `p-${id}`,
  where: "",
  title: "t",
  before: "antes",
  after: "depois",
  why: "porque",
  action: kind === "ats" ? "rewrite" : "apply",
  unsupportedNumbers: [],
});

describe("Sugestão de resumo sem palavra-chave", () => {
  test("Resumo de adjetivos recebe proposta", async () => {
    const { resultado } = await gerar();

    const sugestao = porPath(resultado, "summary");
    expect(sugestao).toBeDefined();
    expect(sugestao?.kind).toBe("ats");
    expect(sugestao?.after).not.toBe(sugestao?.before);
  });

  test("Resumo já indexável não recebe proposta", async () => {
    // O resumo de `importedResume` já nomeia área, ferramentas e escopo: a IA não
    // devolve proposta para ele, e a regra que a instrui a se calar está no prompt.
    const { resultado, client } = await gerar(importedResume, [habilidadesNaoIndexaveis]);

    expect(porPath(resultado, "summary")).toBeUndefined();
    expect(client.calls[0].system).toContain("Não proponha nada para um trecho que já");
  });

  test("A proposta trata da mesma trajetória", async () => {
    const { resultado } = await gerar();

    const sugestao = porPath(resultado, "summary");
    expect(sugestao?.after.toLowerCase()).toContain("enfermeiro");
  });

  test("Currículo sem resumo não recebe sugestão de resumo", async () => {
    const semResumo = { ...nonIndexableResume, summary: null };
    const { resultado } = await gerar(semResumo, [resumoSemPalavraChave]);

    expect(porPath(resultado, "summary")).toBeUndefined();
    expect(resultado).toHaveLength(0);
  });
});

describe("Sugestão de habilidades não indexáveis", () => {
  test("Símbolo de nível vira texto corrido", async () => {
    const { resultado } = await gerar();

    const sugestao = porPath(resultado, "skills");
    expect(sugestao).toBeDefined();
    expect(sugestao?.before).toContain("★");
    expect(sugestao?.after).not.toContain("★");
  });

  test("Nenhuma competência se perde na conversão", async () => {
    const { resultado } = await gerar();

    const sugestao = porPath(resultado, "skills");
    for (const competencia of ["Emergência", "UTI", "Excel", "Inglês"]) {
      expect(sugestao?.after, competencia).toContain(competencia);
    }
  });

  test("Percentual de proficiência também é convertido", async () => {
    const { resultado } = await gerar();

    const sugestao = porPath(resultado, "skills");
    expect(sugestao?.before).toContain("(80%)");
    expect(sugestao?.after).toContain("Excel");
    expect(sugestao?.after).not.toContain("80%");
  });

  test("Habilidades já em texto não recebem proposta", async () => {
    // `importedResume` já traz "Go, Python, AWS, …" em lista corrida — e aqui a IA
    // devolve proposta assim mesmo, que é o caso que o prompt não consegue impedir.
    const { resultado, client } = await gerar(importedResume, [habilidadesNaoIndexaveis]);

    expect(porPath(resultado, "skills")).toBeUndefined();
    expect(client.calls[0].system).toContain("lista corrida sem indicador de nível");
  });

  test("Currículo sem habilidades não recebe sugestão de habilidades", async () => {
    const semHabilidades = { ...nonIndexableResume, skills: null };
    const { resultado } = await gerar(semHabilidades, [habilidadesNaoIndexaveis]);

    expect(porPath(resultado, "skills")).toBeUndefined();
    expect(resultado).toHaveLength(0);
  });
});

describe("Sugestão só existe onde há defeito", () => {
  test("Habilidades sem indicador de nível recusam proposta da IA", async () => {
    // A IA propõe conversão para habilidades que já são lista corrida. Nada a converter.
    const { resultado } = await gerar(importedResume, [habilidadesNaoIndexaveis]);
    expect(porPath(resultado, "skills")).toBeUndefined();

    // E o detector reconhece as formas que o handoff nomeia — sem elas, não há defeito.
    expect(hasProficiencyIndicator("Go, Python, AWS, Kubernetes, PostgreSQL")).toBe(
      false,
    );
    for (const comIndicador of [
      "Go ★★★★☆ · Python ★★★☆☆",
      "Excel — nível avançado (80%)",
      "Inglês: fluente",
      "Photoshop ▮▮▮▯▯",
    ]) {
      expect(hasProficiencyIndicator(comIndicador), comIndicador).toBe(true);
    }
  });

  test("A nota de um currículo sem defeito é o máximo", async () => {
    /*
     * O cenário que motivou a change: currículo bom, IA propondo reescrita assim mesmo.
     * As propostas sem defeito correspondente caem, e o que sobra não desconta nada.
     */
    const job = importedResume.jobs[0];
    const bulletBom = job.bullets[0]; // "Liderei a migração…" — verbo de ação, sem defeito

    const ats = await gerar(importedResume, [habilidadesNaoIndexaveis]);
    const verbos = validateSuggestions(importedResume, [
      {
        path: jobBulletPath(job.id, bulletBom.id),
        kind: "verb",
        title: "t",
        after: "Comandei a migração da plataforma.",
        why: "w",
      },
    ]);

    const entregues = [...ats.resultado, ...verbos];
    expect(entregues).toHaveLength(0);
    expect(atsScore(entregues, new Set())).toBe(MAX_SCORE);
  });
});

describe("Currículo já revisado", () => {
  test("Currículo já revisado não reapresenta os mesmos defeitos", async () => {
    /*
     * O ciclo completo: revisar, exportar, reimportar o arquivo revisado. Se o app
     * reencontrasse os mesmos defeitos, a nota cairia depois de a pessoa ter feito
     * exatamente o que ele pediu.
     *
     * O resumo fica fora da conta de propósito: julgar se um texto carrega palavra-chave
     * é do modelo, e nenhuma trava determinística pode prometer estabilidade ali.
     */
    const datas = suggestDates(importedResume).suggestions;
    expect(datas.length).toBeGreaterThan(0);

    const revisado = generateFinal(
      importedResume,
      datas.map((sugestao) => ({ path: sugestao.path, text: sugestao.after })),
      undefined,
    );

    // Datas: determinísticas, e nada sobra depois de aplicadas.
    expect(suggestDates(revisado).suggestions).toEqual([]);

    // E as propostas que a IA insistisse em fazer sobre o revisado não passam.
    const job = revisado.jobs[0];
    const comNumero = job.bullets.find((bullet) => /\d/.test(bullet.value.text));
    const doVerbo = job.bullets[0];

    const reincidentes = validateSuggestions(revisado, [
      ...(comNumero
        ? [
            {
              path: jobBulletPath(job.id, comNumero.id),
              kind: "metric" as const,
              title: "t",
              after: "Outra métrica qualquer, 50%.",
              why: "w",
            },
          ]
        : []),
      {
        path: jobBulletPath(job.id, doVerbo.id),
        kind: "verb" as const,
        title: "t",
        after: "Comandei a migração.",
        why: "w",
      },
    ]);
    expect(reincidentes).toEqual([]);

    const { resultado: habilidades } = await gerar(revisado, [habilidadesNaoIndexaveis]);
    expect(porPath(habilidades, "skills")).toBeUndefined();
  });
});

describe("Escopo das sugestões de ATS", () => {
  test("Bullet não recebe sugestão de ATS", async () => {
    const job = nonIndexableResume.jobs[0];
    const noBullet: RawAtsSuggestion = {
      ...atsForaDeEscopo,
      path: jobBulletPath(job.id, job.bullets[0].id),
    };

    const { resultado } = await gerar(nonIndexableResume, [
      noBullet,
      resumoSemPalavraChave,
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].path).toBe("summary");
  });

  test("Formatação que a geração conserta não vira sugestão", async () => {
    // Não existe path para layout, tabela ou fonte: uma proposta dessas não tem onde
    // ancorar e cai fora. A regra que instrui a IA a nem tentar está no prompt.
    const { resultado, client } = await gerar(nonIndexableResume, [
      { ...atsForaDeEscopo, path: "document.layout" },
      { ...atsForaDeEscopo, path: "document.font" },
    ]);

    expect(resultado).toHaveLength(0);
    expect(client.calls[0].system).toContain("NÃO sugira nada sobre formatação");
  });

  test("No máximo duas sugestões de ATS", async () => {
    const { resultado } = await gerar(nonIndexableResume, [
      resumoSemPalavraChave,
      {
        ...resumoSemPalavraChave,
        after: "Outra proposta de resumo para o mesmo trecho.",
      },
      habilidadesNaoIndexaveis,
      { ...habilidadesNaoIndexaveis, after: "Emergência, UTI" },
    ]);

    expect(resultado).toHaveLength(2);
    expect(new Set(resultado.map((s) => s.path))).toEqual(new Set(["summary", "skills"]));
  });
});

describe("Números não apoiados na reescrita de resumo", () => {
  test("Tempo de experiência inédito é sinalizado", async () => {
    const { resultado } = await gerar();

    // "8 anos" não aparece em lugar nenhum do material do usuário.
    expect(porPath(resultado, "summary")?.unsupportedNumbers).toContain("8");
  });

  test("Número que o usuário escreveu não é sinalizado", async () => {
    const { resultado } = await gerar(nonIndexableResume, [
      {
        ...resumoSemPalavraChave,
        after: "Enfermeiro em terapia intensiva adulto desde 2019, em emergência e UTI.",
      },
    ]);

    // 2019 é o início da experiência atual, que o usuário escreveu.
    expect(porPath(resultado, "summary")?.unsupportedNumbers).toEqual([]);
  });

  test("Conversão de habilidades não inventa número", async () => {
    const { resultado } = await gerar();

    const sugestao = porPath(resultado, "skills");
    expect(sugestao?.after).not.toMatch(/\d/);
    expect(sugestao?.unsupportedNumbers).toEqual([]);
  });
});

describe("Pontuação de ATS projetada sobre o conjunto marcado", () => {
  const conjunto = [sug("a", "ats"), sug("b", "dates"), sug("c", "metric")];
  const pendencia = SCORE_WEIGHTS.ats + SCORE_WEIGHTS.dates + SCORE_WEIGHTS.metric;

  test("Sem marcação, a pontuação é a do currículo como está", () => {
    expect(atsScore(conjunto, new Set())).toBe(MAX_SCORE - pendencia);
  });

  test("Currículos diferentes partem de pontuações diferentes", () => {
    // Um currículo cujo resumo já é indexável não gera sugestão de ATS para ele.
    const comResumoFraco = [sug("a", "ats")];
    const comResumoIndexavel: Suggestion[] = [];

    expect(atsScore(comResumoIndexavel, new Set())).toBeGreaterThan(
      atsScore(comResumoFraco, new Set()),
    );
    expect(atsScore(comResumoIndexavel, new Set())).toBe(MAX_SCORE);
  });

  test("Marcar uma sugestão sobe a pontuação", () => {
    const antes = atsScore(conjunto, new Set());
    const depois = atsScore(conjunto, new Set(["a"]));

    expect(depois).toBeGreaterThan(antes);
    expect(depois - antes).toBe(SCORE_WEIGHTS.ats);
  });

  test("Marcar mais nunca baixa a pontuação", () => {
    const marcadas = new Set<string>();
    let anterior = atsScore(conjunto, marcadas);

    for (const sugestao of conjunto) {
      marcadas.add(sugestao.id);
      const atual = atsScore(conjunto, marcadas);
      expect(atual).toBeGreaterThanOrEqual(anterior);
      anterior = atual;
    }
  });

  test("Desmarcar devolve a pontuação anterior", () => {
    const antes = atsScore(conjunto, new Set(["a"]));
    const marcadas = new Set(["a", "b"]);
    marcadas.delete("b");

    expect(atsScore(conjunto, marcadas)).toBe(antes);
  });

  test("Marcar tudo leva ao máximo", () => {
    expect(atsScore(conjunto, new Set(conjunto.map((s) => s.id)))).toBe(MAX_SCORE);
  });

  test("Pontuação fica no intervalo", () => {
    // Currículo com sugestões demais satura no piso, sem estourar para negativo.
    const muitas = Array.from({ length: 40 }, (_, i) => sug(`m${i}`, "ats"));

    expect(atsScore(muitas, new Set())).toBe(0);
    expect(atsScore(muitas, new Set(muitas.map((s) => s.id)))).toBe(MAX_SCORE);
  });

  test("Mesma entrada, mesma pontuação", () => {
    const marcadas = new Set(["b"]);

    expect(atsScore(conjunto, marcadas)).toBe(atsScore(conjunto, marcadas));
  });
});

describe("Sugestões de ATS respeitam o contrato comum", () => {
  test("Modelo comum é respeitado nas sugestões de ATS", async () => {
    const { resultado } = await gerar();

    for (const sugestao of resultado) {
      expect(SuggestionSchema.safeParse(sugestao).success).toBe(true);
      expect(sugestao.kind).toBe("ats");
    }
    expect(porPath(resultado, "summary")?.action).toBe("rewrite");
    expect(porPath(resultado, "skills")?.action).toBe("toText");
  });

  test("Texto atual corresponde ao trecho endereçado", async () => {
    const { resultado } = await gerar();

    expect(porPath(resultado, "summary")?.before).toBe(nonIndexableResume.summary?.text);
  });

  test("Path que não resolve é descartado na geração de ATS", async () => {
    const { resultado } = await gerar(nonIndexableResume, [
      { ...atsForaDeEscopo, path: "resumo-do-candidato" },
      habilidadesNaoIndexaveis,
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].path).toBe("skills");
  });

  test("Currículo permanece intacto ao sugerir ATS", async () => {
    const antes = serializeResume(nonIndexableResume);

    const { resultado } = await gerar();

    expect(serializeResume(nonIndexableResume)).toBe(antes);
    for (const sugestao of resultado) {
      expect(antes).not.toContain(sugestao.after);
    }
  });
});

describe("Falhas da IA na geração de sugestões de ATS", () => {
  test("Resposta de ATS fora do esquema é rejeitada", async () => {
    const client = recordedClient({ suggestions: [{ path: "summary" }] });

    await expect(suggestAts(nonIndexableResume, { client })).rejects.toMatchObject({
      name: "AiError",
      reason: "invalid-response",
    });
  });

  test("Falha de comunicação na geração de ATS é distinguível", async () => {
    const falha = suggestAts(nonIndexableResume, {
      client: failingClient("call-failed"),
    });

    await expect(falha).rejects.toBeInstanceOf(AiError);
    await expect(falha).rejects.toMatchObject({ reason: "call-failed" });
  });

  test("Currículo sem resumo e sem habilidades não chama a IA", async () => {
    const resultado = await suggestAts(minimalResume, { client: neverCalledClient() });

    expect(resultado).toEqual([]);
  });
});

describe("Testes de ATS sem a IA real", () => {
  test("Nenhuma chamada real de ATS na suíte", async () => {
    // Sem cliente injetado e com a cadeia de provedores desligada, a operação falha na
    // credencial — prova de que nenhum caminho de teste alcança API nenhuma.
    vi.stubEnv("AI_PROVIDERS", "none");

    await expect(suggestAts(nonIndexableResume)).rejects.toMatchObject({
      reason: "missing-credentials",
    });

    vi.unstubAllEnvs();
  });
});
