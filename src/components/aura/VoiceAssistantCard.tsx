import { useEffect, useState } from "react";
import type { AgentStatus, RecognitionLocale } from "@/hooks/useVoiceAgent";
import { formatDuration } from "@/lib/calls";
import heroImg from "@/assets/hero-botanical.jpg";
import { MicIcon, PhoneOffIcon } from "./Icons";

const LABEL: Record<AgentStatus, string> = {
  idle: "Aria is ready to help", listening: "Listening to you…",
  processing: "Aria is thinking…", speaking: "Aria is speaking…", error: "Voice input needs attention",
};

interface Props {
  status: AgentStatus; active: boolean; elapsed: number; error: string | null;
  supported: { recognition: boolean; synthesis: boolean };
  recognizedText: string;
  recognitionLocale: RecognitionLocale;
  selectedOrder?: string | undefined; draft?: string;
  onStart: () => void; onEnd: () => void; onSendText: (t: string) => void;
  onRecognitionLocaleChange: (locale: RecognitionLocale) => void;
}

export function VoiceAssistantCard({ status, active, elapsed, error, supported, recognizedText, recognitionLocale, selectedOrder, draft, onStart, onEnd, onSendText, onRecognitionLocaleChange }: Props) {
  const [text, setText] = useState("");
  useEffect(() => { if (draft) setText(draft); }, [draft]);

  return (
    <section
      id="voice-assistant"
      className="grain relative scroll-mt-24 overflow-hidden rounded-[28px] bg-forest text-on-dark shadow-lift"
      aria-labelledby="hero-title"
    >
      <img src={heroImg} alt="" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover object-right opacity-75" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest/90 via-forest/55 to-forest/20" />
      {/* botanical line art */}
      <svg className="pointer-events-none absolute -left-10 -top-10 h-72 w-72 text-sage/20 animate-drift" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden>
        <path d="M20 180C60 120 100 80 180 20M60 132c-20-6-30-22-28-40 18 2 30 16 28 40Zm40-40c-18-10-24-28-18-44 16 6 24 24 18 44Zm34-32c-14-12-16-30-6-44 14 10 16 28 6 44Z" />
      </svg>

      <div className="relative grid items-center gap-10 px-6 py-10 md:px-12 md:py-14 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-fade-up">
          <p className="eyebrow text-sage">Your personal skincare assistant</p>
          <h1 id="hero-title" className="mt-4 max-w-xl font-serif text-4xl leading-[1.05] md:text-6xl">
            Care that listens.<br /><em className="text-sage">Support that understands.</em>
          </h1>
          <p className="mt-5 max-w-md text-on-dark-muted leading-relaxed">
            Meet Aria, Aura's AI support specialist. Ask about deliveries, cancellations or returns — just speak naturally.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={onStart} disabled={active}
              className="press inline-flex h-12 items-center gap-2 rounded-full bg-sage px-7 font-semibold text-forest hover:bg-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-forest disabled:cursor-not-allowed disabled:opacity-40">
              <MicIcon /> Start Listening
            </button>
            <button onClick={onEnd} disabled={!active}
              className="press inline-flex h-12 items-center gap-2 rounded-full border border-amber bg-amber px-6 font-semibold text-on-dark hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:border-on-dark/20 disabled:bg-transparent disabled:text-on-dark/40">
              <PhoneOffIcon /> Stop Listening
            </button>
            <label className="sr-only" htmlFor="voice-language">Speech recognition language</label>
            <select id="voice-language" value={recognitionLocale} onChange={(event) => onRecognitionLocaleChange(event.target.value as RecognitionLocale)}
              className="h-11 rounded-full border border-on-dark/20 bg-forest px-4 text-sm text-on-dark outline-none focus:border-sage">
              <option value="en-IN">English + Hinglish</option>
              <option value="hi-IN">Hindi</option>
            </select>
            {active && (
              <span className="ml-1 inline-flex items-center gap-2 font-mono text-sm tabular-nums text-on-dark" aria-label="Call duration">
                <span className="size-2 rounded-full bg-amber animate-pulse" /> {formatDuration(elapsed)}
              </span>
            )}
          </div>

          {selectedOrder && <p className="mt-4 text-xs text-on-dark-muted">Testing context: <span className="font-semibold text-sage">{selectedOrder}</span></p>}

          {active && <p className="mt-3 min-h-5 max-w-md text-sm text-on-dark" aria-live="polite" aria-label="Recognized speech">{recognizedText ? <>Heard: <span className="font-semibold text-sage">{recognizedText}</span></> : status === "listening" ? "Listening for your answer…" : ""}</p>}

          {error ? (
            <div role="alert" className="mt-5 max-w-md rounded-xl border border-amber/60 bg-amber/15 px-4 py-3 text-sm text-on-dark animate-fade-up">{error}</div>
          ) : (
            <p className="mt-5 max-w-md text-xs text-on-dark-muted">
              {supported.recognition ? "Choose Hindi or English + Hinglish for voice input. Your latest message sets Aria's response language." : "Voice input needs Chrome or Edge. You can type here instead."}
            </p>
          )}

          <form className="mt-4 flex max-w-md gap-2 animate-fade-up" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSendText(text); setText(""); } }}>
            <label htmlFor="type-msg" className="sr-only">Type a message to Aria</label>
            <input id="type-msg" value={text} onChange={(e) => setText(e.target.value)}
              placeholder={active ? "Or type, e.g. Where is ORD-101?" : "Type a question, e.g. What are shipping charges?"}
              className="h-11 flex-1 rounded-full border border-on-dark/20 bg-on-dark/10 px-4 text-sm text-on-dark placeholder:text-on-dark-muted outline-none focus:border-sage" />
            <button type="submit" disabled={!text.trim()} className="press h-11 rounded-full bg-on-dark px-5 text-sm font-semibold text-forest disabled:opacity-40">Send</button>
          </form>
        </div>

        <AriaOrb status={status} active={active} onStart={onStart} onEnd={onEnd} />
      </div>
    </section>
  );
}

