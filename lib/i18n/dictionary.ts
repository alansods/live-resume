/**
 * Textos da interface, em português e inglês.
 *
 * O i18n cobre **só o texto do app**. O conteúdo do currículo do usuário nunca é
 * traduzido em tela: ele existe no idioma dele, e a tradução acontece apenas na
 * exportação, se ele marcar essa saída.
 *
 * O dicionário em inglês é tipado a partir do português, então uma chave nova sem
 * tradução é erro de compilação, não string faltando em produção.
 */

export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];

const pt = {
  step2: {
    kicker: "PASSO 02 DE 04",
    title: "Atualizar",
    subtitle:
      "Escreva solto, com números quando tiver. O que já está no arquivo continua lá.",
    blocked: "Corrija os campos marcados antes de avançar.",
  },
  sections: {
    education: "Formação e certificações",
    experience: "Experiências e promoções",
    skills: "Novas habilidades",
  },
  add: {
    education: "Adicionar formação",
    experience: "Adicionar experiência",
    skill: "Adicionar habilidade",
  },
  /*
   * O vazio tem duas linhas: a primeira constata, a segunda diz o que entra ali. Uma
   * frase só precisaria escolher entre informar e convidar, e escolhia informar — a
   * pessoa lia que não havia nada e não ficava sabendo o que deveria acrescentar.
   */
  empty: {
    education: "Nenhuma formação nova.",
    educationHint:
      "As do arquivo importado seguem no currículo. Adicione só o que entrou depois da última versão.",
    experience: "Nenhuma experiência nova desde a última versão.",
    experienceHint:
      "Mudou de empresa, foi promovido ou assumiu um escopo maior? Registre aqui.",
    skills: "Nenhuma habilidade nova.",
    skillsHint:
      "Ferramentas, linguagens ou certificações que você passou a usar no dia a dia.",
  },
  count: {
    one: "item",
    many: "itens",
  },
  fields: {
    course: "Curso",
    school: "Instituição",
    start: "Início",
    finish: "Conclusão",
    company: "Empresa",
    role: "Cargo",
    end: "Fim",
    delivered: "O que você entregou? (números ajudam)",
    skill: "Habilidade",
    ongoing: "Em andamento",
    month: "Mês",
  },
  modal: {
    newEducation: "Nova formação",
    newExperience: "Nova experiência",
    newSkill: "Nova habilidade",
    cancel: "Cancelar",
    confirm: "Adicionar",
    close: "Fechar",
  },
  actions: {
    remove: "Remover",
  },
  dates: {
    format: "mm/aaaa",
    invalidMonth: "Mês precisa estar entre 01 e 12.",
    missingMonth: "Informe mês e ano, no formato mm/aaaa.",
    invalidFormat: "Formato de data inválido.",
    endBeforeStart: "O fim não pode ser anterior ao início.",
  },
  dateNotice: {
    title: "As datas foram organizadas",
    body: "Ajustamos os períodos para mm/aaaa, que é o formato que os sistemas de recrutamento leem. Onde o arquivo trazia só o ano, escolhemos o mês. Não precisam ser exatamente as datas reais — confira se fazem sentido antes de exportar.",
  },
  step3: {
    kicker: "PASSO 03 DE 04",
    title: "Revisar",
    subtitle:
      "Marque o que você quer no currículo final. Nada muda no seu currículo enquanto você decide.",
  },
  review: {
    panelTitle: "Sugestões",
    panelNote: "O texto proposto aparece só aqui no cartão, nunca no currículo.",
    pendingOne: "sugestão pendente",
    pendingMany: "sugestões pendentes",
    selectAll: "Aceitar todas",
    select: "Aceitar sugestão",
    selected: "Sugestão aceita",
    dismiss: "Ignorar",
    details: "Ver detalhes",
    suggestion: "sugestão",
    current: "Como está:",
    proposed: "Proposta:",
    empty: "Nenhuma sugestão para este currículo.",
    emptyFilter: "Nenhuma sugestão deste tipo.",
    unsupported: "Confirme os números desta proposta: eles não estavam no seu material.",
  },
  filters: {
    all: "Todas",
    metric: "Métrica",
    verb: "Métrica",
    dates: "Datas",
    ats: "ATS",
  },
  score: {
    label: "Pontuação ATS",
    /** O rótulo curto do chip da top bar, onde não cabe a frase inteira. */
    short: "ATS",
    outOf: "/ 100",
    done: "Todas as sugestões tratadas",
  },
  shell: {
    brand: "Currículo Vivo",
    stepsTitle: "Etapas · 4 passos",
    back: "Voltar",
    backHomeLabel: "Voltar para a home",
    next: "Avançar",
    step1: "Importar",
    step2: "Atualizar",
    step3: "Revisar",
    step4: "Exportar",
  },
  wait: {
    reload: "Não recarregue a página.",
    partialSuggestions:
      "Parte das sugestões não pôde ser obtida agora. As que aparecem estão completas; sair desta etapa e entrar de novo tenta buscar o resto.",
  },
  /**
   * O aviso de cota não promete prazo, e é de propósito.
   *
   * Ele dizia "acabou por hoje" e "tente em 24 horas", que é o limite DIÁRIO. Mas o 429 da
   * API cobre várias janelas — por minuto, por dia, por gasto — e o que a resposta traz de
   * documentado é só o status: não dá para saber qual delas estourou sem ler um campo que
   * o Google não promete manter. Prometer 24 horas a quem estourou o limite por minuto
   * manda a pessoa embora por um dia inteiro sem motivo.
   *
   * O aviso vai em tom de atenção (`WarningNotice`), não de falha: nada quebrou, a pessoa
   * só chegou a um limite.
   */
  failure: {
    quota: "O limite de uso gratuito acabou. Tente novamente mais tarde.",
    quotaSuggestions:
      "O limite de uso gratuito acabou, então as sugestões da IA não vieram. As de data estão aí: são calculadas aqui mesmo. Tente novamente mais tarde.",
    importFailed: "Não foi possível importar o currículo. Tente novamente.",
    analysisFailed: "Não foi possível analisar o currículo. Tente novamente.",
    exportFailed: "Não foi possível gerar os arquivos. Tente novamente.",
  },
  /**
   * As recusas da importação, pelo código que a rota devolve.
   *
   * A rota manda uma mensagem junto, mas ela é escrita no servidor e sempre em português
   * — serve para log e para teste. Com a interface em inglês, ela aparecia em português
   * no meio de tudo o mais traduzido. A tela escolhe o texto pelo código; a mensagem do
   * servidor fica como último recurso, para um código que ela não conheça.
   *
   * `{limit}` é preenchido com o limite real de `MAX_FILE_BYTES`, para o texto não
   * envelhecer se a constante mudar. O formato recebido não é ecoado: quem acabou de
   * escolher o arquivo sabe qual foi.
   */
  importErrors: {
    "unsupported-format": "Formato não suportado. Envie o currículo em DOCX ou PDF.",
    "corrupted-file": "O arquivo não pôde ser lido — o conteúdo parece corrompido.",
    "pdf-without-text-layer":
      "Este PDF não tem texto selecionável: ele parece ser uma digitalização. Envie o PDF gerado pelo editor de texto, ou o DOCX.",
    "file-too-large": "Arquivo grande demais. O limite é {limit} MB.",
    "pdf-reader-unavailable":
      "Não foi possível iniciar o leitor de PDF. O problema é nosso, não do seu arquivo — tente novamente em instantes.",
    "not-a-resume":
      "Este arquivo não parece ser um currículo. Envie o documento com a sua experiência profissional, em DOCX ou PDF.",
    "rewrite-detected":
      "Não foi possível organizar o currículo sem alterar o texto dele. Tente novamente.",
    "payment-required": "É preciso confirmar o pagamento antes de importar o currículo.",
  },
  step1: {
    kicker: "PASSO 01 DE 04",
    title: "Importar",
    subtitle: "Envie o currículo que você já tem. DOCX ou PDF, até 10 MB.",
    drop: "Arraste o arquivo aqui",
    or: "ou",
    choose: "Selecionar arquivo",
    imported: "Currículo importado",
    tryAgain: "Enviar outro arquivo",
    removeFile: "Remover arquivo",
  },
  payment: {
    title: "Envio bloqueado",
    body: "Cobramos um valor simbólico de R$ 2,00 para cobrir o custo de gerar o seu currículo.",
    cta: "Liberar o envio",
    redirecting: "Redirecionando para o pagamento…",
    canceled: "Pagamento cancelado. Você pode tentar de novo quando quiser.",
    error: "Não foi possível confirmar o pagamento. Tente novamente.",
    checkoutFailed: "Não foi possível iniciar o pagamento. Tente novamente.",
  },
  step4: {
    kicker: "PASSO 04 DE 04",
    title: "Exportar",
    subtitle:
      "Escolha os idiomas e os formatos. Um clique baixa tudo o que estiver marcado.",
    languages: "Idiomas",
    formats: "Formatos",
    pt: "Português (BR)",
    en: "English",
    pdf: "PDF (texto selecionável)",
    docx: "DOCX (estilos nativos)",
    downloadOne: "Baixar 1 arquivo",
    downloadMany: "Baixar {n} arquivos",
    downloadNone: "Selecione idioma e formato",
    zipNote: "Com mais de um arquivo, o download vem em .zip.",
    guaranteesTitle: "O que o arquivo garante",
    guarantees:
      "Coluna única · sem tabela · datas no formato do idioma · PDF com texto selecionável · uma fonte · nome de arquivo padronizado",
    partialFailure:
      "Não foi possível gerar todas as saídas. O que deu certo foi baixado.",
  },
  progress: {
    importStage1: "Extrair texto",
    importStage2: "Separar cabeçalho, experiências e formação",
    importStage3: "Normalizar datas e cargos",
    importStage4: "Marcar bullets sem métrica",
    analysisTitle: "Revisando seu currículo",
    analysisDetail:
      "Comparando a versão importada com o que você atualizou, para montar o conjunto de sugestões.",
    analysisStage1: "Ler versão importada",
    analysisStage2: "Incorporar atualizações",
    analysisStage3: "Procurar resultados sem número",
    analysisStage4: "Checar datas sobrepostas e formatos",
    analysisStage5: "Aplicar regras de leitura automática",
    exportGenerating: "Gerando arquivos",
    exportCounter: "{current} de {total}",
    retry: "Tentar de novo",
  },
  exportComplete: {
    title: "Currículo exportado",
    thanksOne: "Prontinho — 1 arquivo foi baixado.",
    thanksMany: "Prontinho — {n} arquivos foram baixados.",
    filesTitle: "Arquivos desta exportação",
    beforeSendTitle: "Antes de mandar",
    beforeSend1: "Confira o nome do arquivo antes de anexar.",
    beforeSend2: "Mande PDF quando a vaga não pedir um formato específico.",
    beforeSend3: "Guarde o DOCX: é ele que você edita na próxima atualização.",
    downloadAgain: "Baixar de novo",
    startOver: "Começar um novo currículo",
  },
  home: {
    headline: "Melhore seu currículo em poucos minutos.",
    /**
     * Os trechos entre asteriscos são as expressões que a home destaca em roxo. O
     * marcador vive no texto — e não numa lista de palavras ao lado — porque o que se
     * destaca muda com o idioma: a tradução move a expressão de lugar, e um índice ou
     * uma busca por palavra ficaria apontando para o trecho errado.
     */
    lead: "Suba o .docx antigo, responda o que mudou desde a última versão, e receba de volta um currículo reescrito com *métricas*, revisado contra inconsistências de data e *pronto para ATS*, em *português e em inglês*, exportável para *DOCX e PDF*.",
    cta: "Começar agora",
    tagLangs: "PT-BR ⇄ EN",
    tagFormats: "DOCX · PDF",
    tagAts: "ATS-first",
    batchNote:
      "Baixe as quatro versões de uma vez — dois idiomas, dois formatos — se preferir.",
    flowLabel: "O fluxo",
    step1Title: "Importa",
    step1Body:
      "Upload de DOCX ou PDF. A IA distribui cabeçalho, experiências, formação e habilidades no modelo, sem reescrever o seu texto.",
    step2Title: "Atualiza",
    step2Body:
      "Só o delta: nova formação, nova experiência, promoções e entregas recentes. Nada de reescrever o que já existe.",
    step3Title: "Revisa",
    step3Body:
      "Sugestões de métrica, datas sobrepostas e regras de ATS, ancoradas ao trecho. Você marca as que quer — nada é aplicado antes disso.",
    step4Title: "Exporta",
    step4Body:
      "Mesmo conteúdo em dois idiomas, dois formatos, num modelo de coluna única que qualquer leitor automático entende.",
  },
} as const;

