import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  respostaComTextoInventado,
  respostaDeDocumentoQueNaoECurriculo,
  respostaDoCurriculoCompleto,
  respostaDoCurriculoEmDuasColunas,
  respostaReformulada,
} from "@/fixtures/ai-responses";
import { AiError } from "@/lib/ai/client";
import { createProviderChain } from "@/lib/ai";
import { structureResume } from "@/lib/ai/structure";
import { failingClient, recordedClient, sequencedClient } from "@/lib/ai/testing";
import { ResumeSchema } from "@/lib/resume/schema";
import { deserializeResume } from "@/lib/resume/serialize";
import { ImportError } from "./blocks";
import { buildResume } from "./build";
import { extract } from "./detect";
import { assertOnlyExtractedText, RewriteDetectedError } from "./verify";
import { importResume } from "./index";

const fixture = (nome: string) =>
  new Uint8Array(readFileSync(join(process.cwd(), "fixtures", "files", nome)));

const blocosDo = async (nome: string) => (await extract(fixture(nome), nome)).blocks;

describe("Estruturação do modelo pela IA", () => {
  test("Texto extraído vira currículo canônico", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");
    const client = recordedClient(respostaDoCurriculoCompleto);

    const structured = await structureResume(blocks, { client });
    assertOnlyExtractedText(structured, blocks);
    const resume = buildResume(structured);

    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.jobs).toHaveLength(4);
    expect(resume.education).toHaveLength(2);
    // Ids em tudo, origem "importado" em todos os trechos.
    expect(new Set(resume.jobs.map((job) => job.id)).size).toBe(4);
    expect(resume.summary?.origin).toEqual({ kind: "imported" });
    for (const job of resume.jobs) {
      expect(job.period.origin).toEqual({ kind: "imported" });
      for (const bullet of job.bullets) {
        expect(bullet.value.origin).toEqual({ kind: "imported" });
      }
    }
    expect(() => deserializeResume(JSON.stringify(resume))).not.toThrow();
  });

  test("Conteúdo de múltiplas colunas é remontado em ordem", async () => {
    const blocks = await blocosDo("curriculo-duas-colunas.pdf");
    const client = recordedClient(respostaDoCurriculoEmDuasColunas);

    const structured = await structureResume(blocks, { client });
    assertOnlyExtractedText(structured, blocks);
    const resume = buildResume(structured);

    // O bullet estava na coluna da direita e a habilidade na esquerda: cada um foi
    // parar no seu campo.
    expect(resume.jobs[0].bullets[0].value.text).toContain("Liderei a migração");
    expect(resume.skills?.text).toContain("Go, Python, AWS");
    expect(resume.education[0].school).toBe("Insper");

    // E o prompt recebeu a marcação de coluna que permite essa remontagem.
    expect(client.calls[0].prompt).toContain("[coluna 1]");
    expect(client.calls[0].prompt).toContain("[coluna 2]");
  });

  test("Resposta fora do esquema é rejeitada", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");
    const client = recordedClient({ header: { name: "Marina" } });

    await expect(structureResume(blocks, { client })).rejects.toThrow(AiError);
    await expect(structureResume(blocks, { client })).rejects.toMatchObject({
      reason: "invalid-response",
    });
  });

  test("Falha de comunicação com a IA", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    await expect(
      structureResume(blocks, { client: failingClient("call-failed") }),
    ).rejects.toMatchObject({ reason: "call-failed" });
  });

  test("Configuração ausente", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    await expect(
      structureResume(blocks, { client: failingClient("missing-credentials") }),
    ).rejects.toMatchObject({ reason: "missing-credentials" });
  });

  test("Resposta sem formação estrutura currículo com lista vazia", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");
    const semFormacao: Record<string, unknown> = { ...respostaDoCurriculoCompleto };
    delete semFormacao.education;
    const client = recordedClient(semFormacao);

    const structured = await structureResume(blocks, { client });
    const resume = buildResume(structured);

    expect(resume.education).toEqual([]);
  });

  test("Resposta sem habilidades estrutura currículo com habilidades vazias", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");
    const semHabilidades: Record<string, unknown> = { ...respostaDoCurriculoCompleto };
    delete semHabilidades.skills;
    const client = recordedClient(semHabilidades);

    const structured = await structureResume(blocks, { client });
    const resume = buildResume(structured);

    expect(resume.skills).toBeNull();
  });

  test("Testes não chamam a IA real", () => {
    // Nenhum provedor da cadeia tem credencial no ambiente de teste, então qualquer
    // chamada real falharia antes de sair da máquina. A verificação é sobre a cadeia
    // toda, e não sobre uma chave: acrescentar um provedor não abre um furo aqui.
    const configurados = createProviderChain().filter((provider) =>
      provider.isConfigured(),
    );
    expect(configurados.map((provider) => provider.name)).toEqual([]);
  });
});

