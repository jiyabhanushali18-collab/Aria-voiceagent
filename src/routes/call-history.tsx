import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/aura/TopNav";
import { CallHistory } from "@/components/aura/CallHistory";
import { useCalls } from "@/lib/call-store";

export const Route = createFileRoute("/call-history")({
  head: () => ({
    meta: [
      { title: "Call History — Aura Skincare AI Support" },
      { name: "description", content: "Review past Aria calls, intents, resolutions and transcripts." },
      { property: "og:title", content: "Call History — Aura Skincare AI Support" },
      { property: "og:description", content: "Past AI voice support calls with transcripts and summaries." },
    ],
  }),
  component: Page,
});

function Page() {
  const calls = useCalls();
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
        <h1 className="font-serif text-4xl text-deep-sage">Call History</h1>
        <CallHistory calls={calls} />
      </main>
    </div>
  );
}
