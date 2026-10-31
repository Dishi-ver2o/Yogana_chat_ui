import { memo, useState } from "react";
import { Bookmark, Check, Copy, Flag, Volume } from "../../components/icons";
import type { Citation, SchemeSummary } from "../../lib/api/types";
import { parseMarkers, type Msg } from "../../lib/chat/reducer";
import { saveReport, savedSchemes } from "../../lib/db/store";
import { useI18n, type Key } from "../../lib/i18n";
import { CitationChip } from "./CitationChip";
import { EvidenceBadge } from "./EvidenceBadge";

interface Props {
  msg: Msg;
  locale: string;
  saved: Set<string>;
  onSavedChange: () => void;
  onOpenCitation: (all: Citation[], c: Citation) => void;
  onRetry: (id: string) => void;
  onNavigate: (route: string) => void;
  onToast: (m: string) => void;
  /** "Listen" feature */
  speaking: boolean;
  onSpeak: (id: string, text: string) => void;
  onStopSpeak: () => void;
}

const fmtTime = (ms: number, locale: string) => new Date(ms).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

function BotAvatar() {
  return <img className="avatar" src="/assets/avatar-msg.png" alt="" width={34} height={34} />;
}

function MessageViewBase(p: Props) {
  const { msg } = p;
  const { t, lang } = useI18n();
  const time = fmtTime(msg.time, p.locale);
  const text = msg.i18nKey ? t(msg.i18nKey as Key) : msg.text;

  if (msg.role === "user") {
    return (
      <div className="row row-user">
        <div className="bubble bubble-user">{text}</div>
        <time className="time time-user">{time}</time>
      </div>
    );
  }

  return (
    <div className="row row-bot">
      <BotAvatar />
      <div className="bot-col">
        {msg.state === "error" ? <ErrorCard {...p} /> : msg.refusal && msg.state === "final" ? <RefusalCard {...p} /> : (
          <>
            <div className={"bubble bubble-bot" + (msg.state === "streaming" ? " provisional" : "")} aria-busy={msg.state === "streaming"}>
              {msg.state === "streaming" && !msg.text ? (
                <span className="status-text">{msg.phase ? t(`status.${msg.phase}` as Key) : "…"}</span>
              ) : (
                <span key={msg.state} className="swap">
                  <RichText text={text} citations={msg.citations} onOpen={(c) => p.onOpenCitation(msg.citations ?? [], c)} />
                </span>
              )}
            </div>
            {msg.state === "streaming" && msg.text && msg.phase && <span className="verifying">{t(`status.${msg.phase}` as Key)}</span>}
          </>
        )}
        {msg.state === "final" && !msg.refusal && (
          <div className="meta-row">
            <time className="time">{time}</time>
            <button
              type="button"
              className={"listen" + (p.speaking ? " on" : "")}
              aria-pressed={p.speaking}
              onClick={() => (p.speaking ? p.onStopSpeak() : p.onSpeak(msg.id, text))}
            >
              <Volume width={16} height={16} />
              {p.speaking ? t("voice.stop") : t("voice.listen")}
            </button>
          </div>
        )}

        {msg.state === "final" && !msg.i18nKey && (
          <div className="extras">
            {msg.sample && <span className="sample-badge">{t("sample.badge")}</span>}
            {msg.evidence && <EvidenceBadge evidence={msg.evidence} />}
            {!msg.refusal && msg.citations && msg.citations.length > 0 && (
              <div className="cite-row">
                {msg.citations.map((c) => <CitationChip key={c.chunkId} citation={c} onOpen={(x) => p.onOpenCitation(msg.citations!, x)} />)}
              </div>
            )}
            {msg.suggestedAction && (
              <div className="action-card">
                <p>{t("action.eligibilityNote")}</p>
                <button type="button" className="btn btn-primary" onClick={() => p.onNavigate(msg.suggestedAction!.route)}>{t("action.eligibility")}</button>
              </div>
            )}
            {msg.schemeSuggestions && msg.schemeSuggestions.length > 0 && (
              <div className="schemes">
                <h4>{t("scheme.suggested")}</h4>
                {msg.schemeSuggestions.map((s) => <SchemeCard key={s.id} s={s} lang={lang} saved={p.saved.has(s.id)} onSavedChange={p.onSavedChange} onNavigate={p.onNavigate} />)}
              </div>
            )}
            {!msg.refusal && <Actions msg={msg} onToast={p.onToast} />}
          </div>
        )}
      </div>
    </div>
  );
}
export const MessageView = memo(MessageViewBase);

