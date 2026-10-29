import type { Intent, Resolution } from "./orders";

export type Speaker = "customer" | "aria";
export interface Message { id: string; speaker: Speaker; text: string; at: number }

export interface CallRecord {
  id: string;
  startedAt: number;
  durationSec: number;
  intent: Intent | "unknown";
  orderId?: string | undefined;
  resolution: Resolution;
  summary: string;
  transcript: Message[];
}

export const INTENT_LABEL: Record<CallRecord["intent"], string> = {
  order_status: "Order status", cancellation: "Cancellation", return: "Return request",
  shipping: "Shipping", cod: "Cash on Delivery", damage: "Damaged product",
  greeting: "Greeting", general: "General enquiry", unknown: "Unknown",
};

export function formatDuration(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function toJson(record: CallRecord) {
  const data = {
    call_id: record.id,
    started_at: new Date(record.startedAt).toISOString(),
    duration_seconds: record.durationSec,
    customer_intent: record.intent,
    order_id: record.orderId ?? null,
    resolution_status: record.resolution,
    summary: record.summary,
    transcript: record.transcript.map((m) => ({ speaker: m.speaker, text: m.text, timestamp: new Date(m.at).toISOString() })),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadJson(record: CallRecord) {
  const url = URL.createObjectURL(new Blob([toJson(record)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = `aura-call-${record.id}.json`; a.click();
  URL.revokeObjectURL(url);
}

// Preview-only sample history.
const h = 3600_000;
const mk = (id: string, ago: number, intent: CallRecord["intent"], orderId: string, resolution: Resolution, summary: string, c: string, a: string, dur: number): CallRecord => {
  const t = Date.now() - ago;
  return { id, startedAt: t, durationSec: dur, intent, orderId, resolution, summary,
    transcript: [{ id: id + "a", speaker: "customer", text: c, at: t + 4000 }, { id: id + "b", speaker: "aria", text: a, at: t + 7000 }] };
};
export const SAMPLE_HISTORY: CallRecord[] = [
  mk("c-2041", 2 * h, "order_status", "ORD-101", "Resolved", "Customer asked for delivery status; shared BlueDart tracking and ETA.", "Where is my order ORD-101?", "It's out for delivery with BlueDart, expected by 6 PM today.", 74),
  mk("c-2040", 5 * h, "return", "ORD-102", "Escalated", "Return requested outside 7-day window; escalated for exception review.", "I want to return ORD-102.", "It's outside our return window, I'll connect you with a specialist.", 118),
  mk("c-2039", 26 * h, "cancellation", "ORD-103", "Resolved", "Order still processing; cancelled and refund initiated.", "Please cancel ORD-103.", "Done — your refund of ₹850 will arrive in 5–7 business days.", 63),
];
