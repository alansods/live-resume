/**
 * Verificação de fumaça: o fluxo inteiro contra a API do Gemini de verdade.
 *
 *   npm run smoke
 *
 * CUSTO: 4 chamadas ao modelo por execução — estruturar (importação), métricas, ATS e
 * ordenar-e-traduzir (exportação). O plano gratuito permite 20 por dia, então cinco
 * execuções esgotam a cota do dia. Rodar com consciência disso.
 *
 * POR QUE ELA EXISTE. A suíte nunca chama a API — é regra do projeto, e é a regra certa.
 * O preço é uma classe de defeito que ela não pode pegar, e que já mordeu duas vezes: o
 * modelo `gemini-2.5-flash` foi aposentado e o produto devolvia 502 com a suíte verde; e
 * o PDF funcionava em teste e quebrava empacotado, porque o worker do renderizador só
 * existe no build. Os dois apareceram porque alguém rodou o fluxo à mão. Isto é essa mão,
 * escrita.
 *
 * POR QUE FORA DA SUÍTE. Ela gasta cota, depende de rede e de chave. Quem a dispara é uma
 * pessoa que decidiu gastar quatro das vinte requisições do dia; `npm test` não decide
 * isso por ninguém.
 *
 * Ela roda contra o BUILD DE PRODUÇÃO (`next build` + `next start`), e não contra o
 * servidor de desenvolvimento: metade do que ela existe para pegar só acontece
 * empacotado.
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = Number(process.env.SMOKE_PORT ?? 3210);
const BASE = `http://127.0.0.1:${PORTA}`;
const CHAMADAS_AO_MODELO = 4;
const LIMITE_DIARIO_GRATUITO = 20;

/** O currículo de amostra: o mesmo que a suíte usa para o caminho feliz de DOCX. */
const CURRICULO = join(raiz, "fixtures", "files", "curriculo-completo.docx");

const passos = [];
let servidor = null;

function log(mensagem) {
  console.log(mensagem);
}

async function passo(nome, executar) {
  const inicio = Date.now();
  log(`\n▸ ${nome}…`);
  try {
    const resultado = await executar();
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    passos.push({ nome, ok: true, segundos });
    log(`  ok em ${segundos}s`);
    return resultado;
  } catch (erro) {
    passos.push({ nome, ok: false, erro: erro.message });
    throw erro;
  }
}

/** Erro de fumaça: mensagem legível, sem despejo de objeto. */
function falhar(mensagem) {
  throw new Error(mensagem);
}

async function corpoDoErro(resposta) {
  try {
    const corpo = await resposta.json();
    return corpo?.error?.code
      ? `${corpo.error.code} — ${corpo.error.message ?? ""}`.trim()
      : JSON.stringify(corpo).slice(0, 200);
  } catch {
    return "(corpo ilegível)";
  }
}

function executar(comando, argumentos, opcoes = {}) {
  return new Promise((ok, fail) => {
    const processo = spawn(comando, argumentos, {
      cwd: raiz,
      stdio: "inherit",
      ...opcoes,
    });
    processo.on("error", fail);
    processo.on("exit", (codigo) =>
      codigo === 0 ? ok() : fail(new Error(`${comando} saiu com código ${codigo}`)),
    );
  });
}

async function esperarServidor(limiteMs = 60000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    try {
      const resposta = await fetch(`${BASE}/app`);
      if (resposta.ok) return;
    } catch {
      // Ainda subindo.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  falhar(`o servidor não respondeu em ${BASE} dentro do tempo`);
}

function encerrarServidor() {
  if (servidor && servidor.exitCode === null) servidor.kill("SIGTERM");
}

async function main() {
  log(
    `Fumaça do Currículo Vivo — ${CHAMADAS_AO_MODELO} chamadas ao modelo por execução,\n` +
      `de um limite gratuito de ${LIMITE_DIARIO_GRATUITO} por dia.`,
  );

  const temChave = Object.keys(process.env).some(
    (nome) => nome.endsWith("_API_KEY") && process.env[nome],
  );
  if (!temChave && !existsSync(join(raiz, ".env.local"))) {
    falhar(
      "nenhuma chave de provedor de IA está no ambiente nem há .env.local para o servidor ler",
    );
  }
  if (!existsSync(CURRICULO)) {
    falhar(`currículo de amostra não encontrado: ${CURRICULO} (rode npm run fixtures)`);
  }

  await passo("Build de produção", () => executar("npx", ["next", "build"]));

  await passo("Servidor de produção", async () => {
    servidor = spawn("npx", ["next", "start", "--port", String(PORTA)], {
      cwd: raiz,
      stdio: "inherit",
    });
    servidor.on("exit", (codigo) => {
      if (codigo !== 0 && codigo !== null) {
        log(`  servidor encerrou com código ${codigo}`);
      }
    });
    await esperarServidor();
  });

  const { resume } = await passo("Importar (1 chamada)", async () => {
    const form = new FormData();
    form.append("file", new File([readFileSync(CURRICULO)], "curriculo-completo.docx"));

    const resposta = await fetch(`${BASE}/api/resume-import`, {
      method: "POST",
      body: form,
    });
    if (!resposta.ok) falhar(`importação falhou: ${await corpoDoErro(resposta)}`);

    const corpo = await resposta.json();
    if (!corpo.resume?.header?.name) falhar("a importação não devolveu um currículo");
    log(
      `  currículo de ${corpo.resume.header.name}, ${corpo.resume.jobs.length} experiências`,
    );
    return corpo;
  });

  const pedido = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resume, extraUserText: [] }),
  };

  await passo("Sugestões de métrica e de ATS (2 chamadas)", async () => {
    const [metricas, ats] = await Promise.all([
      fetch(`${BASE}/api/suggestions/metrics`, pedido),
      fetch(`${BASE}/api/suggestions/ats`, pedido),
    ]);

    for (const [nome, resposta] of [
      ["métricas", metricas],
      ["ATS", ats],
    ]) {
      if (!resposta.ok)
        falhar(`sugestões de ${nome} falharam: ${await corpoDoErro(resposta)}`);
    }

    const total =
      ((await metricas.json()).suggestions?.length ?? 0) +
      ((await ats.json()).suggestions?.length ?? 0);
    log(`  ${total} sugestões vindas da IA`);
  });

  await passo("Exportar PT e EN, PDF e DOCX (1 chamada)", async () => {
    const resposta = await fetch(`${BASE}/api/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resume,
        patches: [],
        locales: ["pt", "en"],
        formats: ["pdf", "docx"],
      }),
    });
    if (!resposta.ok) falhar(`exportação falhou: ${await corpoDoErro(resposta)}`);

    const bytes = new Uint8Array(await resposta.arrayBuffer());
    // Quatro saídas vêm empacotadas: o .zip começa com "PK".
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      falhar("a exportação não devolveu um .zip");
    }
    const falhas = resposta.headers.get("x-export-failures");
    if (falhas) falhar(`a exportação teve saídas que falharam: ${falhas}`);
    log(`  ${bytes.length} bytes de .zip com as quatro saídas`);
  });
}

main()
  .then(() => {
    log("\n✔ fumaça passou — o fluxo inteiro respondeu contra a API real.");
    encerrarServidor();
    process.exit(0);
  })
  .catch((erro) => {
    const falhou = passos.find((p) => !p.ok);
    console.error(`\n✘ fumaça falhou${falhou ? ` em: ${falhou.nome}` : ""}`);
    console.error(`  ${erro.message}`);
    encerrarServidor();
    process.exit(1);
  });
