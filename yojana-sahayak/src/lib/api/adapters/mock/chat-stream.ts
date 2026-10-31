import type { ChatEvent, ChatFinal, ChatRequest, Citation, Evidence } from "../../types";
import { sampleCitations, sampleSchemes } from "./fixtures";

/** Dev-only knobs (see DevPanel). */
export const mockControls = { failNext: false, slow: false, offline: false };

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

const isHindi = (s: string) => /[ऀ-ॿ]/.test(s);
let counter = 0;
const id = () => `mock-msg-${Date.now()}-${++counter}`;

interface Script {
  streamed: string; // provisional text streamed token by token
  final: Omit<ChatFinal, "messageId" | "sample">;
  failMidway?: boolean;
}

const ev = (status: Evidence["status"], reasons: string[]): Evidence => ({ status, reasons });
const cites = (...n: number[]): Citation[] => n.map((i) => sampleCitations[i - 1]);

function pick(req: ChatRequest): Script {
  const m = req.message.toLowerCase();
  const hi = isHindi(req.message);

  // Eligibility-style questions are never answered by chat — deflect.
  if (/eligib|qualify|am i entitled|पात्र|हकदार/.test(m)) {
    const text = hi
      ? "पात्रता का निर्णय चैट में नहीं किया जाता। कृपया पात्रता जाँच का उपयोग करें — यह आपके उत्तरों को नियमों से मिलाती है।"
      : "I can't decide eligibility in chat. Please use the eligibility check — it compares your answers against the scheme rules.";
    return {
      streamed: text,
      final: { text, citations: [], evidence: ev("PARTIAL", [hi ? "पात्रता केवल नियम-आधारित जाँच से तय होती है।" : "Eligibility is decided only by the rules check."]), suggestedAction: { type: "open_eligibility", route: "/app/eligibility" } },
    };
  }
  if (/error|fail|गड़बड़/.test(m)) {
    return { streamed: hi ? "मैं स्रोत खोज रहा" : "Looking through the sources and", final: null as never, failMidway: true };
  }
  if (/modify|reconcile|बदल/.test(m)) {
    return {
      streamed: "Sample provisional text that the validator will rewrite before it is shown as final.",
      final: { text: "Sample validated answer [1]. This replaced the provisional streamed text.", citations: cites(1), evidence: ev("STRONG", ["Sample reason: matched a verified sample document."]) },
    };
  }
  if (/partial|document|apply|how|कैसे|दस्तावेज़/.test(m)) {
    const text = hi
      ? "नमूना उत्तर: आवेदन के चरणों का कुछ हिस्सा स्रोत दस्तावेज़ों में मिला [1], लेकिन पूरी प्रक्रिया नहीं मिली। यह नमूना सामग्री है।"
      : "Sample answer: part of the application steps appears in the source documents [1], but the full procedure was not found. This is sample content.";
    return {
      streamed: text.replace(/\[1\]/, ""),
      final: { text, citations: cites(2), evidence: ev("PARTIAL", hi ? ["आवेदन चरण आंशिक रूप से मिले।", "उद्धृत दस्तावेज़ समीक्षा के लिए लंबित है।"] : ["Only part of the application steps was found.", "The cited sample document is pending review."]) },
    };
  }
  if (/scholar|student|college|छात्र|छात्रवृत्ति|कॉलेज|fee|शुल्क/.test(m)) {
    const text = hi
      ? "नमूना उत्तर: छात्रों के लिए कई छात्रवृत्ति योजनाएँ हो सकती हैं [1][2]। एक पुरानी अधिसूचना भी मिली [3]। यह नमूना सामग्री है, सत्यापित नहीं।"
      : "Sample answer: there may be several scholarship schemes for students [1][2]. An older notification was also found [3]. This is sample content, not verified.";
    return {
      streamed: text.replace(/\[\d\]/g, ""),
      final: { text, citations: cites(1, 2, 3), evidence: ev("STRONG", hi ? ["नमूना: सत्यापित दस्तावेज़ से मेल मिला।"] : ["Sample reason: matched a verified sample document."]), schemeSuggestions: sampleSchemes },
    };
  }
  // Default: nothing found → calm refusal. No substantive answer shown.
  const text = hi
    ? "मुझे इस प्रश्न का उत्तर देने के लिए सत्यापित दस्तावेज़ों में पर्याप्त जानकारी नहीं मिली।"
    : "I couldn't find enough information in the verified documents to answer this.";
  return {
    streamed: "",
    final: { text, citations: [], refusal: true, evidence: ev("INSUFFICIENT", hi ? ["कोई प्रासंगिक अंश नहीं मिला।"] : ["No relevant passages were retrieved."]) },
  };
}

export async function* mockChat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
  const slow = mockControls.slow ? 4 : 1;
  const messageId = id();
  if (mockControls.offline) {
    yield { type: "error", code: "NETWORK", message: "Could not reach the server" };
    return;
  }
  await sleep(250 * slow, signal);
  if (mockControls.failNext) {
    mockControls.failNext = false;
    yield { type: "error", code: "UPSTREAM_UNAVAILABLE", message: "The service is temporarily unavailable", requestId: "mock-req-failnext" };
    return;
  }
  const script = pick(req);
  yield { type: "start", messageId };
  yield { type: "status", phase: "retrieving" };
  await sleep(500 * slow, signal);
  yield { type: "status", phase: "generating" };
  const words = script.streamed.split(/(\s+)/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    await sleep(35 * slow, signal);
    yield { type: "token", text: words[i] };
    if (script.failMidway && i === Math.min(3, words.length - 1)) {
      yield { type: "error", code: "STREAM_INTERRUPTED", message: "The answer was interrupted", requestId: "mock-req-midstream" };
      return;
    }
  }
  yield { type: "status", phase: "validating" };
  await sleep(600 * slow, signal);
  yield { type: "final", final: { ...script.final, messageId, sample: true } };
}
