import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { TopNav } from "@/components/aura/TopNav";
import { QuickCommands } from "@/components/aura/QuickCommands";
import { VoiceAssistantCard } from "@/components/aura/VoiceAssistantCard";
import { OrderCard } from "@/components/aura/OrderCard";
import { ConversationTranscript } from "@/components/aura/ConversationTranscript";
import { CallSummary } from "@/components/aura/CallSummary";
import { CallHistory } from "@/components/aura/CallHistory";
import { Footer } from "@/components/aura/Footer";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { ORDERS } from "@/lib/orders";
import { addCall, useCalls } from "@/lib/call-store";
import { formatDuration, type CallRecord } from "@/lib/calls";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aria — Aura Skincare AI Voice Support" },
      { name: "description", content: "Talk to Aria, Aura Skincare's AI voice assistant for order tracking, cancellations and returns." },
      { property: "og:title", content: "Aria — Aura Skincare AI Voice Support" },
      { property: "og:description", content: "Care that listens. AI voice customer support for Aura Skincare." },
    ],
  }),
  component: Index,
});

function Index() {
  const calls = useCalls();
  const [last, setLast] = useState<CallRecord | null>(null);
  const [selected, setSelected] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>("ORD-101");
  const [draft, setDraft] = useState("");
  const onEnd = useCallback((r: CallRecord) => { setLast(r); addCall(r); }, []);
  const agent = useVoiceAgent(onEnd);

  const metrics = useMemo(() => {
    const resolved = calls.filter((c) => c.resolution === "Resolved").length;
    const avg = calls.length ? Math.round(calls.reduce((s, c) => s + c.durationSec, 0) / calls.length) : 0;
    return [
      { k: "Calls handled", v: String(calls.length) },
      { k: "Resolved", v: calls.length ? `${Math.round((resolved / calls.length) * 100)}%` : "—" },
      { k: "Avg. duration", v: formatDuration(avg) },
    ];
  }, [calls]);

  const tryOrder = (id: string) => {
    setSelected(id);
    setDraft(`Where is my order ${id}?`);
    try { void navigator.clipboard?.writeText(id); } catch { /* ignore */ }
    if (!agent.active) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl space-y-14 px-4 py-6 md:px-8 md:py-10">
        <VoiceAssistantCard status={agent.status} active={agent.active} elapsed={agent.elapsed} error={agent.error}
          supported={agent.supported} recognizedText={agent.recognizedText} selectedOrder={selected} draft={draft}
          onStart={() => agent.start(selected)} onEnd={agent.end} onSendText={agent.sendText} />
        <QuickCommands onSend={agent.sendText} />

        <dl className="grid grid-cols-3 divide-x divide-border rounded-[20px] border border-border bg-surface/60">
          {metrics.map((m) => (
            <div key={m.k} className="px-4 py-5 text-center md:px-8 md:text-left">
              <dt className="eyebrow text-muted-foreground !text-[10px]">{m.k}</dt>
              <dd className="mt-1 font-serif text-3xl text-forest md:text-4xl">{m.v}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="orders-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow text-amber">Test the agent</p>
              <h2 id="orders-title" className="mt-2 font-serif text-4xl text-forest">Live Order Lookup</h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">Open an order and press "Try this order" — its ID is copied and a question is prepared for Aria.</p>
          </div>
          <div className="grid items-start gap-5 md:grid-cols-3">
            {ORDERS.map((o) => (
              <OrderCard key={o.id} order={o} selected={selected === o.id} expanded={expanded === o.id}
                onToggle={() => setExpanded(expanded === o.id ? null : o.id)} onTry={() => tryOrder(o.id)} />
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <ConversationTranscript messages={agent.messages} status={agent.status} active={agent.active} onClear={agent.clearMessages} />
          <CallSummary record={last} />
        </div>

        <CallHistory calls={calls} limit={6} />
      </main>
      <Footer />
    </div>
  );
}
