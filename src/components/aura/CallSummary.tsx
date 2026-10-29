import { useState } from "react";
import { INTENT_LABEL, downloadJson, formatDuration, toJson, type CallRecord } from "@/lib/calls";
import { CheckIcon, ChevronIcon, CopyIcon, DownloadIcon } from "./Icons";

export const RES_STYLE = { Resolved: "bg-sage-soft text-forest", Escalated: "bg-amber-soft text-amber", Unresolved: "bg-cream text-olive" } as const;

function highlight(json: string) {
  return json.split("\n").map((line, i) => {
    const m = line.match(/^(\s*)("[^"]+")(:\s*)(.*)$/);
    if (!m) return <div key={i}>{line}</div>;
    const [, ind, key, colon, val] = m;
    const vc = /^"/.test(val!) ? "text-sage" : /^(null|true|false)/.test(val!) ? "text-amber" : /^\d/.test(val!) ? "text-amber" : "text-on-dark-muted";
    return <div key={i}>{ind}<span className="text-on-dark">{key}</span>{colon}<span className={vc}>{val}</span></div>;
  });
}

export function CallSummary({ record }: { record: CallRecord | null }) {
  const [flash, setFlash] = useState<string | null>(null);
  const note = (s: string) => { setFlash(s); setTimeout(() => setFlash(null), 1800); };
  const [showJson, setShowJson] = useState(false);

  // Build the concise structured summary required by the assignment
  const getStructured = (r: CallRecord) => ({
    customer_intent: r.intent,
    order_id: r.orderId ?? null,
    resolution_status: r.resolution,
    call_summary: r.summary,
  });

  return (
    <section className="panel flex h-[520px] flex-col overflow-hidden" aria-labelledby="summary-title">
      <header className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
        <div>
          <h3 id="summary-title" className="font-serif text-2xl text-forest">Call Summary</h3>
          <p className="text-xs text-muted-foreground">{record ? new Date(record.startedAt).toLocaleString() : "Generated after a call ends"}</p>
        </div>
        <div className="flex items-center gap-2">
          {flash && <span className="flex items-center gap-1 text-xs font-semibold text-forest animate-fade-up" role="status"><CheckIcon className="size-3.5" />{flash}</span>}
          <button disabled={!record} aria-label="Copy JSON" data-tip="Copy JSON"
            onClick={async () => {
              if (!record) return;
              try {
                await navigator.clipboard.writeText(JSON.stringify(getStructured(record), null, 2));
                note("Copied");
              } catch { note("Copy blocked"); }
            }}
            className="press tip grid size-9 place-items-center rounded-full border border-border text-forest hover:border-amber hover:text-amber disabled:opacity-40 disabled:pointer-events-none">
            <CopyIcon />
          </button>
          <button disabled={!record} onClick={() => {
            if (record) {
              downloadJson(record);
              note("Downloaded");
            }
          }}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-forest px-4 text-xs font-semibold text-on-dark hover:bg-olive disabled:opacity-40 disabled:pointer-events-none">
            <DownloadIcon /> JSON
          </button>
        </div>
      </header>
      {!record ? (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <div className="mx-auto mb-4 grid gap-2">
              {[70, 90, 55].map((w) => <span key={w} className="mx-auto h-2.5 rounded-full bg-cream" style={{ width: `${w * 1.6}px` }} />)}
            </div>
            <p className="font-serif text-xl text-forest">Awaiting a completed call</p>
            <p className="mt-1 text-sm text-muted-foreground">Intent, order and resolution are captured automatically when you end a call.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RES_STYLE[record.resolution]}`}>{record.resolution}</span>
            <span className="font-mono text-xs text-muted-foreground">{record.id}</span>
          </div>
          <dl className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border">
            {[["Intent", INTENT_LABEL[record.intent]], ["Order", record.orderId ?? "—"], ["Duration", formatDuration(record.durationSec)]].map(([k, v]) => (
              <div key={k} className="px-4 py-3">
                <dt className="eyebrow text-muted-foreground !text-[10px]">{k}</dt>
                <dd className="mt-1 text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-l-2 border-amber pl-4 font-serif text-lg leading-snug text-forest">{record.summary}</p>
          <button onClick={() => setShowJson(!showJson)} aria-expanded={showJson}
            className="mt-5 flex items-center gap-1 text-xs font-semibold text-forest hover:text-amber">
            {showJson ? "Hide" : "Show"} structured JSON <ChevronIcon className={`size-3.5 transition-transform ${showJson ? "rotate-180" : ""}`} />
          </button>
          {showJson && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-forest p-4 font-mono text-[11px] leading-5 text-on-dark-muted animate-fade-up">
              {JSON.stringify(getStructured(record), null, 2)}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
