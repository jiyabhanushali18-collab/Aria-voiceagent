import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/calls";
import type { AgentStatus } from "@/hooks/useVoiceAgent";
import { MicIcon, TrashIcon } from "./Icons";

const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ConversationTranscript({ messages, status, active, onClear }: { messages: Message[]; status: AgentStatus; active: boolean; onClear: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  return (
    <section className="panel flex h-[520px] flex-col overflow-hidden" aria-labelledby="transcript-title">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h3 id="transcript-title" className="font-serif text-2xl text-forest">Live Conversation</h3>
          <p className="text-xs text-muted-foreground">{messages.length} messages</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status === "listening" ? "bg-sage-soft text-forest" : status === "speaking" ? "bg-amber-soft text-amber" : "bg-cream text-muted-foreground"}`}>
            <span className={`size-1.5 rounded-full bg-current ${status === "listening" ? "animate-pulse" : ""}`} />
            {active ? (status === "listening" ? "Mic live" : status === "speaking" ? "Aria speaking" : status === "error" ? "Voice issue" : "Processing") : "Mic off"}
          </span>
          {confirm ? (
            <span className="flex items-center gap-1 animate-fade-up">
              <button onClick={() => { onClear(); setConfirm(false); }} className="press rounded-full bg-amber px-3 py-1 text-xs font-semibold text-on-dark">Clear</button>
              <button onClick={() => setConfirm(false)} className="press rounded-full border border-border px-3 py-1 text-xs">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirm(true)} disabled={!messages.length || active} aria-label="Clear conversation" data-tip="Clear conversation"
              className="press tip grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-amber disabled:opacity-40 disabled:pointer-events-none"><TrashIcon /></button>
          )}
        </div>
      </header>
      <div ref={box} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
        className="flex-1 space-y-5 overflow-y-auto bg-background/40 px-6 py-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="relative mx-auto mb-4 grid size-20 place-items-center">
                <span className="absolute inset-0 rounded-full bg-sage-soft animate-breathe" />
                <span className="relative grid size-14 place-items-center rounded-full bg-surface text-forest shadow-soft"><MicIcon className="size-6" /></span>
              </div>
              <p className="font-serif text-xl text-forest">Your conversation begins here</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">Start a call and every word between you and Aria appears in real time.</p>
            </div>
          </div>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex gap-3 animate-fade-up ${m.speaker === "customer" ? "flex-row-reverse" : ""}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${m.speaker === "aria" ? "bg-forest text-sage" : "bg-cream text-olive"}`}>{m.speaker === "aria" ? "A" : "You"}</span>
            <div className={`max-w-[78%] ${m.speaker === "customer" ? "text-right" : ""}`}>
              <p className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${m.speaker === "aria" ? "rounded-tl-sm bg-sage-soft text-forest" : "rounded-tr-sm border border-border bg-surface"}`}>{m.text}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{m.speaker === "aria" ? "Aria" : "Customer"} · {time(m.at)}</p>
            </div>
          </div>
        ))}
        {status === "processing" && (
          <div className="flex items-center gap-1.5 pl-11" aria-label="Aria is thinking">
            {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-sage animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
      </div>
    </section>
  );
}
