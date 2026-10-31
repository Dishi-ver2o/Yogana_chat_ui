import type { Api, Envelope } from "../../types";
import { ApiError } from "../../types";
import { mockChat, mockControls } from "./chat-stream";
import { sampleCitations, sampleSchemes } from "./fixtures";

export { mockControls };

const ok = <T,>(data: T): Envelope<T> => ({ ok: true, data, meta: { request_id: `mock-${Math.random().toString(36).slice(2, 10)}` } });
const latency = () => new Promise((r) => setTimeout(r, mockControls.slow ? 800 : 120));

/** MOCK ADAPTER — returns sample data only. Not an eligibility engine, not verified. */
export const mockApi: Api = {
  async health() {
    await latency();
    if (mockControls.offline) throw new ApiError("NETWORK", "Could not reach the server");
    return ok({ status: "ok" as const });
  },
  async listSchemes() {
    await latency();
    return ok(sampleSchemes);
  },
  async getCitation(chunkId) {
    await latency();
    const c = sampleCitations.find((x) => x.chunkId === chunkId);
    if (!c) throw new ApiError("NOT_FOUND", "Citation not found");
    return ok(c);
  },
  chat: (req, signal) => mockChat(req, signal),
};
