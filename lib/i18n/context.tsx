"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  dictionaries,
  locales,
  openEndLabel,
  type Locale,
  type Translations,
} from "./dictionary";

/**
 * Idioma da interface.
 *
 * O toggle da top bar troca **só o texto do app**. O que o usuário digitou e o
 * conteúdo do currículo ficam como estão — traduzir currículo é da exportação.
 *
 * A escolha sobrevive ao recarregar e à troca de página: é uma preferência de leitura,
 * e reescolher o idioma a cada navegação era refazer a mesma decisão. Só isso é guardado
 * — o currículo continua sendo processado e descartado, nada dele vai para o navegador.
 */

const CHAVE = "curriculo-vivo:locale";

/**
 * Onde a escolha fica quando o navegador proíbe armazenar (janela privada, política de
 * cookies). Não é cache do que está guardado: só existe quando guardar falhou, e some
 * assim que guardar volta a funcionar. Sem ele, o toggle ficaria inerte nesses
 * navegadores — a escolha não teria onde morar nem pelo tempo da aba.
 */
let naSessao: Locale | null = null;

/** O que está guardado só vale se ainda for um idioma que existe. */
function idiomaGuardado(): Locale | null {
  try {
    const guardado = window.localStorage.getItem(CHAVE);
    return locales.find((idioma) => idioma === guardado) ?? null;
  } catch {
    return naSessao;
  }
}

function guardarIdioma(locale: Locale): void {
  try {
    window.localStorage.setItem(CHAVE, locale);
    naSessao = null;
  } catch {
    naSessao = locale;
  }
}

/**
 * O idioma escolhido é estado **de fora do React** — ele vive no navegador e sobrevive à
 * árvore. Por isso `useSyncExternalStore` e não um `useState` corrigido por efeito: o
 * servidor não tem `localStorage`, e é o snapshot do servidor que faz a hidratação bater
 * antes de o valor guardado entrar.
 *
 * Nada é memorizado aqui dentro: a leitura vai ao `localStorage` toda vez e devolve uma
 * string, que o React compara por valor. Sem cache, o que está guardado é a única
 * verdade — inclusive quando outra aba muda o idioma.
 */
const ouvintes = new Set<() => void>();

function inscrever(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener("storage", ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", ouvinte);
  };
}

function avisar(): void {
  for (const ouvinte of ouvintes) ouvinte();
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  /** Rótulo de período em aberto, no idioma da interface. */
  openEnd: string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "pt",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  // No servidor, e no primeiro render do cliente, não há preferência: vale o padrão.
  const guardado = useSyncExternalStore(inscrever, idiomaGuardado, () => null);
  const locale = guardado ?? initialLocale;

  const setLocale = useCallback((novo: Locale) => {
    guardarIdioma(novo);
    avisar();
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      openEnd: openEndLabel[locale],
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value === null) {
    throw new Error("useLocale precisa estar dentro de <LocaleProvider>.");
  }
  return value;
}

/** Atalho para quem só quer os textos. */
export function useT(): Translations {
  return useLocale().t;
}
