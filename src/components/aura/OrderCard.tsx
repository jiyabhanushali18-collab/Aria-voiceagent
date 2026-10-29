import { useState } from "react";
import type { Order } from "@/lib/orders";
import { BoxIcon, CheckIcon, ChevronIcon, CopyIcon, TruckIcon } from "./Icons";

const STATUS: Record<Order["status"], { cls: string; Icon: typeof BoxIcon }> = {
  "Out for Delivery": { cls: "bg-amber-soft text-amber", Icon: TruckIcon },
  Delivered: { cls: "bg-sage-soft text-forest", Icon: CheckIcon },
  Processing: { cls: "bg-cream text-olive", Icon: BoxIcon },
};
export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface Props { order: Order; selected: boolean; expanded: boolean; onToggle: () => void; onTry: () => void }

export function OrderCard({ order, selected, expanded, onToggle, onTry }: Props) {
  const [copied, setCopied] = useState(false);
  const { cls, Icon } = STATUS[order.status];
  const copy = async () => {
    try { await navigator.clipboard.writeText(order.id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <article className={`group rounded-[20px] border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${selected ? "border-amber shadow-lift" : "border-border shadow-soft"}`}>
      <button onClick={onToggle} aria-expanded={expanded} aria-controls={`${order.id}-details`} className="w-full p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[20px]">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid size-11 place-items-center rounded-full ${cls}`}><Icon className="size-5" /></span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${cls}`}>
            <span className="size-1.5 rounded-full bg-current" />{order.status}
          </span>
        </div>
        <p className="mt-5 font-mono text-xs tracking-wider text-muted-foreground">{order.id}</p>
        <h3 className="mt-1 font-serif text-2xl text-forest">{order.product}</h3>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-muted-foreground">{order.customer}</span>
          <span className="font-serif text-2xl text-amber">{inr(order.amount)}</span>
        </div>
        <span className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-forest">
          {expanded ? "Hide details" : "View details"} <ChevronIcon className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div id={`${order.id}-details`} className={`grid transition-all duration-300 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden">
          <dl className="mx-6 grid grid-cols-2 gap-y-2 border-t border-border pt-4 text-sm">
            {order.courier && <><dt className="text-muted-foreground">Courier</dt><dd className="text-right font-medium">{order.courier}</dd></>}
            {order.trackingId && <><dt className="text-muted-foreground">Tracking ID</dt><dd className="text-right font-mono text-xs leading-5">{order.trackingId}</dd></>}
            {order.detail.map((d) => <div key={d.label} className="contents"><dt className="text-muted-foreground">{d.label}</dt><dd className="text-right font-medium">{d.value}</dd></div>)}
          </dl>
          <div className="flex gap-2 p-6 pt-5">
            <button onClick={onTry} className="press flex-1 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-on-dark hover:bg-olive">
              {selected ? "Selected ✓" : "Try this order"}
            </button>
            <button onClick={copy} aria-label={`Copy ${order.id}`} data-tip={copied ? "Copied!" : "Copy order ID"} className="press tip grid size-11 place-items-center rounded-full border border-border text-forest hover:border-amber hover:text-amber">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
