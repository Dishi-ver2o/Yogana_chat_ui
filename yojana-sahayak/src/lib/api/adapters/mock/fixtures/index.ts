import type { Citation, SchemeSummary } from "../../../types";

/**
 * SAMPLE DATA — NOT VERIFIED. Placeholder names only; no real amounts,
 * deadlines, ages or official URLs. (docs/BLUEPRINT_V2.md §3.1 seed list was
 * not available when this was built — replace these with the real 13 names.)
 */
export const sampleSchemes: SchemeSummary[] = [
  { id: "sample-scholarship-a", nameEn: "Sample Scholarship Scheme A", nameHi: "नमूना छात्रवृत्ति योजना A", category: "Education", capabilities: { rag: true, rules: true }, documentStatus: "verified" },
  { id: "sample-scholarship-b", nameEn: "Sample Scholarship Scheme B", nameHi: "नमूना छात्रवृत्ति योजना B", category: "Education", capabilities: { rag: true, rules: false }, documentStatus: "pending_review" },
  { id: "sample-fee-support-c", nameEn: "Sample Fee Support Scheme C", nameHi: "नमूना शुल्क सहायता योजना C", category: "Education", capabilities: { rag: true, rules: false }, documentStatus: "outdated" },
];

const base = (n: number, over: Partial<Citation>): Citation => ({
  chunkId: `sample-chunk-${n}`,
  marker: n,
  documentId: `sample-doc-${n}`,
  documentVersionId: `sample-doc-${n}-v1`,
  title: "Sample Scheme Guidelines",
  authority: "Sample Issuing Authority",
  status: "verified",
  page: n,
  passage: "Sample passage text. This is placeholder content, not taken from any real government document.",
  officialUrl: "https://example.org/sample-scheme",
  boxes: [],
  ...over,
});

export const sampleCitations: Citation[] = [
  base(1, { page: 2, title: "Sample Scheme Guidelines", passage: "Sample passage about who the scholarship is meant for. Placeholder text — not verified." }),
  base(2, { page: 4, title: "Sample Application Procedure", status: "pending_review", passage: "Sample passage about how to apply. Placeholder text — this sample document is marked pending review." }),
  base(3, { page: 1, title: "Sample Fee Notification", status: "outdated", passage: "Sample passage from an older notification. Placeholder text — this sample document is marked outdated." }),
];
