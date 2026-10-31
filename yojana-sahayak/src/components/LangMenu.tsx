import { useEffect, useRef, useState } from "react";
import type { Language } from "../lib/api/types";
import { useI18n } from "../lib/i18n";
import { ChevronDown } from "./icons";

export function LangMenu({ lang, onChange, onClear }: { lang: Language; onChange: (l: Language) => void; onClear: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="lang" ref={root}>
      <button type="button" className="lang-btn" aria-haspopup="menu" aria-expanded={open} aria-label={t("lang.label")} onClick={() => setOpen((o) => !o)}>
        <span>{lang === "en" ? t("lang.english") : t("lang.hindi")}</span>
        <ChevronDown width={16} height={16} />
      </button>
      {open && (
        <div className="lang-menu" role="menu">
          {(["en", "hi"] as const).map((l) => (
            <button key={l} role="menuitemradio" aria-checked={lang === l} className={lang === l ? "on" : ""} onClick={() => { onChange(l); setOpen(false); }}>
              {l === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
          <hr />
          <button role="menuitem" onClick={() => { setOpen(false); onClear(); }}>{t("menu.clear")}</button>
        </div>
      )}
    </div>
  );
}
