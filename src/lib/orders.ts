// Mock order data + order-handling logic. Presentation-free.
// Replace `lookupOrder` / `respond` with calls to your FastAPI backend later.

import {
  calculateShippingFee,
  checkCancellationEligibility,
  checkCODEligibility,
  checkDamagedProductEligibility,
  checkReturnEligibility,
  formatINR,
} from "./policy";

export type OrderStatus = "Out for Delivery" | "Delivered" | "Processing";

export interface Order {
  id: string;
  customer: string;
  product: string;
  amount: number;
  status: OrderStatus;
  courier?: string;
  trackingId?: string;
  detail: { label: string; value: string }[];
  cancellable: boolean;
  deliveredDaysAgo?: number;
}

export const ORDERS: Order[] = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    amount: 699,
    status: "Out for Delivery",
    courier: "BlueDart",
    trackingId: "BD-982103",
    cancellable: false,
    detail: [{ label: "Expected", value: "By 6 PM today" }],
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: 499,
    status: "Delivered",
    courier: "Delhivery",
    trackingId: "DL-441029",
    cancellable: false,
    deliveredDaysAgo: 14,
    detail: [{ label: "Delivered", value: "14 days ago" }],
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: 850,
    status: "Processing",
    cancellable: true,
    detail: [
      { label: "Placed", value: "3 hours ago" },
      { label: "Cancellable", value: "Yes" },
    ],
  },
];

export const RETURN_WINDOW_DAYS = 7;

export function lookupOrder(id: string) {
  return ORDERS.find((o) => o.id === id.toUpperCase());
}

/** The single order retrieval function used by the support agent. */
export function get_order_details(id: string) {
  return lookupOrder(id);
}

export type Intent =
  | "order_status"
  | "cancellation"
  | "return"
  | "shipping"
  | "cod"
  | "damage"
  | "greeting"
  | "general";
export type Resolution = "Resolved" | "Escalated" | "Unresolved";

export interface AgentReply {
  text: string;
  intent?: Intent;
  orderId?: string;
  resolution?: Resolution;
}

