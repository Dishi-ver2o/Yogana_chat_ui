import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { LangMenu } from "./components/LangMenu";
import { Toast } from "./components/Toast";
import { ChatCard } from "./features/chat/ChatCard";
import { apiMode } from "./lib/api/client";
import type { Language } from "./lib/api/types";
import { getLanguage, setLanguage } from "./lib/db/store";
import { I18nProvider, makeT } from "./lib/i18n";

// Dev-only. The ternary on the build-time DEV constant lets bundlers drop the import (and the mock code it pulls in) from production builds.
const DevPanel = import.meta.env.DEV ? lazy(() => import("./components/DevPanel")) : null;

export interface AppProps {
  /**
   * INTEGRATE: the host website supplies real routing here
   * (e.g. react-router's navigate). Routes used: /app/eligibility, /schemes, /schemes/:id.
   * Without it the UI shows which route it would open instead of faking a page.
   */
  onNavigate?: (route: string) => void;
}

export default function App({ onNavigate }: AppProps) {
  const [lang, setLang] = useState<Language>(getLanguage);
  const [toast, setToast] = useState<string | null>(null);
  const clearFn = useRef<() => void>(() => {});
  const t = makeT(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${t("brand.name")} — ${t("brand.tagline")}`;
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeLang = (l: Language) => {
    setLang(l);
    setLanguage(l);
  };
  const navigate = useCallback(
    (route: string) => (onNavigate ? onNavigate(route) : setToast(makeT(lang)("toast.navigate", { route }))),
    [onNavigate, lang],
  );
  const registerClear = useCallback((fn: () => void) => { clearFn.current = fn; }, []);

  return (
    <I18nProvider lang={lang}>
      <div className="page">
        <header className="site-header">
          <div className="site-header-in">
            <a className="brand" href="/" aria-label={t("brand.name")}>
              <img src="/assets/logo.png" alt="" width={37} height={37} />
              <span className="brand-text">
                <span className="brand-name">{t("brand.name")}</span>
                <span className="brand-tag">{t("brand.tagline")}</span>
              </span>
            </a>
            <LangMenu lang={lang} onChange={changeLang} onClear={() => clearFn.current()} />
          </div>
        </header>

        <main className="main">
          <h1 className="title">{t("hero.title")}</h1>
          <p className="subtitle">{t("hero.subtitle")}</p>
          <ChatCard lang={lang} onNavigate={navigate} onToast={setToast} registerClear={registerClear} />
          <p className="footer-note">{t("footer.disclaimer")}</p>
        </main>
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
      {DevPanel && apiMode === "mock" && (
        <Suspense fallback={null}><DevPanel /></Suspense>
      )}
    </I18nProvider>
  );
}
