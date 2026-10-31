import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "../../components/icons";
import type { Citation, Language } from "../../lib/api/types";
import { savedSchemes } from "../../lib/db/store";
import { useI18n } from "../../lib/i18n";
import { useOnline } from "../../lib/hooks";
import { Composer } from "./Composer";
import { EvidencePanel } from "./EvidencePanel";
import { MessageView } from "./MessageView";
import { useSpeaker } from "./useSpeaker";
import { useChat } from "./useChat";

export interface ChatCardHandle {
  clear: () => void;
}

interface Props {
  lang: Language;
  onNavigate: (route: string) => void;
  onToast: (m: string) => void;
  /** Lets the page header's menu clear the conversation. */
  registerClear: (fn: () => void) => void;
}

/**
 * The chat card from the design. Self-contained: all data goes through `api.*`
 * (via useChat), so this component can be mounted inside the real website.
 */
export function ChatCard({ lang, onNavigate, onToast, registerClear }: Props) {
  const { t } = useI18n();
  const locale = lang === "hi" ? "hi-IN" : "en-US";
  const online = useOnline();
  const { messages, ready, busy, send, stop, retry, clear } = useChat(lang);
  const speaker = useSpeaker();
  const [panel, setPanel] = useState<{ all: Citation[]; activeId: string } | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const stopSpeaking = speaker.stop;
  useEffect(() => registerClear(() => { stopSpeaking(); void clear(); }), [clear, registerClear, stopSpeaking]);

  const refreshSaved = useCallback(() => void savedSchemes.list().then((l) => setSaved(new Set(l))), []);
  useEffect(refreshSaved, [refreshSaved]);

  // Stick to bottom while content grows, unless the user scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stick.current = near;
    setAtBottom(near);
  };
  const jump = () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const attachNote = () => onToast(t("composer.attachNote"));

  return (
    <>
      <section className="card" aria-label={t("brand.name")}>
        <header className="card-head">
          <img className="avatar-lg" src="/assets/avatar-header.png" alt="" width={34} height={34} />
          <div className="card-id">
            <h2>{t("brand.name")}</h2>
            <p className="status"><span className="dot" aria-hidden="true" />{online ? t("card.status") : t("offline.banner")}</p>
          </div>
        </header>

        <img className="hero" src="/assets/hero.png" alt="" />

        <div className="scroll-wrap">
          <div className="messages" ref={scroller} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions">
            <div className="greetings">
              <p className="bubble bubble-greet">{t("greet.1")}</p>
              <p className="bubble bubble-greet">{t("greet.2")}</p>
              <p className="bubble bubble-greet">{t("greet.3")}</p>
            </div>
            {(messages.length > 0 || !ready) && (
              <div className="divider" role="separator"><span>{t("divider")}</span></div>
            )}
            <div className="thread">
              {messages.map((m) => (
                <MessageView
                  key={m.id}
                  msg={m}
                  locale={locale}
                  saved={saved}
                  onSavedChange={refreshSaved}
                  onOpenCitation={(all, c) => setPanel({ all, activeId: c.chunkId })}
                  onRetry={retry}
                  onNavigate={onNavigate}
                  onToast={onToast}
                  speaking={speaker.speakingId === m.id}
                  onSpeak={speaker.speak}
                  onStopSpeak={speaker.stop}
                />
              ))}
            </div>
          </div>
          {!atBottom && (
            <button type="button" className="jump" onClick={jump}>
              <ArrowDown width={14} height={14} /> {t("jump")}
            </button>
          )}
        </div>

        <Composer busy={busy} online={online} onSend={send} onStop={stop} onAttachNote={attachNote} speechStatus={speaker.status} onMicStart={speaker.stop} />
      </section>

      {panel && (
        <EvidencePanel
          citations={panel.all}
          activeId={panel.activeId}
          onSelect={(c) => setPanel({ ...panel, activeId: c.chunkId })}
          onClose={() => setPanel(null)}
        />
      )}
    </>
  );
}
