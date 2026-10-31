import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";

const HAS_DEVANAGARI = /[ऀ-ॿ]/;

/** Voices load asynchronously in Chrome; wait briefly for them. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { synth.removeEventListener("voiceschanged", done); resolve(synth.getVoices()); };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1200);
  });
}

/**
 * "Listen" feature: reads one message at a time using the browser's speechSynthesis.
 * Language comes from the message text itself (Devanagari → hi-IN, else en-IN),
 * so a Hindi answer is read with a Hindi voice even if the UI is in English.
 * Audio is generated on the device — nothing is sent to our server.
 */
export function useSpeaker() {
  const { t } = useI18n();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    current.current = null;
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    async (id: string, rawText: string) => {
      setError(null);
      if (!supported) return setError(t("voice.unsupportedSpeak"));
      if (current.current === id) return stop(); // toggle
      window.speechSynthesis.cancel();
      const text = rawText.replace(/\[\d+\]/g, "").trim(); // don't read citation markers
      if (!text) return;

      const lang = HAS_DEVANAGARI.test(text) ? "hi-IN" : "en-IN";
      current.current = id;
      setSpeakingId(id);

      const voices = await loadVoices();
      if (current.current !== id) return; // user pressed Stop / another message while voices loaded
      const norm = (l: string) => l.replace("_", "-").toLowerCase();
      const voice = voices.find((v) => norm(v.lang) === norm(lang)) ?? voices.find((v) => norm(v.lang).startsWith(lang.slice(0, 2)));
      if (lang === "hi-IN" && !voice) {
        current.current = null;
        setSpeakingId(null);
        return setError(t("voice.noHindi")); // honest: don't read Hindi with an English voice
      }

      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice?.lang ?? lang;
      if (voice) u.voice = voice;
      u.onend = () => { if (current.current === id) { current.current = null; setSpeakingId(null); } };
      u.onerror = (e) => {
        if (current.current !== id) return;
        current.current = null;
        setSpeakingId(null);
        if (e.error !== "canceled" && e.error !== "interrupted") setError(t("voice.playFail"));
      };
      try {
        window.speechSynthesis.speak(u);
      } catch {
        current.current = null;
        setSpeakingId(null);
        setError(t("voice.playFail"));
      }
    },
    [supported, stop, t],
  );

  // Stop talking when the chat unmounts.
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  const status = error ?? (speakingId ? t("voice.playing") : null);
  return { speakingId, status, speak, stop };
}
