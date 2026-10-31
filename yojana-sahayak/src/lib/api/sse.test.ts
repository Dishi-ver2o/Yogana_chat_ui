import { describe, expect, it } from "vitest";
import { parseBlock, parseSSE } from "./sse";

const stream = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({ start(c) { const e = new TextEncoder(); chunks.forEach((x) => c.enqueue(e.encode(x))); c.close(); } });

describe("SSE parser", () => {
  it("parses events split across arbitrary chunk boundaries", async () => {
    const wire = 'event: start\ndata: {"messageId":"m1"}\n\nevent: token\ndata: {"text":"नमस्ते"}\n\nevent: status\ndata: {"phase":"validating"}\n\n';
    const out = [];
    for await (const e of parseSSE(stream([wire.slice(0, 17), wire.slice(17, 60), wire.slice(60)]))) out.push(e);
    expect(out).toEqual([{ type: "start", messageId: "m1" }, { type: "token", text: "नमस्ते" }, { type: "status", phase: "validating" }]);
  });
  it("ignores keep-alive comments and unknown events", () => {
    expect(parseBlock(": ping")).toBeNull();
    expect(parseBlock('event: weird\ndata: {}')).toBeNull();
  });
  it("turns malformed JSON into an error event instead of throwing", () => {
    expect(parseBlock("event: token\ndata: {nope")).toMatchObject({ type: "error", code: "BAD_STREAM" });
  });
  it("maps error payload", () => {
    expect(parseBlock('event: error\ndata: {"code":"RATE_LIMITED","message":"slow down","request_id":"r9"}')).toEqual({ type: "error", code: "RATE_LIMITED", message: "slow down", requestId: "r9" });
  });
});
