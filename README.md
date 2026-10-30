# Aura Skincare AI Voice Customer Support Agent

Aura is a browser-based customer support demo for Aura Skincare. It combines browser speech recognition and text-to-speech with a local, deterministic support responder, sample order records, policy checks, a live transcript, and downloadable call JSON. Despite the assessment name, this version does not call a hosted generative AI model or a remote order service.

## Submission links

- Deployed application: **[Add deployment URL]**
- GitHub repository: **[Add repository URL]**
- Demo video: **[Add demo video URL]**
- LinkedIn profile: **[Add LinkedIn profile URL]**

## Features

- Voice input through the browser's `SpeechRecognition` or `webkitSpeechRecognition` API, with interim text shown and completed utterances sent once.
- English, Hindi, and natural Hinglish intent matching and responses for the supported customer-support intents. Language is detected from each latest message; an order-ID-only answer inherits the language of the pending question.
- Selectable speech-recognition locale: `en-IN` for English/Hinglish or `hi-IN` for Hindi. Interim text is shown and completed utterances are sent once.
- End-of-speech handling, clear listening/processing/speaking/error states, and browser speech synthesis when a suitable voice is available. Hindi/Hinglish replies stay visible in text when a Hindi TTS voice is unavailable.
- Typed messages and six Quick Actions use the same support handler as recognized voice messages.
- Order status, cancellation, returns, shipping, cash-on-delivery, and damaged-product policy responses.
- Spoken order ID normalization for unambiguous forms such as “ORD one zero one”.
- Conversation transcript and call summary with JSON copy/download controls.
- Call history and order data are sample data held in browser memory for this demo.

## Technology stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite 8 with the Lovable TanStack configuration and Nitro Cloudflare build preset
- Tailwind CSS 4
- Browser Web Speech APIs for speech recognition and speech synthesis
- Vitest, Testing Library, jsdom, ESLint, and TypeScript for development checks

## Architecture and approach

The React interface calls `useVoiceAgent`. The hook owns the voice session, recognition lifecycle, speech synthesis, conversation messages, pending order intent, and call record. Recognition final results are accumulated; interim results are displayed but not submitted. After a detected speech end, the hook allows a short pause for continued speech and then asks the browser recognizer to stop so it can deliver its final result.

Text input, Quick Actions, and finalized voice input all reach the same message handler. The handler calls `respond(...)` in `src/lib/orders.ts`. That function classifies the request, keeps the pending intent when the customer supplies only an order ID, calls `get_order_details(order_id)`, and uses policy functions from `src/lib/policy.ts` before composing a reply. `get_order_details` currently reads the in-memory `ORDERS` fixture; it is not a network API or persistent database.

The hook builds a transcript and a `CallRecord` when a voice session ends. `src/lib/calls.ts` provides JSON serialization and download helpers. The summary panel can copy a compact JSON summary or download the call record, including the transcript. `src/lib/call-store.ts` keeps calls in memory and seeds the history view with sample calls.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a component and data flow diagram, plus implementation boundaries.

## Sample orders

These IDs are present in the local `ORDERS` fixture:

- `ORD-101` — Vitamin C Serum, out for delivery with BlueDart.
- `ORD-102` — Hydrating Sunscreen, delivered 14 days ago.
- `ORD-103` — Green Tea Face Wash + Toner, processing and cancellable under the current demo rule.

This data is illustrative and must not be treated as live customer or shipment information.

## Prerequisites and local setup

Install Node.js and npm. Microphone access requires a browser that supports the Web Speech recognition API and a secure context: HTTPS or `localhost`. Chrome and Edge commonly expose the prefixed or unprefixed API; support varies by browser and platform. Text input remains available when recognition is unsupported or denied.

```sh
git clone <repository-url>
cd <repository-directory>
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`), allow microphone access, and press **Start Listening**. The app speaks a greeting and begins recognition after the greeting finishes. Use **Stop Listening** to end the voice session.

