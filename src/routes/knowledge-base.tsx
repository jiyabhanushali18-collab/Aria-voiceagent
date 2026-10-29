import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/aura/TopNav";
import { RETURN_WINDOW_DAYS } from "@/lib/orders";

export const Route = createFileRoute("/knowledge-base")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Aura Skincare AI Support" },
      { name: "description", content: "Policies Aria uses: order tracking, cancellations and returns." },
      { property: "og:title", content: "Knowledge Base — Aura Skincare AI Support" },
      { property: "og:description", content: "Support policies behind Aura Skincare's AI assistant." },
    ],
  }),
  component: Page,
});

const POLICIES = [
  { t: "Order tracking", d: "Aria shares courier, tracking ID and expected delivery for any order ID." },
  { t: "Cancellations", d: "Orders can be cancelled only while Processing. Refunds arrive in 5–7 business days." },
  { t: "Returns", d: `Delivered items can be returned within ${RETURN_WINDOW_DAYS} days. Later requests are escalated to a specialist.` },
];

function Page() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
        <h1 className="font-serif text-4xl text-deep-sage">Knowledge Base</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {POLICIES.map((p) => (
            <article key={p.t} className="panel p-6">
              <h2 className="font-serif text-xl text-deep-sage">{p.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
