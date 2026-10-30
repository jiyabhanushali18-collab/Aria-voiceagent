# Architecture

## Implemented flow

The application is a TanStack Start/React client with browser-side support logic. There is no application API server for AI responses or orders in the current implementation. The build emits a Nitro Cloudflare target, but that deployment preset does not mean the app currently uses Cloudflare data services.

```mermaid
flowchart TD
  Customer[Customer]
  UI[React dashboard: VoiceAssistantCard, QuickCommands, text form]
  Hook[useVoiceAgent: session state, history, pending intent, request guard]
  SR[Browser SpeechRecognition / webkitSpeechRecognition]
  Locale[Voice locale selector: en-IN or hi-IN]
  Language[Latest-turn English / Hindi / Hinglish detection]
  TTS[Browser speechSynthesis]
  Respond[respond: deterministic intent and response rules]
  OrderLookup[get_order_details(order_id)]
  Orders[(ORDERS in-memory fixtures)]
  Policy[Policy functions: shipping, return, cancellation, COD, damage]
  Transcript[Conversation messages and CallRecord]
  Store[In-memory call store plus sample history]
  JSON[JSON copy/download]

  Customer -->|voice| SR
  Locale -->|selected recognition locale| SR
  Customer -->|typed message or Quick Action| UI
  UI --> Hook
  SR -->|interim display; final text on completed turn| Hook
  Hook --> Language
  Language -->|reply language| Respond
  Hook -->|shared finalized message handler| Respond
  Respond --> OrderLookup
  OrderLookup --> Orders
  Respond --> Policy
  Respond -->|reply| Hook
  Hook --> TTS
  TTS -->|spoken reply; then recognition resumes| Customer
  Hook --> Transcript
  Transcript --> Store
  Transcript --> JSON
  UI -->|live transcript and status| Customer
```

## Component responsibilities

- **Frontend:** `src/routes/index.tsx` composes the dashboard, `VoiceAssistantCard`, `QuickCommands`, order fixtures, transcript, call summary, and call history. Quick Actions and typed input invoke the same `sendText` handler used by completed voice turns.
- **Voice session:** `src/hooks/useVoiceAgent.ts` owns `idle`, `listening`, `processing`, `speaking`, and `error` status; creates one speech recognizer per session; requests speech recognition directly from the start control; accumulates final recognition results; displays interim and final recognized words; and prevents duplicate request processing. The customer can select `en-IN` for English/Hinglish or `hi-IN` for Hindi; a locale change flushes the active recognition turn and applies to the next one. Speech end and a short quiet window cause recognition to stop and flush its final result. Speech synthesis finishes before recognition restarts.
- **Speech APIs:** Recognition uses `window.SpeechRecognition` or `window.webkitSpeechRecognition` in continuous mode with interim results. Speech output uses `window.speechSynthesis` and `SpeechSynthesisUtterance`, preferring a voice matching the response language. Hindi/Hinglish text remains visible if a Hindi voice is unavailable. These are browser APIs; there is no app-managed audio stream or third-party speech SDK.
- **Language and response handling:** `src/lib/language.ts` detects English, Devanagari Hindi, and Hinglish using script and common Roman Hindi markers. `src/lib/orders.ts` implements `respond(text, ctxOrderId, pendingOrderIntent, pendingLanguage)`. It recognizes supported English/Hindi/Hinglish intent terms, responds using concise per-intent templates, preserves intent and language for an order-ID-only answer, normalizes spoken English/Hindi digits, and chooses deterministic responses. Language support is rule-based, not generative; it does not call an LLM, translation service, or external AI provider.
- **Order lookup:** `get_order_details(order_id)` delegates to `lookupOrder` over the static `ORDERS` array in `src/lib/orders.ts`. The three order IDs are fixtures, not live records.
- **Policy validation:** `src/lib/policy.ts` contains shipping, return, cancellation, cash-on-delivery, and damaged-item eligibility rules. `respond` applies these rules before returning its answer. Some rules use fixed demo assumptions and should be reviewed before production use.
- **Transcript and summary:** Voice and text turns are appended as `Message` records. Ending a voice session creates a `CallRecord` with intent, order ID, resolution, summary text, duration, and transcript. `src/lib/calls.ts` formats JSON. `src/lib/call-store.ts` stores new records in memory and initializes the history with sample records; nothing is persisted to a server or browser database.

## Implemented vs planned

| Area | Implemented now | Planned work before production |
| --- | --- | --- |
| Voice recognition | Browser Web Speech APIs, interim display, final-result handling, pause-based stop/restart, permission and support messages | Cross-browser microphone testing, more robust speech-end tuning, and automated browser lifecycle tests |
| Languages | Rule-based English/Hindi/Hinglish detection and response templates; selectable `en-IN`/`hi-IN` speech recognition; Hindi TTS voice check | Broader Hindi/Hinglish phrase coverage, automatic code-switching recognition, and browser-by-browser language/TTS tests |
| AI responses | Local deterministic intent and policy rules | Authenticated backend integration with a selected AI provider, grounded prompts, timeouts, and rate-limit handling |
| Order data | Three in-memory sample fixtures via `get_order_details` | Secure order-service/database integration and authorization checks |
| Policies | Client-side demo functions | Server-side policy enforcement with versioned, reviewed rules |
| Call records | In-memory history, seeded examples, transcript, summary, and JSON export | Persistent, access-controlled storage, retention/deletion controls, and operational monitoring |
| Scaling | Single browser app and local rule execution | Horizontally scalable backend services, concurrency/load testing, queueing, and provider capacity planning |

## Environment configuration

The source currently reads no application environment variables. No API keys, database credentials, or provider secrets are required for local operation. `.env.example` exists to state that explicitly. Secrets for future integrations must be kept server-side and must never use a client-exposed `VITE_` variable.
