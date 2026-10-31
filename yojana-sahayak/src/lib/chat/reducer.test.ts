import { describe, expect, it } from "vitest";
import type { ChatFinal } from "../api/types";
import { applyEvent, newStreamingMessage, parseMarkers } from "./reducer";

const final: ChatFinal = {
  messageId: "m1", text: "Validated [1]", citations: [], evidence: { status: "STRONG", reasons: ["r"] },
};

describe("stream reconciliation", () => {
  it("accumulates tokens as provisional text", () => {
    let m = newStreamingMessage("p", "u");
    m = applyEvent(m, { type: "status", phase: "generating" });
    m = applyEvent(m, { type: "token", text: "Hel" });
    m = applyEvent(m, { type: "token", text: "lo" });
    expect(m.text).toBe("Hello");
    expect(m.state).toBe("streaming");
    expect(m.phase).toBe("generating");
  });
  it("final REPLACES streamed text", () => {
    let m = newStreamingMessage("p", "u");
    m = applyEvent(m, { type: "token", text: "provisional words" });
    m = applyEvent(m, { type: "final", final });
    expect(m.text).toBe("Validated [1]");
    expect(m.state).toBe("final");
    expect(m.id).toBe("m1");
    expect(m.phase).toBeUndefined();
  });
  it("error discards unvalidated text", () => {
    let m = newStreamingMessage("p", "u");
    m = applyEvent(m, { type: "token", text: "half an answer" });
    m = applyEvent(m, { type: "error", code: "STREAM_INTERRUPTED", message: "x", requestId: "r1" });
    expect(m.state).toBe("error");
    expect(m.text).toBe("");
    expect(m.error?.requestId).toBe("r1");
  });
  it("INSUFFICIENT is always treated as refusal, even if flag missing", () => {
    const m = applyEvent(newStreamingMessage("p", "u"), { type: "final", final: { ...final, evidence: { status: "INSUFFICIENT", reasons: [] }, schemeSuggestions: [{ id: "a" } as never] } });
    expect(m.refusal).toBe(true);
  });
  it("refusal never carries scheme suggestions", () => {
    const m = applyEvent(newStreamingMessage("p", "u"), { type: "final", final: { ...final, refusal: true, evidence: { status: "INSUFFICIENT", reasons: [] }, schemeSuggestions: [{ id: "a" } as never] } });
    expect(m.schemeSuggestions).toBeUndefined();
  });
  it("ignores events after the message settled", () => {
    let m = applyEvent(newStreamingMessage("p", "u"), { type: "final", final });
    m = applyEvent(m, { type: "token", text: "late" });
    expect(m.text).toBe("Validated [1]");
  });
});

describe("parseMarkers", () => {
  it("splits text and markers", () => {
    expect(parseMarkers("A [1] and B[2].")).toEqual([
      { kind: "text", text: "A " }, { kind: "cite", marker: 1 }, { kind: "text", text: " and B" }, { kind: "cite", marker: 2 }, { kind: "text", text: "." },
    ]);
  });
  it("leaves non-numeric brackets alone", () => {
    expect(parseMarkers("see [abc]")).toEqual([{ kind: "text", text: "see [abc]" }]);
  });
  it("handles Devanagari text", () => {
    expect(parseMarkers("उत्तर [1]")[1]).toEqual({ kind: "cite", marker: 1 });
  });
});
