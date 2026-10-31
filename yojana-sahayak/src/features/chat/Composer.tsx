import { useCallback, useEffect, useRef, useState } from "react";
import { Locate, Mic, Paperclip, SendPlane, StopSquare } from "../../components/icons";
import { useI18n } from "../../lib/i18n";
import { MAX_CHARS } from "./useChat";

interface Props {
  busy: boolean;
  online: boolean;
  onSend: (text: string) => boolean;
  onStop: () => void;
  onAttachNote: () => void;
  /** Status line coming from the "Listen" feature (e.g. "Playing message aloud."). */
  speechStatus: string | null;
  /** Called when the mic starts so any message being read aloud is stopped. */
  onMicStart: () => void;
}

// SpeechRecognition isn't in TypeScript's DOM lib, hence `any`.
const getRecognition = (): any => {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/**
 * Voice input. The transcript goes into the text box — editable — and is NEVER
 * sent automatically; the user presses Send.
 * Note: in Chrome the browser sends the audio to Google's speech service, so it
 * needs internet and is not "on-device". See docs/FRONTEND_INTEGRATION.md.
 */
function useDictation(opts: { lang: "hi" | "en"; online: boolean; getText: () => string; setText: (s: string) => void; onStart: () => void }) {
  const { t } = useI18n();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const stop = useCallback(() => rec.current?.stop(), []);
  const abort = useCallback(() => rec.current?.abort(), []);

  const start = useCallback(() => {
    const o = optsRef.current;
    const SR = getRecognition();
    if (!SR) return setMessage(t("mic.unsupported"));
    if (!o.online) return setMessage(t("mic.offline"));
    o.onStart();

    let r: any;
    try {
      r = new SR();
    } catch {
      setMessage(t("mic.error"));
      return;
    }
    r.lang = o.lang === "hi" ? "hi-IN" : "en-IN";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    const base = o.getText().replace(/\s*$/, "");
    const prefix = base ? base + " " : "";
    let failed = false;
    let receivedTranscript = false;

    r.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (text.trim()) {
        receivedTranscript = true;
        optsRef.current.setText((prefix + text).slice(0, MAX_CHARS));
      }
    };
    r.onerror = (e: any) => {
      if (e.error === "aborted") {
        failed = true;
        return;
      }
      failed = true;
      setMessage(
        e.error === "not-allowed" || e.error === "service-not-allowed" ? t("mic.blocked")
          : e.error === "no-speech" ? t("mic.noSpeech")
          : e.error === "audio-capture" ? t("mic.noMicrophone")
          : e.error === "network" ? t("mic.network")
          : t("mic.error"),
      );
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
      if (!failed) setMessage(receivedTranscript ? null : t("mic.noSpeech"));
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
      setMessage(t("mic.listening"));
    } catch {
      setMessage(t("mic.error"));
    }
  }, [t]);

  useEffect(() => () => rec.current?.abort(), []);
  // Going offline mid-dictation ends it.
  useEffect(() => { if (!opts.online) rec.current?.abort(); }, [opts.online]);

  return { listening, message, start, stop, abort, supported: !!getRecognition() };
}

export function Composer({ busy, online, onSend, onStop, onAttachNote, speechStatus, onMicStart }: Props) {
  const { t, lang } = useI18n();
  const [value, setValue] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const dictation = useDictation({ lang, online, getText: () => valueRef.current, setText: setValue, onStart: onMicStart });

  // auto-grow up to ~6 lines
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 144) + "px";
  }, [value]);

  const submit = () => {
    if (busy) return onStop();
    if (!online) return;
    if (!value.trim()) return ta.current?.focus();
    dictation.abort();
    if (onSend(value)) setValue("");
  };

  const showCounter = value.length >= MAX_CHARS * 0.8;
  const statusLine = dictation.message ?? speechStatus;

  return (
    <div className="composer">
      <form className={"composer-box" + (!online ? " is-offline" : "")} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <button type="button" className="clip" aria-label={t("composer.attach")} onClick={onAttachNote}>
          <Paperclip width={22} height={22} />
        </button>
        <textarea
          ref={ta}
          rows={1}
          value={value}
          maxLength={MAX_CHARS}
          disabled={!online}
          placeholder={online ? t("composer.placeholder") : t("composer.offline")}
          aria-label={t("composer.placeholder")}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter newline; never send mid-IME-composition (Hindi/other IMEs).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {showCounter && <span className="counter" aria-live="polite">{t("composer.counter", { n: value.length, max: MAX_CHARS })}</span>}
        <button
          type="button"
          className={"mic" + (dictation.listening ? " on" : "")}
          aria-pressed={dictation.listening}
          // aria-disabled (not disabled) so the reason can still be shown when pressed
          aria-disabled={!dictation.supported || !online}
          aria-label={dictation.listening ? t("mic.stop") : t("mic.start")}
          title={!dictation.supported ? t("mic.unsupported") : dictation.listening ? t("mic.stop") : t("mic.start")}
          onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
        >
          <Mic width={20} height={20} />
        </button>
        <button type="submit" className="send" disabled={!online && !busy} aria-label={busy ? t("composer.stop") : t("composer.send")}>
          {busy ? <StopSquare width={20} height={20} /> : <SendPlane width={21} height={21} />}
        </button>
      </form>
      {statusLine && <p className="voice-status" role="status" aria-live="polite">{statusLine}</p>}
      <p className="composer-note">
        <Locate width={14} height={14} />
        <span>{t("composer.note")}</span>
      </p>
    </div>
  );
}
