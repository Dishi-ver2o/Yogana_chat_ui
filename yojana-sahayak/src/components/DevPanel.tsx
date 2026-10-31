import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";

/** Dev-only: toggles mock failure modes so error/offline states can be exercised. Never rendered in production or live mode. */
export default function DevPanel() {
  const { t } = useI18n();
  const [, force] = useState(0);
  const [ctl, setCtl] = useState<typeof import("../lib/api/adapters/mock/chat-stream")["mockControls"] | null>(null);
  useEffect(() => {
    void import("../lib/api/adapters/mock/chat-stream").then((m) => setCtl(m.mockControls));
  }, []);
  if (!ctl) return null;
  const row = (k: keyof typeof ctl, label: string) => (
    <label>
      <input type="checkbox" checked={ctl[k]} onChange={(e) => { ctl[k] = e.target.checked; force((n) => n + 1); }} /> {label}
    </label>
  );
  return (
    <div className="devpanel" aria-label="Mock controls (dev only)">
      <strong>MOCK</strong>
      {row("failNext", t("dev.fail"))}
      {row("slow", t("dev.slow"))}
      {row("offline", t("dev.offline"))}
    </div>
  );
}
