import { useEffect, useRef } from "react";
import { Alert, Check, External, X } from "../../components/icons";
import type { Citation } from "../../lib/api/types";
import { useI18n } from "../../lib/i18n";

interface Props {
  citations: Citation[];
  activeId: string;
  onSelect: (c: Citation) => void;
  onClose: () => void;
}

/** Source panel: right drawer on desktop, bottom sheet on mobile (CSS). */
export function EvidencePanel({ citations, activeId, onSelect, onClose }: Props) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const c = citations.find((x) => x.chunkId === activeId) ?? citations[0];

  useEffect(() => {
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!c) return null;
  const statusLabel = c.status === "verified" ? t("cite.verified") : c.status === "pending_review" ? t("cite.pending") : t("cite.outdated");

  return (
    <>
      <div className="panel-scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-modal="false" aria-label={t("panel.title")}>
        <header className="panel-head">
          <h2>{t("panel.title")}</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label={t("panel.close")} onClick={onClose}><X width={20} height={20} /></button>
        </header>
        {citations.length > 1 && (
          <div className="panel-tabs" role="tablist">
            {citations.map((x) => (
              <button key={x.chunkId} role="tab" aria-selected={x.chunkId === c.chunkId} className={x.chunkId === c.chunkId ? "on" : ""} onClick={() => onSelect(x)}>
                [{x.marker}]
              </button>
            ))}
          </div>
        )}
        <div className="panel-body">
          <span className="sample-badge">{t("sample.badge")}</span>
          <div className={`status-banner status-${c.status}`}>
            {c.status === "verified" ? <Check width={15} height={15} /> : <Alert width={15} height={15} />}
            <span>{statusLabel}</span>
          </div>
          <dl>
            <dt>{t("panel.document")}</dt><dd>{c.title}</dd>
            <dt>{t("panel.authority")}</dt><dd>{c.authority}</dd>
            <dt>{t("panel.page", { n: c.page })}</dt><dd>{t("panel.version")}: {c.documentVersionId}</dd>
          </dl>
          <h3>{t("panel.passage")}</h3>
          <blockquote>{c.passage}</blockquote>
          <p className="muted">{t("panel.noPdf")}</p>
          <a className="panel-link" href={c.officialUrl} target="_blank" rel="noopener noreferrer">
            {t("panel.official")} <External width={14} height={14} />
          </a>
        </div>
      </aside>
    </>
  );
}
