import { useState } from "react";
import { Alert, Check, Info } from "../../components/icons";
import type { Evidence } from "../../lib/api/types";
import { evidenceLabelKey } from "../../lib/chat/reducer";
import { useI18n } from "../../lib/i18n";

/** Plain-language label + reasons. Deliberately no numeric confidence. */
export function EvidenceBadge({ evidence }: { evidence: Evidence }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const Icon = evidence.status === "STRONG" ? Check : evidence.status === "PARTIAL" ? Info : Alert;
  return (
    <div className="evidence">
      <div className="evidence-row">
        <span className={`badge badge-${evidence.status.toLowerCase()}`}>
          <Icon width={13} height={13} />
          {t(evidenceLabelKey[evidence.status] as never)}
        </span>
        {evidence.reasons.length > 0 && (
          <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? t("evidence.hide") : evidence.status === "PARTIAL" ? t("evidence.limitations") : t("evidence.why")}
          </button>
        )}
      </div>
      {open && (
        <ul className="reasons" aria-label={evidence.status === "PARTIAL" ? t("evidence.limitations") : t("evidence.why")}>
          {evidence.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}
