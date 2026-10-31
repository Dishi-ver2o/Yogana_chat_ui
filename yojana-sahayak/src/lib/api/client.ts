import type { Api, ChatEvent, ChatRequest } from "./types";

/**
 * The only module UI code imports for network access: `api.*`.
 * Mode comes from VITE_API_MODE (mock | live). The mock adapter is behind a
 * dynamic import inside a build-time constant check, so live builds contain
 * no fixtures.
 */
let impl: Promise<Api> | null = null;
function load(): Promise<Api> {
  if (!impl) {
    if (import.meta.env.VITE_API_MODE === "live") {
      impl = import("./adapters/live").then((m) => m.liveApi);
    } else {
      impl = import("./adapters/mock").then((m) => m.mockApi);
    }
  }
  return impl;
}

export const apiMode: "mock" | "live" = import.meta.env.VITE_API_MODE === "live" ? "live" : "mock";

export const api: Api = {
  health: async () => (await load()).health(),
  listSchemes: async () => (await load()).listSchemes(),
  getCitation: async (id) => (await load()).getCitation(id),
  async *chat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
    const a = await load();
    yield* a.chat(req, signal);
  },
};
