# Integration guide — switching from mock to the real backend

1. Copy `.env.example` → `.env`, set `VITE_API_MODE=live` and `VITE_API_BASE_URL=<backend origin>`.
2. Build. In live mode the mock adapter and DevPanel are not in the bundle (checked: no fixture strings in the output).
3. Mount `<App onNavigate={(route) => router.navigate(route)} />` (or just `<ChatCard/>`) in the website. Routes the chat uses: `/app/eligibility`, `/schemes`, `/schemes/:id`. Without `onNavigate` the UI shows a toast naming the route instead of faking a page.

All network access goes through `src/lib/api/client.ts` (`api.*`). Contracts: `src/lib/api/types.ts`.

| `api.*` | Live endpoint (assumed) | Mock behaviour | Verify when live |
|---|---|---|---|
| `health()` | `GET /api/v1/health` | `{status:"ok"}` | envelope shape |
| `listSchemes()` | `GET /api/v1/schemes` | 3 placeholder schemes | field names vs `SchemeSummary` |
| `getCitation(chunkId)` | `GET /api/v1/citations/{id}` | sample citations | `Citation`/`Box` fields |
| `chat(req, signal)` | `POST /api/v1/chat`, `text/event-stream` | scripted events with delays | event names/payloads vs `sse.ts`; `final` replaces streamed text; `request_id` on errors |

## `// INTEGRATE:` locations
- `src/lib/api/adapters/live.ts` — every endpoint path, base URL, SSE event format, `credentials` for admin.
- `src/lib/db/store.ts` — problem reports are stored on-device; POST to a report endpoint once it exists.
- `src/features/chat/MessageView.tsx` — report form submit.
- `src/App.tsx` — `onNavigate` prop (host router).

## Contract points to confirm with backend
- **Assumed, not from a spec:** `docs/BLUEPRINT_V2.md` (§12 endpoints, §3.1 seed scheme names) was **not provided**. Paths, SSE wire format and field names follow the master prompt only.
- `final.suggestedAction = { type: "open_eligibility", route }` is an **addition** so the backend can trigger the eligibility button (the LLM never states a verdict). Agree on it or replace it.
- `final.sample` marks mock output for the "Sample data — not verified" label; live responses should omit it.
- SSE: `event: <start|status|token|final|error>` + `data: <json>`; error payload `{code,message,request_id}`. UI maps codes `NETWORK, UPSTREAM_UNAVAILABLE, STREAM_INTERRUPTED, RATE_LIMITED, TIMEOUT` to friendly bilingual text; unknown codes get a generic message with the request ID in a details disclosure.

## Mock triggers (type these in the chat)
`scholarship / student` → STRONG, 3 citations (verified / pending / outdated), scheme cards · `how / apply / document` → PARTIAL · `eligible` → eligibility button, no verdict · `error` → mid-stream failure · `modify` → final rewrites streamed text · anything else → INSUFFICIENT refusal. Hindi (Devanagari) input gets Hindi sample answers. Dev builds show a MOCK box (fail next / slow / API down).

## Voice (Listen + Mic) — where the code is
- `src/features/chat/useSpeaker.ts` — Listen: browser `speechSynthesis`, one message at a time, language chosen from the message text (Devanagari → `hi-IN`). If no Hindi voice is installed it says so instead of reading Hindi with an English voice.
- `src/features/chat/Composer.tsx` — `useDictation()` + the mic button: browser `SpeechRecognition`, language follows the UI language (`hi-IN` / `en-IN`). Transcript goes into the text box and is only sent when the user presses Send.
- `src/features/chat/MessageView.tsx` — the Listen pill beside the timestamp. `src/lib/i18n/{en,hi}.ts` — `voice.*` and `mic.*` strings. `src/styles.css` — `.listen`, `.mic`, `.voice-status`.
- **Privacy caveat:** Listen is generated on the device. Mic input in Chrome/Edge is processed by the browser vendor's cloud speech service (needs internet), so it is *not* "no audio leaves the device". If that is a requirement, voice input needs a different approach (e.g. a self-hosted speech-to-text endpoint behind `api.*`). Firefox has no `SpeechRecognition`, so the mic is shown disabled with an explanation.
- Hindi reading depends on the user's OS having a Hindi voice (usually present on Android/Windows/macOS; may be missing on some Linux).
