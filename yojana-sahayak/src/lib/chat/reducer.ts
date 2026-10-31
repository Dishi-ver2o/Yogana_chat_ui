import type { ChatEvent, ChatFinal, ChatStatusPhase, Citation, Evidence, EvidenceStatus, SchemeSummary } from "../api/types";

export interface Msg {
  id: string;
  role: "user" | "assistant";
  /** Plain text (user, or assistant provisional/final). Ignored when i18nKey is set. */
  text: string;
  /** For seeded greeting/demo messages so they follow the UI language. */
  i18nKey?: string;
  time: number;
  state: "streaming" | "final" | "error";
  phase?: ChatStatusPhase;
  citations?: Citation[];
  evidence?: Evidence;
  refusal?: boolean;
  schemeSuggestions?: SchemeSummary[];
  suggestedAction?: ChatFinal["suggestedAction"];
  sample?: boolean;
  error?: { code: string; message: string; requestId?: string };
  /** The user message this assistant message answers (for retry). */
  replyTo?: string;
}

export function newStreamingMessage(id: string, replyTo: string): Msg {
  return { id, role: "assistant", text: "", time: Date.now(), state: "streaming", replyTo };
}

/**
 * Pure reconciliation reducer. Streamed tokens are provisional; `final`
 * REPLACES the text and attaches citations/evidence. On `error`, provisional
 * text is discarded — unvalidated text is never left as an answer.
 */
export function applyEvent(m: Msg, e: ChatEvent): Msg {
  if (m.state !== "streaming") return m;
  switch (e.type) {
    case "start":
      return { ...m, id: e.messageId || m.id };
    case "status":
      return { ...m, phase: e.phase };
    case "token":
      return { ...m, text: m.text + e.text };
    case "final": {
      const f = e.final;
      return {
        ...m,
        id: f.messageId || m.id,
        text: f.text,
        state: "final",
        phase: undefined,
        citations: f.citations,
        evidence: f.evidence,
        refusal: f.refusal || f.evidence.status === "INSUFFICIENT",
        schemeSuggestions: f.refusal ? undefined : f.schemeSuggestions,
        suggestedAction: f.suggestedAction,
        sample: f.sample,
        time: Date.now(),
      };
    }
    case "error":
      return { ...m, text: "", state: "error", phase: undefined, error: { code: e.code, message: e.message, requestId: e.requestId } };
  }
}

// ---------- citation markers ----------
export type Segment = { kind: "text"; text: string } | { kind: "cite"; marker: number };

export function parseMarkers(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\[(\d{1,2})\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "cite", marker: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

// ---------- evidence label ----------
export const evidenceLabelKey: Record<EvidenceStatus, string> = {
  STRONG: "evidence.strong",
  PARTIAL: "evidence.partial",
  INSUFFICIENT: "evidence.insufficient",
};