function extractOrderId(text: string): string | undefined {
  const numberWords: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
  const spoken = text.replace(/\b(?:ORD|ORDER)(?:\s+NUMBER)?\s+((?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\s*){3,})\b/i, (full, digits: string) => {
    const normalized = digits.trim().split(/\s+/).map((word) => numberWords[word.toLowerCase()]).join("");
    return `${full.slice(0, full.toLowerCase().indexOf(digits.toLowerCase()))}${normalized}`;
  });
  const m = spoken.match(/\b(?:ORD|ORDER)[\s-]*(?:NUMBER\s*)?[#:-]?\s*(\d{3,})\b/i);
  if (m) return `ORD-${m[1]}`;
  const n = spoken.match(/\b(10[1-3])\b/);
  return n ? `ORD-${n[1]}` : undefined;
}

export function respond(text: string, ctxOrderId?: string, pendingOrderIntent?: Intent): AgentReply {
  const t = text.toLowerCase();
  const extractedOrderId = extractOrderId(text);
  const orderId = extractedOrderId ?? ctxOrderId;
  const order = orderId ? get_order_details(orderId) : undefined;
  const detectedIntent: Intent = /cancel/.test(t)
    ? "cancellation"
    : /return|refund|exchange/.test(t)
      ? "return"
      : /shipping|ship|delivery\s*(fee|charge|cost)|shipping\s*(charge|cost|fee)/.test(t)
        ? "shipping"
        : /where|track|status|deliver|order/.test(t)
          ? "order_status"
          : /cod|cash on delivery/.test(t)
            ? "cod"
            : /damaged|defective/.test(t)
              ? "damage"
              : /^(hi|hello|hey)\b/.test(t)
                ? "greeting"
                : "general";
  // A reply to an order-ID question inherits the active request even if it contains only an ID.
  const intent: Intent = extractedOrderId && pendingOrderIntent ? pendingOrderIntent : detectedIntent;

  if (/^(thanks?(?:\s+so much)?|thank\s*you(?:\s+so much)?|i appreciate it|much appreciated)[.!\s]*$/i.test(text.trim())) {
    return { text: "You're welcome! I'm here if you need help with another Aura Skincare order.", intent: "general" };
  }

  if (
    intent === "general" &&
    !/(order|track|cancel|return|refund|delivery|product|shipping|cod|cash|damage)/i.test(t)
  ) {
    if (/\b(book|flight|travel|trip|hotel|weather|restaurant|recipe|sports|news)\b/i.test(t)) {
      return {
        text: "I'm sorry, I can only help with Aura Skincare order questions such as tracking, cancellations, returns, shipping, or payment options.",
        intent,
      };
    }
    return {
      text: "Sorry, I didn't quite catch that. I can help with Aura Skincare orders—could you repeat your question and share your order ID?",
      intent,
    };
  }

  if (intent === "greeting")
    return { text: "Hello! Could you share your order ID, for example ORD-101?", intent };

  if (intent === "return" && !order && !orderId) {
    const elapsedDays = text.match(/\b(\d+)\s*[- ]?days?\b/i)?.[1];
    if (elapsedDays && Number(elapsedDays) > RETURN_WINDOW_DAYS) {
      return {
        text: `Based on the ${elapsedDays} days you mentioned, this is outside our ${RETURN_WINDOW_DAYS}-day return window. I can't guarantee a return or refund. If you'd like, share your order ID so a specialist can review the details.`,
        intent,
        resolution: "Escalated",
      };
    }
  }

  if (["order_status", "cancellation", "return", "damage"].includes(intent) && !order) {
    if (orderId) {
      return {
        text: `I couldn't locate an order with ID ${orderId}. Could you please repeat or verify the ID?`,
        intent,
        orderId,
        resolution: "Unresolved",
      };
    }
    return {
      text: "Sure — could you tell me your order ID? It looks like ORD followed by three digits.",
      intent,
    };
  }

  // Intent implementations using policy functions
  if (intent === "cancellation") {
    const eligible = checkCancellationEligibility(order!.status);
    if (eligible) {
      return {
        text: `Your order ${order!.id} is still processing, so it can be cancelled.`,
        intent,
        orderId: order!.id,
        resolution: "Resolved",
      };
    }
    return {
      text: `I'm sorry, ${order!.id} is already ${order!.status.toLowerCase()} and cannot be cancelled. You may refuse delivery at the doorstep.`,
      intent,
      orderId: order!.id,
      resolution: "Unresolved",
    };
  }

  if (intent === "return") {
    const result = checkReturnEligibility(order!);
    if (result.eligible) {
      return {
        text: `${order!.id} is within the ${RETURN_WINDOW_DAYS}-day return window. I've raised a return request.`,
        intent,
        orderId: order!.id,
        resolution: "Resolved",
      };
    }
    const outsideWindow = result.reason?.includes("expired");
    return {
      text: outsideWindow
        ? `${order!.id} is outside our ${RETURN_WINDOW_DAYS}-day return window. I can't guarantee a return or refund. I'll connect you with a specialist for an exception review.`
        : result.reason === "Delivery date unknown"
          ? `I couldn't verify when ${order!.id} was delivered, so I can't confirm return eligibility. I'll refer this to a specialist for review.`
          : (result.reason ?? `${order!.id} is not eligible for return.`),
      intent,
      orderId: order!.id,
      resolution:
        outsideWindow || result.reason === "Delivery date unknown" ? "Escalated" : "Unresolved",
    };
  }

  if (intent === "damage") {
    // Assume photos not provided and report date is now
    const result = checkDamagedProductEligibility(order!);
    if (result.eligible) {
      return {
        text: `${order!.id} qualifies for a replacement due to damage. We'll process it shortly.`,
        intent,
        orderId: order!.id,
        resolution: "Resolved",
      };
    }
    return {
      text: result.reason ?? `${order!.id} is not eligible for a damaged product replacement.`,
      intent,
      orderId: order!.id,
      resolution: "Unresolved",
    };
  }

  if (intent === "shipping") {
    // Check if a specific order is referenced — use its verified subtotal
    if (order) {
      const fee = calculateShippingFee(order.amount);
      if (fee === null) {
        return {
          text: `Your order ${order.id} has a subtotal of ${formatINR(order.amount)}, which is exactly at the ₹499 boundary. Our policy doesn't clearly define this case — let me connect you with a specialist for clarification.`,
          intent,
          orderId: order.id,
          resolution: "Escalated",
        };
      }
      const feeText = fee === 0 ? `Your order qualifies for free delivery.` : `Your shipping fee is ${formatINR(fee)}.`;
      return {
        text: `${feeText} Standard delivery takes 3–5 business days.`,
        intent,
        orderId: order.id,
        resolution: "Resolved",
      };
    }

    // Extract subtotal amount from text (₹ or Rs)
    const amountMatch = text.match(/(?:₹|rs\.?\s*)(\d+(?:\.\d{1,2})?)/i);
    const subtotal = amountMatch?.[1] ? parseFloat(amountMatch[1]) : null;
    if (subtotal === null) {
      // No specific amount — return the general shipping policy overview
      return {
        text: "Orders above ₹499 qualify for free delivery. Orders below ₹499 have a ₹50 shipping fee. Standard delivery takes 3–5 business days.",
        intent,
        resolution: "Resolved",
      };
    }
    const fee = calculateShippingFee(subtotal);
    if (fee === null) {
      return {
        text: `For a subtotal of ${formatINR(subtotal)}, the shipping charge needs confirmation as it matches the policy boundary of ₹499. Could you check whether the subtotal is above or below ₹499?`,
        intent,
      };
    }
    if (fee === 0) {
      return {
        text: `Your order qualifies for free delivery. Standard delivery takes 3–5 business days.`,
        intent,
        resolution: "Resolved",
      };
    }
    return {
      text: `Your shipping fee is ${formatINR(fee)}. Standard delivery takes 3–5 business days.`,
      intent,
      resolution: "Resolved",
    };
  }

  if (intent === "cod") {
    const amountMatch = text.match(/(?:₹|rs\.?\s*)(\d+(?:\.\d{1,2})?)/i);
    const total = amountMatch?.[1] ? parseFloat(amountMatch[1]) : null;
    if (total === null) {
      return { text: "Please provide the order total amount to check COD eligibility.", intent };
    }
    const eligible = checkCODEligibility(total);
    if (eligible) {
      return {
        text: `${formatINR(total)} orders are eligible for Cash on Delivery. You can pay by cash or UPI at the doorstep.`,
        intent,
        resolution: "Resolved",
      };
    }
    return {
      text: `${formatINR(total)} exceeds the ₹2,500 limit for COD. Please choose another payment method.`,
      intent,
      resolution: "Unresolved",
    };
  }

  // Default order status handling
  const extra =
    order!.status === "Out for Delivery"
      ? `with ${order!.courier}, tracking ${order!.trackingId}. Expected by 6 PM today.`
      : order!.status === "Delivered"
        ? `It was delivered by ${order!.courier} ${order!.deliveredDaysAgo} days ago.`
        : "It's being packed and should ship within 24 hours.";
  return {
    text: `${order!.id}, your ${order!.product}, is ${order!.status.toLowerCase()} ${extra}`,
    intent: "order_status",
    orderId: order!.id,
    resolution: "Resolved",
  };
}
