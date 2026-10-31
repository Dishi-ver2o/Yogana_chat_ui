import type { Api, ChatEvent, ChatRequest, Citation, Envelope, SchemeSummary } from "../types";
import { ApiError } from "../types";
import { parseSSE } from "../sse";

// INTEGRATE: set VITE_API_BASE_URL. All paths below are relative to /api/v1.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const V1 = `${BASE}/api/v1`;

async function json<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let res: Response;
  try {
    // INTEGRATE: credentials "include" is only needed for admin (HttpOnly session cookie).
    res = await fetch(`${V1}${path}`, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("NETWORK", "Could not reach the server");
  }
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError("BAD_RESPONSE", `Unexpected response (${res.status})`);
  }
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, body.meta?.request_id, body.error.details);
  return body;
}

export const liveApi: Api = {
  // INTEGRATE: GET /api/v1/health
  health: () => json("/health"),
  // INTEGRATE: GET /api/v1/schemes
  listSchemes: () => json<SchemeSummary[]>("/schemes"),
  // INTEGRATE: GET /api/v1/citations/{chunkId}
  getCitation: (chunkId: string) => json<Citation>(`/citations/${encodeURIComponent(chunkId)}`),

  // INTEGRATE: POST /api/v1/chat  (text/event-stream) — confirm event names/payloads match sse.ts
  async *chat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
    let res: Response;
    try {
      res = await fetch(`${V1}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(req),
        signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      yield { type: "error", code: "NETWORK", message: "Could not reach the server" };
      return;
    }
    if (!res.ok || !res.body) {
      let code = "HTTP_" + res.status;
      let message = "The server returned an error";
      try {
        const b = (await res.json()) as Envelope<unknown>;
        if (!b.ok) {
          code = b.error.code;
          message = b.error.message;
        }
      } catch {
        /* keep defaults */
      }
      yield { type: "error", code, message, requestId: res.headers.get("x-request-id") ?? undefined };
      return;
    }
    yield* parseSSE(res.body);
  },
};
