import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `pdfjs-dist` carrega o próprio worker por caminho de módulo em tempo de execução.
   * Empacotá-lo reescreve esse caminho, o worker some, e a extração passa a recusar
   * TODO PDF como arquivo corrompido — inclusive os válidos. Não é preferência de
   * build: é a condição para a importação de PDF existir fora dos testes.
   */
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
