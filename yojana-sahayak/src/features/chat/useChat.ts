import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api/client";
import type { Language } from "../../lib/api/types";
import { applyEvent, newStreamingMessage, type Msg } from "../../lib/chat/reducer";
import { clearChat, loadChat, saveChat } from "../../lib/db/store";

export const MAX_CHARS = 1000;

/** The demo conversation shown in the design (10:32 AM today). Follows the UI language via i18nKey. */
function seed(): Msg[] {
  const d = new Date();
  d.setHours(10, 32, 0, 0);
  const time = d.getTime();
  return [
    { id: "seed-user", role: "user", text: "", i18nKey: "seed.user", time, state: "final" },
    { id: "seed-assistant", role: "assistant", text: "", i18nKey: "seed.assistant", time, state: "final", replyTo: "seed-user" },
  ];
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function useChat(lang: Language) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>(uid());
  const abort = useRef<AbortController | null>(null);

  // Load persisted conversation (device-local), else the demo seed.
  useEffect(() => {
    let alive = true;
    loadChat().then((c) => {
      if (!alive) return;
      if (c) {  // a saved-but-empty chat (user cleared it) stays empty; only a first visit gets the demo seed
        sessionId.current = c.sessionId;
        setMessages(c.messages);
      } else {
        setMessages(seed());
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist (settled messages only).
  useEffect(() => {
    if (ready) void saveChat({ sessionId: sessionId.current, messages });
  }, [messages, ready]);

  const run = useCallback(
    async (userMsg: Msg) => {
      const assistantId = `pending-${uid()}`;
      const ac = new AbortController();
      abort.current = ac;
      setBusy(true);
      setMessages((m) => [...m, newStreamingMessage(assistantId, userMsg.id)]);
      let curId = assistantId;
      const patch = (fn: (m: Msg) => Msg) => setMessages((all) => all.map((x) => (x.id === curId ? fn(x) : x)));
      try {
        for await (const ev of api.chat({ sessionId: sessionId.current, message: userMsg.text, language: lang }, ac.signal)) {
          if (ev.type === "start" && ev.messageId) {
            const next = ev.messageId;
            patch((m) => ({ ...m, id: next }));
            curId = next;
            continue;
          }
          if (ev.type === "final" && ev.final.messageId) {
            // final may carry a different canonical id
            const prev = curId;
            curId = ev.final.messageId;
            setMessages((all) => all.map((x) => (x.id === prev ? applyEvent({ ...x, id: curId }, ev) : x)));
            continue;
          }
          patch((m) => applyEvent(m, ev));
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // User pressed stop: drop the provisional (unvalidated) answer entirely.
          setMessages((all) => all.filter((x) => x.id !== curId));
        } else {
          const err = e as { code?: string; message?: string; requestId?: string };
          patch((m) => applyEvent(m, { type: "error", code: err.code ?? "NETWORK", message: err.message ?? "", requestId: err.requestId }));
        }
      } finally {
        // Stream ended without final/error (e.g. connection dropped) → surface it, never leave it provisional.
        patch((m) => (m.state === "streaming" ? applyEvent(m, { type: "error", code: "STREAM_INTERRUPTED", message: "" }) : m));
        abort.current = null;
        setBusy(false);
      }
    },
    [lang],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, MAX_CHARS);
      if (!text || busy) return false;
      const userMsg: Msg = { id: `user-${uid()}`, role: "user", text, time: Date.now(), state: "final" };
      setMessages((m) => [...m, userMsg]);
      void run(userMsg);
      return true;
    },
    [busy, run],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  /** Retry keeps the user message; only the failed assistant message is replaced. */
  const retry = useCallback(
    (assistantMsgId: string) => {
      if (busy) return;
      const failed = messages.find((m) => m.id === assistantMsgId);
      const userMsg = messages.find((m) => m.id === failed?.replyTo);
      if (!failed || !userMsg) return;
      setMessages((all) => all.filter((m) => m.id !== assistantMsgId));
      void run(userMsg);
    },
    [busy, messages, run],
  );

  const clear = useCallback(async () => {
    abort.current?.abort();
    await clearChat();
    sessionId.current = uid();
    setMessages([]);
  }, []);

  return { messages, ready, busy, send, stop, retry, clear };
}
