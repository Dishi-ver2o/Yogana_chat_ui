import type { ChatEvent } from "./types";

/**
 * Parses a Server-Sent-Events byte stream into ChatEvents.
 * Wire format expected from the backend (confirm when integrating):
 *   event: <start|status|token|final|error>
 *   data: <JSON>
 *   <blank line>
 * The `event:` name is authoritative; `data` is the event payload.
 */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.search(/\r?\n\r?\n/)) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx).replace(/^\r?\n\r?\n/, "");
        const ev = parseBlock(block);
        if (ev) yield ev;
      }
    }
    if (buf.trim()) {
      const ev = parseBlock(buf);
      if (ev) yield ev;
    }
  } finally {
    reader.releaseLock();
  }
}

export function parseBlock(block: string): ChatEvent | null {
  let name = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(":")) continue; // comment / keep-alive
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  if (!data.length) return null;
  let payload: any;
  try {
    payload = JSON.parse(data.join("\n"));
  } catch {
    return { type: "error", code: "BAD_STREAM", message: "Malformed stream data" };
  }
  switch (name) {
    case "start":
      return { type: "start", messageId: String(payload.messageId ?? payload.message_id ?? "") };
    case "status":
      return { type: "status", phase: payload.phase };
    case "token":
      return { type: "token", text: String(payload.text ?? "") };
    case "final":
      return { type: "final", final: payload };
    case "error":
      return {
        type: "error",
        code: String(payload.code ?? "ERROR"),
        message: String(payload.message ?? "Something went wrong"),
        requestId: payload.request_id ?? payload.requestId,
      };
    default:
      return null;
  }
}
