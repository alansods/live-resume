import { afterEach } from "vitest";

/**
 * O idioma da interface é guardado no `localStorage`, e o jsdom é um só para o arquivo
 * de teste inteiro: sem isto, um teste que troca para EN decidiria o idioma dos testes
 * seguintes. Cada teste começa sem preferência guardada.
 */
afterEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});