/** O inglês precisa ter exatamente as mesmas chaves — em grupo ou soltas. */
type Dictionary = {
  readonly [K in keyof typeof pt]: (typeof pt)[K] extends string
    ? string
    : { readonly [P in keyof (typeof pt)[K]]: string };
};

const en: Dictionary = {
  step2: {
    kicker: "STEP 02 OF 04",
    title: "Update",
    subtitle:
      "Write freely, with numbers when you have them. What is already in the file stays there.",
    blocked: "Fix the flagged fields before continuing.",
  },
  sections: {
    education: "Education and certifications",
    experience: "Experience and promotions",
    skills: "New skills",
  },
  add: {
    education: "Add education",
    experience: "Add experience",
    skill: "Add skill",
  },
  empty: {
    education: "No new education.",
    educationHint:
      "The ones from the imported file stay in the resume. Add only what came after the last version.",
    experience: "No new experience since the last version.",
    experienceHint:
      "Changed companies, got promoted or took on a bigger scope? Record it here.",
    skills: "No new skills.",
    skillsHint: "Tools, languages or certifications you started using day to day.",
  },
  count: {
    one: "item",
    many: "items",
  },
  fields: {
    course: "Course",
    school: "Institution",
    start: "Start",
    finish: "End",
    company: "Company",
    role: "Title",
    end: "End",
    delivered: "What did you deliver? (numbers help)",
    skill: "Skill",
    ongoing: "Ongoing",
    month: "Month",
  },
  modal: {
    newEducation: "New education",
    newExperience: "New experience",
    newSkill: "New skill",
    cancel: "Cancel",
    confirm: "Add",
    close: "Close",
  },
  actions: {
    remove: "Remove",
  },
  dates: {
    format: "mm/yyyy",
    invalidMonth: "Month must be between 01 and 12.",
    missingMonth: "Enter month and year, as mm/yyyy.",
    invalidFormat: "Invalid date format.",
    endBeforeStart: "The end cannot be earlier than the start.",
  },
  dateNotice: {
    title: "The dates were organized",
    body: "We set the periods to mm/yyyy, the format recruiting systems read. Where the file had only the year, we picked the month. They do not need to be the exact real dates — check that they make sense before exporting.",
  },
  step3: {
    kicker: "STEP 03 OF 04",
    title: "Review",
    subtitle:
      "Check what you want in the final resume. Nothing changes in your resume while you decide.",
  },
  review: {
    panelTitle: "Suggestions",
    panelNote: "Proposed text shows up only here on the card, never in the resume.",
    pendingOne: "open suggestion",
    pendingMany: "open suggestions",
    selectAll: "Accept all",
    select: "Accept suggestion",
    selected: "Suggestion accepted",
    dismiss: "Dismiss",
    details: "See details",
    suggestion: "suggestion",
    current: "As it is:",
    proposed: "Proposed:",
    empty: "No suggestions for this resume.",
    emptyFilter: "No suggestions of this type.",
    unsupported: "Confirm the numbers in this proposal: they were not in your material.",
  },
  filters: {
    all: "All",
    metric: "Metric",
    verb: "Metric",
    dates: "Dates",
    ats: "ATS",
  },
  score: {
    label: "ATS score",
    short: "ATS",
    outOf: "/ 100",
    done: "All suggestions handled",
  },
  shell: {
    brand: "Live Resumé",
    stepsTitle: "Steps · 4 of them",
    back: "Back",
    backHomeLabel: "Back to home",
    next: "Next",
    step1: "Import",
    step2: "Update",
    step3: "Review",
    step4: "Export",
  },
  wait: {
    reload: "Do not reload the page.",
    partialSuggestions:
      "Part of the suggestions could not be fetched right now. The ones shown are complete; leaving this step and coming back tries again.",
  },
  failure: {
    quota: "The free usage limit is over. Please try again later.",
    quotaSuggestions:
      "The free usage limit is over, so the AI suggestions did not arrive. The date ones are here: they are computed locally. Please try again later.",
    importFailed: "The resume could not be imported. Please try again.",
    analysisFailed: "The resume could not be analyzed. Please try again.",
    exportFailed: "The files could not be generated. Please try again.",
  },
  importErrors: {
    "unsupported-format": "Unsupported format. Please upload your resume as DOCX or PDF.",
    "corrupted-file": "The file could not be read — its contents appear to be corrupted.",
    "pdf-without-text-layer":
      "This PDF has no selectable text: it looks like a scan. Upload the PDF your word processor generated, or the DOCX.",
    "file-too-large": "File too large. The limit is {limit} MB.",
    "pdf-reader-unavailable":
      "The PDF reader could not start. This one is on us, not on your file — please try again in a moment.",
    "not-a-resume":
      "This file does not look like a resume. Please upload the document with your professional experience, as DOCX or PDF.",
    "rewrite-detected":
      "We couldn't organize the resume without altering its text. Please try again.",
    "payment-required": "Payment is required before importing the resume.",
  },
  step1: {
    kicker: "STEP 01 OF 04",
    title: "Import",
    subtitle: "Send the resume you already have. DOCX or PDF, up to 10 MB.",
    drop: "Drag the file here",
    or: "or",
    choose: "Choose file",
    imported: "Resume imported",
    tryAgain: "Send another file",
    removeFile: "Remove file",
  },
  payment: {
    title: "Upload locked",
    body: "We charge a symbolic US$ 0.40 fee to cover the cost of generating your resume.",
    cta: "Unlock upload",
    redirecting: "Redirecting to payment…",
    canceled: "Payment canceled. You can try again whenever you like.",
    error: "The payment could not be confirmed. Please try again.",
    checkoutFailed: "The payment could not be started. Please try again.",
  },
  step4: {
    kicker: "STEP 04 OF 04",
    title: "Export",
    subtitle: "Pick languages and formats. One click downloads everything you checked.",
    languages: "Languages",
    formats: "Formats",
    pt: "Portuguese (BR)",
    en: "English",
    pdf: "PDF (selectable text)",
    docx: "DOCX (native styles)",
    downloadOne: "Download 1 file",
    downloadMany: "Download {n} files",
    downloadNone: "Pick a language and a format",
    zipNote: "With more than one file, the download comes as a .zip.",
    guaranteesTitle: "What the file guarantees",
    guarantees:
      "Single column · no tables · dates in the language format · PDF with selectable text · one font · standardized file name",
    partialFailure: "Some outputs could not be generated. What worked was downloaded.",
  },
  progress: {
    importStage1: "Extract text",
    importStage2: "Split header, experience and education",
    importStage3: "Normalize dates and titles",
    importStage4: "Flag bullets without a metric",
    analysisTitle: "Reviewing your resume",
    analysisDetail:
      "Comparing the imported version with what you updated, to build the suggestion set.",
    analysisStage1: "Read imported version",
    analysisStage2: "Merge in updates",
    analysisStage3: "Look for results without a number",
    analysisStage4: "Check overlapping dates and formats",
    analysisStage5: "Apply automated-reader rules",
    exportGenerating: "Generating files",
    exportCounter: "{current} of {total}",
    retry: "Try again",
  },
  exportComplete: {
    title: "Resume exported",
    thanksOne: "Done — 1 file was downloaded.",
    thanksMany: "Done — {n} files were downloaded.",
    filesTitle: "Files in this export",
    beforeSendTitle: "Before you send it",
    beforeSend1: "Check the file name before attaching it.",
    beforeSend2: "Send the PDF when the job posting doesn't ask for a specific format.",
    beforeSend3: "Keep the DOCX: it's what you'll edit on the next update.",
    downloadAgain: "Download again",
    startOver: "Start a new resume",
  },
  home: {
    headline: "Improve your resume in just a few minutes.",
    lead: "Upload the old .docx, tell us what changed since the last version, and get back a resume rewritten with *metrics*, checked against date inconsistencies and *ready for ATS*, in *Portuguese and English*, exportable to *DOCX and PDF*.",
    cta: "Start now",
    tagLangs: "PT-BR ⇄ EN",
    tagFormats: "DOCX · PDF",
    tagAts: "ATS-first",
    batchNote:
      "Download all four versions at once — two languages, two formats — if you prefer.",
    flowLabel: "The flow",
    step1Title: "Import",
    step1Body:
      "Upload a DOCX or PDF. The AI distributes header, experience, education and skills into the model, without rewriting your text.",
    step2Title: "Update",
    step2Body:
      "Only the delta: new education, new experience, promotions and recent deliveries. No rewriting what is already there.",
    step3Title: "Review",
    step3Body:
      "Metric, overlapping date and ATS suggestions, anchored to the passage. You check the ones you want — nothing is applied before that.",
    step4Title: "Export",
    step4Body:
      "Same content in two languages, two formats, in a single-column template any automated reader understands.",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { pt, en };

export type Translations = Dictionary;

/** Rótulo do fim em aberto, que o modelo pede como parâmetro para formatar período. */
export const openEndLabel: Record<Locale, string> = {
  pt: "atual",
  en: "Present",
};
