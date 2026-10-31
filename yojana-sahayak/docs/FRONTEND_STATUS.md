# Status (honest)

Scope built: the **chat screen** from the supplied design, wired to the typed API seam. The full master prompt (citizen app, admin, PWA, PDF viewer…) is **not** built.

| Feature | Status | Proof |
|---|---|---|
| Pixel layout from screenshot (header, hero, greeting, divider, bubbles, composer, footer) | PASS (see note) | `docs/screenshots/design-vs-build.png` |
| Images unchanged (logo, avatars, hero cut 1:1 from screenshot) | PASS | `public/assets/*` |
| Streaming + status chips from events only + provisional state | PASS | e2e |
| Reconciliation (final replaces streamed text; error discards it) | PASS | e2e + `reducer.test.ts` |
| Stop, retry (keeps user message), offline, API-down states | PASS | e2e |
| Citations chips, evidence badge + reasons, refusal, partial limitations, pending/outdated warnings | PASS | e2e |
| Evidence panel (desktop drawer / mobile bottom sheet) | PASS (no PDF) | e2e, `chat-mobile-evidence-sheet.png` |
| Scheme cards (view/check/save, saved in IndexedDB) | PASS | e2e |
| Eligibility deflection (no verdict in chat) | PASS | e2e |
| Copy / report (hover icons) | PASS | e2e |
| **Listen** pill (read a reply aloud, Stop, one at a time, honest errors, Hindi voice check) | PASS with a *fake* speech engine; not heard on a real voice | `voice-e2e` (12 checks) |
| **Mic / voice input** (transcript → editable textbox, never auto-sent; permission, unsupported, offline states) | PASS with a *fake* recognizer; not tried with a real microphone | `voice-e2e` (10 checks) |
| EN/HI UI + persistence, history persistence, clear | PASS | e2e |
| Mock vs live seam; mock absent from live bundle; live+backend down → error card | PASS | build inspection + run |
| Unit tests (13) | PASS — run via Node test runner shim, **not real Vitest** | — |
| PDF.js viewer + highlight overlay | NOT BUILT | |
| Session list/rename/search sidebar, history drawer | NOT BUILT | not in the design |
| Virtualized message list | NOT BUILT (rows are memoized) | |
| Dark theme, PWA, admin, eligibility/recommendations/discover/saved/profile/settings pages | NOT BUILT | |
| axe / Lighthouse / Playwright-in-repo / `tsc` on React files | NOT RUN | tooling unavailable offline |

Notes: DM Sans/Noto Devanagari load via `@fontsource` on `npm install`; they were unavailable here, so pixel comparison used a fallback font (text is slightly wider than the design). Paperclip is kept for visual fidelity but shows a "no uploads" notice. Send button is 42px (design) rather than 44px.