function RichText({ text, citations, onOpen }: { text: string; citations?: Citation[]; onOpen: (c: Citation) => void }) {
  const segs = parseMarkers(text);
  return (
    <>
      {segs.map((s, i) => {
        if (s.kind === "text") return <span key={i}>{s.text}</span>;
        const c = citations?.find((x) => x.marker === s.marker);
        // Unknown marker (no matching citation) is shown as plain text, never as a fake source.
        return c ? <CitationChip key={i} citation={c} onOpen={onOpen} inline /> : <span key={i}>[{s.marker}]</span>;
      })}
    </>
  );
}

function RefusalCard({ msg, onNavigate }: Props) {
  const { t } = useI18n();
  return (
    <div className="refusal" role="note">
      <strong>{t("refusal.title")}</strong>
      <p>{t("refusal.body")}</p>
      {msg.evidence && msg.evidence.reasons.length > 0 && <ul>{msg.evidence.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      <button type="button" className="btn btn-quiet" onClick={() => onNavigate("/schemes")}>{t("refusal.browse")}</button>
    </div>
  );
}

const KNOWN_ERRORS = new Set(["NETWORK", "UPSTREAM_UNAVAILABLE", "STREAM_INTERRUPTED", "RATE_LIMITED", "TIMEOUT"]);

function ErrorCard({ msg, onRetry }: Props) {
  const { t } = useI18n();
  const e = msg.error!;
  const friendly = KNOWN_ERRORS.has(e.code) ? t(`error.${e.code}` as Key) : t("error.generic");
  return (
    <div className="error-card" role="alert">
      <strong>{t("error.title")}</strong>
      <p>{friendly}</p>
      <div className="error-actions">
        <button type="button" className="btn btn-primary" onClick={() => onRetry(msg.id)}>{t("error.retry")}</button>
        {e.requestId && (
          <details>
            <summary>{t("error.details")}</summary>
            <code>{t("error.requestId")}: {e.requestId}</code>
          </details>
        )}
      </div>
    </div>
  );
}

function SchemeCard({ s, lang, saved, onSavedChange, onNavigate }: { s: SchemeSummary; lang: "en" | "hi"; saved: boolean; onSavedChange: () => void; onNavigate: (r: string) => void }) {
  const { t } = useI18n();
  const toggle = async () => {
    // INTEGRATE: saved schemes stay device-local (IndexedDB); no backend call.
    await (saved ? savedSchemes.remove(s.id) : savedSchemes.add(s.id));
    onSavedChange();
  };
  return (
    <div className="scheme-card">
      <div>
        <strong>{lang === "hi" ? s.nameHi : s.nameEn}</strong>
        <span className="muted">{s.category}</span>
      </div>
      <div className="scheme-actions">
        <button type="button" className="btn btn-quiet" onClick={() => onNavigate(`/schemes/${s.id}`)}>{t("scheme.view")}</button>
        <button type="button" className="btn btn-quiet" onClick={() => onNavigate("/app/eligibility")}>{t("scheme.check")}</button>
        <button type="button" className={"btn btn-quiet" + (saved ? " on" : "")} aria-pressed={saved} onClick={toggle}>
          <Bookmark width={14} height={14} fill={saved ? "currentColor" : "none"} />
          {saved ? t("scheme.saved") : t("scheme.save")}
        </button>
      </div>
    </div>
  );
}

function Actions({ msg, onToast }: { msg: Msg; onToast: (m: string) => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      onToast(t("error.generic"));
    }
  };
  const submitReport = async () => {
    await saveReport(msg.id, note.trim());
    setReporting(false);
    setNote("");
    onToast(t("report.saved"));
  };

  return (
    <div className="actions-wrap">
      <div className="actions">
        <button type="button" className="icon-btn" aria-label={copied ? t("msg.copied") : t("msg.copy")} title={copied ? t("msg.copied") : t("msg.copy")} onClick={copy}>
          {copied ? <Check width={16} height={16} /> : <Copy width={16} height={16} />}
        </button>
        <button type="button" className="icon-btn" aria-expanded={reporting} aria-label={t("msg.report")} title={t("msg.report")} onClick={() => setReporting((r) => !r)}>
          <Flag width={16} height={16} />
        </button>
      </div>
      {reporting && (
        <div className="report">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("report.placeholder")} rows={2} maxLength={500} aria-label={t("report.placeholder")} />
          <div className="report-actions">
            {/* INTEGRATE: send to the backend report endpoint once it exists; currently stored on-device only. */}
            <button type="button" className="btn btn-primary" onClick={submitReport}>{t("report.send")}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setReporting(false)}>{t("report.cancel")}</button>
          </div>
        </div>
      )}
      <p className="answer-disclaimer">{t("answer.disclaimer")}</p>
    </div>
  );
}
