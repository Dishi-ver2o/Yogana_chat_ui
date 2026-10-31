/**
 * API contracts — single source of truth for the UI <-> backend seam.
 * Shapes follow the frontend master prompt (§4). Keep in sync with the
 * FastAPI response models; both adapters (mock, live) return exactly these.
 */

export type Language = "hi" | "en";

// ---------- Envelope ----------
export interface ApiMeta {
  request_id: string;
}
export interface ApiOk<T> {
  ok: true;
  data: T;
  meta: ApiMeta;
}
export interface ApiErr {
  ok: false;
  error: { code: string; message: string; details?: unknown };
  meta: ApiMeta;
}
export type Envelope<T> = ApiOk<T> | ApiErr;

/** Thrown by adapters when the envelope says ok:false or the network fails. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public requestId?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------- Evidence & citations ----------
export type EvidenceStatus = "STRONG" | "PARTIAL" | "INSUFFICIENT";
export interface Evidence {
  status: EvidenceStatus;
  /** Plain-language reasons. Never a percentage. */
  reasons: string[];
}

/** PDF-point coordinates; the (future) PDF viewer scales these. */
export interface Box {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  pageWidth: number;
  pageHeight: number;
  rotation: 0 | 90 | 180 | 270;
}

export type DocumentStatus = "verified" | "pending_review" | "outdated";

export interface Citation {
  chunkId: string;
  /** The number used inline, e.g. 1 for "[1]". */
  marker: number;
  documentId: string;
  documentVersionId: string;
  title: string;
  authority: string;
  status: DocumentStatus;
  page: number;
  passage: string;
  officialUrl: string;
  boxes: Box[];
}

// ---------- Schemes ----------
export interface SchemeSummary {
  id: string;
  nameEn: string;
  nameHi: string;
  category: string;
  capabilities: { rag: boolean; rules: boolean };
  documentStatus: DocumentStatus;
}

// ---------- Chat ----------
export interface ChatRequest {
  sessionId: string;
  message: string;
  /** UI default language; the backend answers in the language of `message`. */
  language: Language;
  /** Optional: scope the question to one scheme ("Ask about this scheme"). */
  schemeId?: string;
}

export type ChatStatusPhase = "retrieving" | "generating" | "validating";

export interface ChatFinal {
  messageId: string;
  /** Validated text. REPLACES whatever was streamed. */
  text: string;
  citations: Citation[];
  evidence: Evidence;
  refusal?: boolean;
  schemeSuggestions?: SchemeSummary[];
  /**
   * The LLM never decides eligibility. For eligibility-style questions the
   * backend sets this so the UI shows a button to the Eligibility flow.
   * (Addition to the contract list in the master prompt — confirm with backend.)
   */
  suggestedAction?: { type: "open_eligibility"; route: string };
  /** True for mock adapter output; drives the "Sample data — not verified" label. */
  sample?: boolean;
}

export type ChatEvent =
  | { type: "start"; messageId: string }
  | { type: "status"; phase: ChatStatusPhase }
  | { type: "token"; text: string }
  | { type: "final"; final: ChatFinal }
  | { type: "error"; code: string; message: string; requestId?: string };

// ---------- Eligibility & questionnaire (contracts only; UI lives elsewhere) ----------
export type EligibilityOutcome =
  | "ELIGIBLE"
  | "LIKELY_ELIGIBLE"
  | "NEED_MORE_INFO"
  | "NOT_ELIGIBLE";

export interface QuestionDefinition {
  id: string;
  type: string;
  labelHi: string;
  labelEn: string;
  options?: { value: string; labelHi: string; labelEn: string }[];
  sensitive: boolean;
  consentRequired: boolean;
  allowNotSure: true;
}

// ---------- Client interface ----------
export interface Api {
  health(): Promise<Envelope<{ status: "ok" }>>;
  listSchemes(): Promise<Envelope<SchemeSummary[]>>;
  getCitation(chunkId: string): Promise<Envelope<Citation>>;
  chat(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
}