describe("A IA distribui o texto, não o reescreve", () => {
  test("Texto inventado é rejeitado", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    expect(() => assertOnlyExtractedText(respostaComTextoInventado, blocks)).toThrow(
      RewriteDetectedError,
    );
    // O erro nomeia o campo e mostra o texto que não foi encontrado.
    expect(() => assertOnlyExtractedText(respostaComTextoInventado, blocks)).toThrow(
      /latência p95 em 77%/,
    );
    expect(() => assertOnlyExtractedText(respostaComTextoInventado, blocks)).toThrow(
      /jobs\[0\]\.bullets\[0\]/,
    );
  });

  test("Reformulação é rejeitada", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // Mesmo sentido, palavras diferentes: continua sendo reescrita.
    expect(() => assertOnlyExtractedText(respostaReformulada, blocks)).toThrow(
      RewriteDetectedError,
    );
    expect(() => assertOnlyExtractedText(respostaReformulada, blocks)).toThrow(/summary/);
  });

  test("Normalização de espaços é aceita", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");
    const comEspacos = {
      ...respostaDoCurriculoCompleto,
      summary: `  ${respostaDoCurriculoCompleto.summary?.replace(/ /g, "   ")}  `,
      jobs: respostaDoCurriculoCompleto.jobs.map((job, indice) =>
        indice === 0
          ? { ...job, bullets: [`• ${job.bullets[0]}`, ...job.bullets.slice(1)] }
          : job,
      ),
    };

    expect(() => assertOnlyExtractedText(comEspacos, blocks)).not.toThrow();
  });

  test("Divisão de bloco é aceita", async () => {
    const blocks = await blocosDo("curriculo-paragrafo.docx");
    // No DOCX de parágrafo corrido, as duas entregas vieram num bloco só. Dividir em
    // dois bullets é distribuição, não reescrita.
    const dividido = {
      ...respostaDoCurriculoCompleto,
      summary: null,
      education: [],
      skills: null,
      jobs: respostaDoCurriculoCompleto.jobs.map((job) => ({
        ...job,
        bullets: job.bullets,
      })),
    };

    expect(() => assertOnlyExtractedText(dividido, blocks)).not.toThrow();
  });

  test("Pontuação de ligação é aceita", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // O caso real: o arquivo traz "IDIOMAS" como título e o texto logo abaixo. Ao
    // juntar os dois numa linha, a IA precisa de um dois-pontos que o arquivo não tem.
    const comLigacao = {
      ...respostaDoCurriculoCompleto,
      skills: `Habilidades: ${respostaDoCurriculoCompleto.skills}`,
    };

    expect(() => assertOnlyExtractedText(comLigacao, blocks)).not.toThrow();
  });

  test("Palavra trocada é recusada mesmo com a pontuação igual", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // Ignorar pontuação não pode virar ignorar conteúdo: uma palavra a mais derruba.
    const comPalavraTrocada = {
      ...respostaDoCurriculoCompleto,
      skills: (respostaDoCurriculoCompleto.skills ?? "").replace("Kafka", "RabbitMQ"),
    };

    expect(() => assertOnlyExtractedText(comPalavraTrocada, blocks)).toThrow(
      RewriteDetectedError,
    );
  });

  test("Campo reunido de partes distantes é aceito", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // O caso que derrubou o primeiro currículo real: a IA reuniu numa linha só dois
    // trechos que o arquivo traz em pontos distantes — lá, habilidades e idiomas.
    // Nenhuma palavra mudou; o campo só deixou de ser um trecho contíguo.
    const primeiro = respostaDoCurriculoCompleto.jobs[0].bullets[0];
    const distante = respostaDoCurriculoCompleto.jobs[2].bullets[0];
    const reunido = {
      ...respostaDoCurriculoCompleto,
      summary: `${primeiro} ${distante}`,
    };

    expect(() => assertOnlyExtractedText(reunido, blocks)).not.toThrow();
  });

  test("Fragmento reformulado derruba o campo inteiro", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // Dois fragmentos: o primeiro veio do arquivo, o segundo foi reescrito. Basta um.
    const meioReescrito = {
      ...respostaDoCurriculoCompleto,
      summary: `${respostaDoCurriculoCompleto.jobs[0].bullets[0]} Domínio pleno de arquitetura distribuída.`,
    };

    expect(() => assertOnlyExtractedText(meioReescrito, blocks)).toThrow(
      RewriteDetectedError,
    );
    expect(() => assertOnlyExtractedText(meioReescrito, blocks)).toThrow(/summary/);
  });

  test("Colagem de palavras soltas em prosa é recusada", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // Cada pedaço existe no arquivo; nenhum é longo o bastante para ser prova. Sem o
    // piso de tamanho, esta colagem passaria — e a trava viraria enfeite. Em prosa a
    // regra continua estrita.
    const colagem = {
      ...respostaDoCurriculoCompleto,
      summary: "Go. Python. AWS. Kafka.",
    };

    expect(() => assertOnlyExtractedText(colagem, blocks)).toThrow(RewriteDetectedError);
  });

  test("Colagem de palavras soltas em habilidades é aceita", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // O caso real que derrubou currículos (ex.: "Conhecimentos" com cada habilidade
    // numa linha): a IA agrega no campo tokens que existem espalhados pelo arquivo.
    // Toda palavra veio do documento — a trava por palavra deixa passar.
    const colagem = {
      ...respostaDoCurriculoCompleto,
      skills: "Go. Python. AWS. Kafka.",
    };

    expect(() => assertOnlyExtractedText(colagem, blocks)).not.toThrow();
  });

  test("Habilidades agregadas de seções distantes são aceitas", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // Agregação realista: a ordem do campo não existe contígua no arquivo, mas cada
    // token sim — inclusive os que vêm de trechos separados por outras seções.
    const agregadas = {
      ...respostaDoCurriculoCompleto,
      skills: "PostgreSQL, Terraform, Go, AWS, Kafka",
    };

    expect(() => assertOnlyExtractedText(agregadas, blocks)).not.toThrow();
  });

  test("Habilidade inventada é recusada", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // Uma palavra que não existe em lugar nenhum do arquivo continua derrubando:
    // a trava por palavra existe exatamente para isso.
    const comInventada = {
      ...respostaDoCurriculoCompleto,
      skills: "Go, Python, AWS, GraphQL",
    };

    expect(() => assertOnlyExtractedText(comInventada, blocks)).toThrow(
      RewriteDetectedError,
    );
    expect(() => assertOnlyExtractedText(comInventada, blocks)).toThrow(/skills/);
  });

  test("Conectivo fora do arquivo não recusa habilidades", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");

    // "or" não aparece no arquivo: é conectivo de ligação entre os tokens, ignorado
    // pela verificação por palavra.
    const comConectivo = {
      ...respostaDoCurriculoCompleto,
      skills: "Go or Python or AWS",
    };

    expect(() => assertOnlyExtractedText(comConectivo, blocks)).not.toThrow();
  });
});

