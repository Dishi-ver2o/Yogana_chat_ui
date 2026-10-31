import { Alert } from "../../components/icons";
import type { Citation } from "../../lib/api/types";
import { useI18n } from "../../lib/i18n";

export function CitationChip({ citation, onOpen, inline }: { citation: Citation; onOpen: (c: Citation) => void; inline?: boolean }) {
  const { t } = useI18n();
  const warn = citation.status !== "verified";
  const statusText = citation.status === "verified" ? t("cite.verified") : citation.status === "pending_review" ? t("cite.pending") : t("cite.outdated");
  const tip = `${citation.title} · ${t("panel.page", { n: citation.page })} · ${statusText}`;
  return (
    <button type="button" className={`cite${inline ? " cite-inline" : ""}${warn ? " cite-warn" : ""}`} title={tip} aria-label={`${t("cite.open", { n: citation.marker })}. ${tip}`} onClick={() => onOpen(citation)}>
      {warn && <Alert width={11} height={11} />}
      <span>{inline ? citation.marker : `[${citation.marker}] ${citation.title}`}</span>
    </button>
  );
}
