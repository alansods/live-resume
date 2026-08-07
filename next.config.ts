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
};

export default nextConfig;