describe("Segunda tentativa quando a trava recusa", () => {
  const bytes = () =>
    new Uint8Array(
      readFileSync(join(process.cwd(), "fixtures", "files", "curriculo-completo.docx")),
    );

  test("Resposta recusada é pedida uma segunda vez", async () => {
    const client = sequencedClient([
      respostaComTextoInventado,
      respostaDoCurriculoCompleto,
    ]);

    const { resume } = await importResume(bytes(), { client });

    // A primeira resposta foi recusada e o usuário não viu erro nenhum.
    expect(client.calls).toHaveLength(2);
    expect(resume.header.name).toBe("Marina Alencar");
  });

  test("A segunda tentativa diz o que foi recusado", async () => {
    const client = sequencedClient([
      respostaComTextoInventado,
      respostaDoCurriculoCompleto,
    ]);

    await importResume(bytes(), { client });

    const primeiro = String(client.calls[0].prompt);
    const segundo = String(client.calls[1].prompt);

    expect(segundo).not.toBe(primeiro);
    expect(segundo).toContain("jobs[0].bullets[0]");
    // A forma da divergência vai junto; o texto certo, não — nós não o sabemos.
    expect(segundo).toMatch(/divergência: (sem-acento|ausente|palavras:\d+)/);
  });

  test("Duas recusas falham a importação", async () => {
    const client = sequencedClient([respostaComTextoInventado]);

    await expect(importResume(bytes(), { client })).rejects.toThrow(RewriteDetectedError);
  });

  test("Não há terceira tentativa", async () => {
    const client = sequencedClient([respostaComTextoInventado]);

    await expect(importResume(bytes(), { client })).rejects.toThrow();
    expect(client.calls).toHaveLength(2);
  });

  test("Documento que não é currículo é recusado", async () => {
    const client = recordedClient(respostaDeDocumentoQueNaoECurriculo);

    const erro = await importResume(bytes(), { client }).catch((falha) => falha);

    // ImportError, e não erro genérico: é o arquivo que não serve, e a etapa 01 já sabe
    // exibir este caminho — é o mesmo do ".odt não suportado".
    expect(erro).toBeInstanceOf(ImportError);
    expect((erro as ImportError).reason).toBe("not-a-resume");
  });

  test("Documento que não é currículo não é pedido duas vezes", async () => {
    const client = recordedClient(respostaDeDocumentoQueNaoECurriculo);

    await expect(importResume(bytes(), { client })).rejects.toThrow(ImportError);

    // A repetição existe para reescrita, que é falha do modelo. Arquivo errado não
    // melhora na segunda tentativa — e a cota diária é de 20 requisições.
    expect(client.calls).toHaveLength(1);
  });

  test("O veredito não vaza para o currículo montado", async () => {
    const blocks = await blocosDo("curriculo-completo.docx");
    const client = recordedClient(respostaDoCurriculoCompleto);

    const structured = await structureResume(blocks, { client });
    const resume = buildResume(structured);

    // `documentKind` é do pedido, não do documento: o modelo canônico é estrito, e um
    // campo a mais nele quebraria a validação.
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(Object.keys(resume)).not.toContain("documentKind");
  });

  test("O registro da falha não contém texto do currículo", async () => {
    const client = sequencedClient([respostaComTextoInventado]);

    let erro: RewriteDetectedError | null = null;
    try {
      await importResume(bytes(), { client });
    } catch (falha) {
      erro = falha as RewriteDetectedError;
    }

    // O que vai para o log é campo e forma — e nenhum dos dois carrega currículo.
    expect(erro).toBeInstanceOf(RewriteDetectedError);
    expect(erro!.field).toBe("jobs[0].bullets[0]");
    expect(erro!.divergence).toMatch(/^(sem-acento|ausente|palavras:\d+)$/);
    expect(erro!.divergence).not.toContain("latência");
    expect(erro!.divergence).not.toContain("Liderei");
  });
});
