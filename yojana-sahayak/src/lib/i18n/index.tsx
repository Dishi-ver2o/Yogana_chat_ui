import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Language } from "../api/types";
import { en, type Key } from "./en";
import { hi } from "./hi";

const dict: Record<Language, Record<Key, string>> = { en, hi };

export type T = (key: Key, vars?: Record<string, string | number>) => string;

export function makeT(lang: Language): T {
  return (key, vars) => {
    let s = dict[lang][key] ?? en[key];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

const Ctx = createContext<{ lang: Language; t: T }>({ lang: "en", t: makeT("en") });

export function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
export type { Key };
