import { useEffect, useMemo, useState } from "react";
import { INTENT_LABEL, downloadJson, formatDuration, type CallRecord } from "@/lib/calls";
import type { Resolution } from "@/lib/orders";
import { RES_STYLE } from "./CallSummary";
import { ChevronIcon, DownloadIcon, SearchIcon } from "./Icons";

const FILTERS: ("All" | Resolution)[] = ["All", "Resolved", "Escalated", "Unresolved"];

export function CallHistory({ calls, limit }: { calls: CallRecord[]; limit?: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const list = useMemo(() => {
    const r = calls.filter(
      (c) =>
        (f === "All" || c.resolution === f) &&
        (!q || (c.orderId ?? "").toLowerCase().includes(q.toLowerCase())),
    );
    return limit ? r.slice(0, limit) : r;
  }, [calls, q, f, limit]);

  return (
    <section className="panel overflow-hidden" aria-labelledby="history-title">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h3 id="history-title" className="font-serif text-2xl text-forest">
            Call History
          </h3>
          <p className="text-xs text-muted-foreground">Includes demonstration entries</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search by order ID</span>
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order ID"
              className="h-9 w-44 rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage-soft"
            />
          </label>
          <div
            className="flex rounded-full border border-border bg-background p-0.5"
            role="group"
            aria-label="Filter by resolution"
          >
            {FILTERS.map((x) => (
              <button
                key={x}
                onClick={() => setF(x)}
                aria-pressed={f === x}
                className={`press rounded-full px-3 py-1.5 text-xs font-medium ${f === x ? "bg-forest text-on-dark" : "text-muted-foreground hover:text-forest"}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
      </header>
      {list.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          No calls match these filters.
        </p>
      ) : (
        <ul>
          {list.map((c) => {
            const isOpen = open === c.id;
            return (
              <li key={c.id} className="border-b border-border last:border-0">
                <button
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-background sm:grid-cols-[auto_1.4fr_1fr_0.6fr_auto_auto]"
                >
                  <span
                    className={`size-2.5 rounded-full ${c.resolution === "Resolved" ? "bg-sage" : c.resolution === "Escalated" ? "bg-amber" : "bg-concrete"}`}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{INTENT_LABEL[c.intent]}</span>
                    <span className="block text-xs text-muted-foreground">
                      {hydrated
                        ? new Date(c.startedAt).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </span>
                  </span>
                  <span className="hidden font-mono text-xs sm:block">{c.orderId ?? "—"}</span>
                  <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                    {formatDuration(c.durationSec)}
                  </span>
                  <span
                    className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${RES_STYLE[c.resolution]}`}
                  >
                    {c.resolution}
                  </span>
                  <ChevronIcon
                    className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                      <div className="rounded-2xl bg-cream/60 p-4">
                        <p className="eyebrow text-muted-foreground !text-[10px]">Summary</p>
                        <p className="mt-2 font-serif text-lg leading-snug text-forest">
                          {c.summary}
                        </p>
                        <button
                          onClick={() => downloadJson(c)}
                          className="press mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-amber"
                        >
                          <DownloadIcon className="size-3.5" /> Download JSON
                        </button>
                      </div>
                      <div className="rounded-2xl border border-border p-4">
                        <p className="eyebrow text-muted-foreground !text-[10px]">
                          Transcript preview
                        </p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {c.transcript.slice(0, 4).map((m) => (
                            <li key={m.id}>
                              <span
                                className={`font-semibold ${m.speaker === "aria" ? "text-amber" : "text-forest"}`}
                              >
                                {m.speaker === "aria" ? "Aria" : "Customer"}:
                              </span>{" "}
                              {m.text}
                            </li>
                          ))}
                          {c.transcript.length === 0 && (
                            <li className="text-muted-foreground">No messages recorded.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
