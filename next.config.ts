import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `pdfjs-dist` carrega o próprio worker por caminho de módulo em tempo de execução.
   * Empacotá-lo reescreve esse caminho, o worker some, e a extração passa a recusar
   * TODO PDF como arquivo corrompido — inclusive os válidos. Não é preferência de
   * build: é a condição para a importação de PDF existir fora dos testes.
   *
   * `@napi-rs/canvas` é de onde o build Node do pdfjs tira o polyfill de `DOMMatrix`
   * (usado em `getViewport()`); sem ele carregável como pacote real (não empacotado),
   * `DOMMatrix` fica indefinido e todo PDF quebra em produção — mascarado nos testes
   * porque o jsdom do Vitest já define `DOMMatrix` global.
   */
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],

  /**
   * O `pdfjs-dist` só chama `require("@napi-rs/canvas")` dentro de um try/catch — o
   * rastreamento estático de arquivos do Vercel (`@vercel/nft`) não segue esse tipo de
   * require condicional, então o pacote (e o binário nativo da plataforma dentro dele)
   * nunca entra no bundle da função serverless mesmo estando instalado e declarado como
   * externo. Isso força a inclusão manualmente.
   */
  outputFileTracingIncludes: {
    // O binário nativo da plataforma (ex.: @napi-rs/canvas-linux-x64-gnu) é um pacote
    // irmão de @napi-rs/canvas, resolvido via optionalDependencies — precisa do glob
    // amplo, não só da pasta do pacote principal.
    "/api/resume-import": ["./node_modules/@napi-rs/**/*"],
  },
};

export default nextConfig;