function AriaOrb({ status, active, onStart, onEnd }: { status: AgentStatus; active: boolean; onStart: () => void; onEnd: () => void }) {
  const bars = Array.from({ length: 28 });
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid size-72 place-items-center md:size-80">
        {/* rings */}
        <span className="absolute inset-0 rounded-full border border-on-dark/10" />
        <span className="absolute inset-8 rounded-full border border-on-dark/10" />
        {status === "idle" && <span className="absolute inset-12 rounded-full bg-sage/20 animate-breathe" />}
        {status === "listening" && [0, 0.7, 1.4].map((d) => (
          <span key={d} className="absolute inset-16 rounded-full border-2 border-sage animate-ripple" style={{ animationDelay: `${d}s` }} />
        ))}
        {status === "processing" && [0, 0.8, 1.6].map((d) => (
          <span key={d} className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 size-3 rounded-full bg-sage animate-orbit" style={{ animationDelay: `-${d}s`, ["--r" as string]: "104px" }} />
        ))}
        {status === "speaking" && bars.map((_, i) => (
          <span key={i} className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${(360 / bars.length) * i}deg)` }}>
            <span className="absolute -left-[2px] bottom-[86px] block h-9 w-1 rounded-full bg-amber animate-wave" style={{ animationDelay: `${(i % 7) * 0.12}s` }} />
          </span>
        ))}
        <button
          onClick={active ? onEnd : onStart}
          disabled={false}
          aria-label={active ? "Stop listening to Aria" : "Start listening to Aria"}
          className={`press tip relative grid size-36 place-items-center rounded-full transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${active ? "bg-sage text-forest glow-sage" : "bg-olive text-sage hover:bg-sage hover:text-forest hover:glow-sage"}`}
          data-tip={active ? "Tap to stop listening" : "Tap to start listening"}>
          <span className="absolute inset-2 rounded-full border border-current/20" />
          <MicIcon className="size-12" />
        </button>
      </div>
      <p role="status" aria-live="polite" key={status} className="mt-4 inline-flex items-center gap-2 rounded-full border border-on-dark/15 bg-on-dark/5 px-4 py-1.5 text-sm animate-fade-up">
        <span className={`size-2 rounded-full ${status === "speaking" ? "bg-amber" : status === "error" ? "bg-red-400" : active ? "bg-sage" : "bg-on-dark-muted"}`} />
        {LABEL[status]}
      </p>
    </div>
  );
}
