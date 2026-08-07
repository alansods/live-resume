import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // A maior parte do código é biblioteca pura de servidor, e o pdfjs se confunde
    // quando detecta um DOM. Testes de componente pedem jsdom no próprio arquivo,
    // com a diretiva `@vitest-environment jsdom`.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{lib,components,app}/**/*.test.{ts,tsx}"],
  },
});