## Commands

These commands match `package.json`:

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production app and Nitro output |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the Vite build locally |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint across the repository |
| `npm run format` | Format repository files with Prettier |

## Environment variables

No application environment variables are currently referenced by the source. There is no API key or database connection to configure. `.env.example` documents this; do not add credentials unless a future backend integration requires them. `.dev.vars` is ignored for local Cloudflare tooling.

## Known limitations and troubleshooting

- The response engine and order lookup are local rule-based code and in-memory fixtures; there is no generative AI provider, backend service, or production order database integration.
- Browser recognition accuracy, language coverage, permission prompts, silence detection, and availability depend on the browser and its speech service. The app uses a pause window to allow natural continuation, but a long pause may still end a turn.
- Browser speech recognition uses one selected locale per recognition turn; it cannot guarantee perfect code-switching inside a single utterance. Choose English + Hinglish or Hindi in the voice control. Voice locale and response language are separate: responses are classified from the recognized final transcript.
- Hinglish understanding is a local rule-based vocabulary/intent matcher, not a general-purpose Hindi/English language model. Informal spellings outside its supported terms may need rephrasing or typed input.
- Hindi and Hinglish speech output depends on an installed browser Hindi voice. If one is unavailable, the response is shown in text and the voice session continues.
- Call records added during a session live in memory and disappear on page reload. The visible initial call history is sample data.
- The current local policy data is intentionally small. Boundary cases such as exactly ₹499 shipping are escalated because the rule is ambiguous.
- If voice input does not start, use HTTPS or localhost, check the browser's site microphone permission, confirm an input device is connected, and try a supported browser. If the recognition API is unavailable or permission is denied, use the text field or Quick Actions.
- The JSON export contains the local call record and transcript. Do not enter real customer personal or payment information in this demo.

## Section 9 — Reflection

### 1. Why did you choose your architecture and technology stack?

React and TypeScript let me keep the interactive voice lifecycle and dashboard UI in one client application with typed message and order structures. TanStack Start provides the route and build framework already used by the project, while the browser Web Speech APIs avoid a separate speech service for this assessment prototype. The trade-off is that recognition support and accuracy depend on the user's browser, and the current local rule engine and fixtures are not suitable as a shared production service.

### 2. What was the most difficult part of the assignment, and how did you solve it?

The hardest part was coordinating speech recognition with text-to-speech and deciding when a customer had finished. Continuous recognition can keep running after words appear, while submitting interim results creates partial or duplicate replies. I accumulate final results, show interim text only as feedback, wait for an end-of-speech/pause signal, stop recognition to flush the final result, and guard processing so one utterance is handled once. A remaining trade-off is that a sufficiently long pause can still close a turn, and actual behavior varies by browser.

### 3. If you had one more week, what would you improve first and why?

I would first move order lookup and policy decisions behind a tested backend API backed by persistent storage. The current browser bundle contains the sample order fixtures and applies policy locally, so it cannot securely or reliably serve real customer orders. I would then add automated browser tests with mocked speech events and a focused manual microphone test matrix across supported browsers.

### 4. What would need to change to handle 1,000 customer conversations per day?

I would introduce stateless backend conversation services behind a load balancer, with horizontally scalable workers and provider rate-limit handling. The backend would authenticate requests and retrieve orders from a persistent database or approved order-service API; it would enforce policies server-side and store transcripts/summaries with access controls and retention rules. I would add queueing or backpressure for provider limits, structured monitoring and alerting for latency/errors, and load, concurrency, security, and failure-recovery tests. Capacity would need to be measured against peak concurrency and the selected speech/AI providers rather than inferred from a daily count alone.

## Verification status

The repository's Vitest suite, TypeScript check, and production build have been run during development. The browser microphone, permission-denied path, and live browser console/network behavior have **not** been verified end-to-end in this environment; test those in a supported browser before submission.
