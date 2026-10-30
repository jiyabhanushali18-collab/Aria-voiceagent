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
import { languageForMessage, normalizeDigits } from "./language";
import type { CustomerLanguage } from "./language";

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
  const numberWords: Record<string, string> = {
    zero: "0", oh: "0", shunya: "0", shoonya: "0", "शून्य": "0", "जीरो": "0",
    one: "1", ek: "1", "एक": "1", two: "2", do: "2", "दो": "2",
    three: "3", teen: "3", "तीन": "3", four: "4", char: "4", chaar: "4", "चार": "4",
    five: "5", paanch: "5", panch: "5", "पाँच": "5", "पांच": "5",
    six: "6", chhe: "6", cheh: "6", "छह": "6", "छे": "6",
    seven: "7", saat: "7", sat: "7", "सात": "7", eight: "8", aath: "8", aat: "8", "आठ": "8",
    nine: "9", nau: "9", "नौ": "9",
  };
  const normalizedDigits = normalizeDigits(text);
  const spoken = normalizedDigits.replace(/(?:\b(?:ORD|ORDER)\b|ऑर्डर)[\s-]*(?:(?:NUMBER|NO\.?|ID)\s*)?((?:(?:zero|oh|shunya|shoonya|जीरो|शून्य|one|ek|एक|two|do|दो|three|teen|तीन|four|char|chaar|चार|five|paanch|panch|पाँच|पांच|six|chhe|cheh|छह|छे|seven|saat|sat|सात|eight|aath|aat|आठ|nine|nau|नौ)\s*){3,})/gi, (full, digits: string) => {
    const normalized = digits.trim().split(/\s+/).map((word) => numberWords[word.toLowerCase()]).join("");
    return `${full.slice(0, full.toLowerCase().indexOf(digits.toLowerCase()))}${normalized} `;
  });
  const m = spoken.match(/(?:\b(?:ORD|ORDER)\b|ऑर्डर)[\s-]*(?:NUMBER\s*)?[#:-]?\s*(\d{3,})\b/i);
  if (m) return `ORD-${m[1]}`;
  const n = spoken.match(/\b(10[1-3])\b/);
  return n ? `ORD-${n[1]}` : undefined;
}

function extractAmount(text: string): number | undefined {
  const normalized = normalizeDigits(text);
  const explicit = normalized.match(/(?:₹|rs\.?\s*|rupees?\s*|rupaye\s*|रुपये?\s*)([\d,]+(?:\.\d{1,2})?)/i);
  if (explicit?.[1]) return Number(explicit[1].replace(/,/g, ""));
  const contextual = normalized.match(/(?:subtotal|order\s+total|total|amount|bill|cod|cash on delivery|shipping\s+charges?)(?:\s+(?:is|of|for|ka|hai))?\s*(?:[:=]\s*)?([\d,]{2,}(?:\.\d{1,2})?)/i);
  if (!contextual?.[1] || contextual.index === undefined) return undefined;
  const numberStart = contextual.index + contextual[0].lastIndexOf(contextual[1]);
  if (/(?:\bORD|\bORDER)[\s-]*$/i.test(normalized.slice(Math.max(0, numberStart - 10), numberStart))) return undefined;
  return Number(contextual[1].replace(/,/g, ""));
}

export function respond(text: string, ctxOrderId?: string, pendingOrderIntent?: Intent, pendingLanguage?: CustomerLanguage): AgentReply {
  const normalizedText = text.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  const t = normalizedText;
  const language = languageForMessage(text, pendingLanguage);
  const say = (en: string, hi: string, hinglish: string) => language === "hi" ? hi : language === "hinglish" ? hinglish : en;
  const extractedOrderId = extractOrderId(text);
  const orderId = extractedOrderId ?? ctxOrderId;
  const order = orderId ? get_order_details(orderId) : undefined;
  const detectedIntent: Intent = /cancel|cancell|रद्द|कैंसल|कैंसिल|रोकना|band kar/.test(t)
    ? "cancellation"
    : /return|refund|exchange|wapas|वापस|वापसी|लौटा|लौट|रिटर्न|रिफंड/.test(t)
      ? "return"
      : /shipping|ship\s*(?:fee|charge|cost)|shipping\s*(?:charge|cost|fee)|delivery\s*(?:fee|charge|cost)|shipping charges|kitne (?:paise|rupees|rupaye)|delivery charges|शिपिंग|डिलीवरी शुल्क|डिलीवरी चार्ज|शुल्क|कितना\s*(?:है|हैं)?/.test(t)
        ? "shipping"
        : /cod|cash on delivery|cash delivery|cash.*doorstep|कैश ऑन डिलीवरी|डिलीवरी पर भुगतान/.test(t)
          ? "cod"
          : /damaged|defective|damage|kharab|toot|टूटा|खराब|क्षतिग्रस्त/.test(t)
            ? "damage"
            : /where|track|status|deliver|order|kahan|kahaan|kab|pahucha|mila|मेरा|मेरे|कहाँ|कब|डिलीवरी|ऑर्डर/.test(t)
          ? "order_status"
              : /^(?:hi\b|hello\b|hey\b|namaste\b|namaskar\b|नमस्ते|नमस्कार)/.test(t)
                ? "greeting"
                : "general";
  // A reply to an order-ID question inherits the active request even if it contains only an ID.
  const intent: Intent = extractedOrderId && pendingOrderIntent ? pendingOrderIntent : detectedIntent;
  if (/^(?:thanks?(?:\s+(?:so|very)\s+much|\s+a lot)?|thank\s*you(?:\s+(?:so|very)\s+much|\s+a lot)?|thankyou|i appreciate it|much appreciated|धन्यवाद|शुक्रिया|बहुत आभार)(?:\s+(?:aria|there))?$/i.test(normalizedText)) {
    return { text: say("You're welcome! I'm here if you need help with another Aura Skincare order.", "आपका स्वागत है! Aura Skincare के किसी और ऑर्डर में मदद चाहिए हो, तो बताइए।", "You're welcome! Aura Skincare ke kisi aur order mein help chahiye ho, toh bataiye."), intent: "general" };
  }

  if (
    intent === "general" &&
    !/(order|track|cancel|return|refund|delivery|product|shipping|cod|cash|damage)/i.test(t)
  ) {
    if (/\b(book|flight|travel|trip|hotel|weather|restaurant|recipe|sports|news)\b/i.test(t)) {
      return {
        text: say("I'm sorry, I can only help with Aura Skincare orders, including tracking, cancellations, returns, shipping, and payment options.", "माफ़ कीजिए, मैं Aura Skincare के ऑर्डर, डिलीवरी, कैंसलेशन, रिटर्न, शिपिंग और पेमेंट से जुड़ी मदद कर सकती हूँ।", "Sorry, main Aura Skincare orders, tracking, cancellation, returns, shipping aur payment options mein help kar sakti hoon."),
        intent,
      };
    }
    return {
      text: say("Sorry, I didn't quite catch that. Could you repeat your question and share your order ID?", "माफ़ कीजिए, आपकी बात साफ़ सुनाई नहीं दी। क्या आप सवाल फिर से बताकर ऑर्डर ID साझा करेंगे?", "Sorry, aapki baat clear nahi hui. Kya aap sawaal phir se bolkar order ID share karenge?"),
      intent,
    };
  }

  if (intent === "greeting")
    return { text: say("Hi! How can I help with your Aura Skincare order?", "नमस्ते! आपके Aura Skincare ऑर्डर में कैसे मदद करूँ?", "Hi! Aapke Aura Skincare order mein kaise help karoon?"), intent };

  if (intent === "return" && !order && !orderId && /policy|rules|eligib|allowed|नीति|नियम|वापसी की शर्त/i.test(t)) {
    return {
      text: say(
        `Returns are considered within ${RETURN_WINDOW_DAYS} days of delivery for products that are unopened, unused, and in their original packaging. Share your order ID to check its delivery date.`,
        `Delivery के ${RETURN_WINDOW_DAYS} दिनों के अंदर, unopened, unused और original packaging वाले products के return पर विचार किया जाता है। Delivery date check करने के लिए अपना order ID बताएँ।`,
        `Delivery ke ${RETURN_WINDOW_DAYS} din ke andar, unopened, unused aur original packaging wale products ke return par vichaar hota hai. Delivery date check karne ke liye order ID share karein.`,
      ),
      intent,
    };
  }

  if (intent === "return" && !order && !orderId) {
    const elapsedDays = text.match(/\b(\d+)\s*[- ]?days?\b/i)?.[1];
    if (elapsedDays && Number(elapsedDays) > RETURN_WINDOW_DAYS) {
      return {
        text: say(`Based on the ${elapsedDays} days you mentioned, this is outside our ${RETURN_WINDOW_DAYS}-day return window. I can't confirm a return or refund.`, `आपने ${elapsedDays} दिन बताए हैं, जो हमारी ${RETURN_WINDOW_DAYS}-दिन की रिटर्न अवधि से बाहर हैं। मैं रिटर्न या रिफंड की पुष्टि नहीं कर सकती।`, `Aapne ${elapsedDays} din bataye hain, jo hamari ${RETURN_WINDOW_DAYS}-day return window se bahar hain. Main return ya refund confirm nahi kar sakti.`),
        intent,
        resolution: "Escalated",
      };
    }
  }

  if (["order_status", "cancellation", "return", "damage"].includes(intent) && !order) {
    if (orderId) {
      return {
        text: say(`I couldn't find order ${orderId}. Could you check the ID?`, `मुझे ${orderId} वाला ऑर्डर नहीं मिला। क्या आप ID जाँचकर फिर से बताएँगे?`, `${orderId} wala order nahi mila. Kya aap ID check karke dobara bata sakte hain?`),
        intent,
        orderId,
        resolution: "Unresolved",
      };
    }
    return {
      text: say("Could you share your order ID? It starts with ORD, followed by three digits.", "कृपया अपना ऑर्डर ID बताएँ। यह ORD के बाद तीन अंकों का होता है।", "Apna order ID share karenge? Ye ORD ke baad teen digits ka hota hai."),
      intent,
    };
  }

  // Intent implementations using policy functions
  if (intent === "cancellation") {
    const eligible = checkCancellationEligibility(order!.status);
    if (eligible) {
      return {
        text: say(`Your order ${order!.id} is processing and can be cancelled.`, `${order!.id} अभी processing में है, इसलिए इसे cancel किया जा सकता है।`, `${order!.id} abhi processing mein hai, isliye ise cancel kiya ja sakta hai.`),
        intent,
        orderId: order!.id,
        resolution: "Resolved",
      };
    }
    return {
      text: say(`I'm sorry, ${order!.id} is already ${order!.status.toLowerCase()} and can't be cancelled. You may refuse delivery at the doorstep.`, `माफ़ कीजिए, ${order!.id} ${order!.status.toLowerCase()} हो चुका है, इसलिए cancel नहीं हो सकता। आप delivery के समय parcel लेने से मना कर सकते हैं।`, `Sorry, ${order!.id} already ${order!.status.toLowerCase()} hai, isliye cancel nahi ho sakta. Delivery ke waqt aap parcel lene se mana kar sakte hain.`),
      intent,
      orderId: order!.id,
      resolution: "Unresolved",
    };
  }

  if (intent === "return") {
    const result = checkReturnEligibility(order!);
    if (result.eligible) {
      return {
        text: say(`${order!.id} is within the ${RETURN_WINDOW_DAYS}-day window. Returns also require the product to be unopened, unused, and in its original packaging. I can't submit a return request here.`, `${order!.id} ${RETURN_WINDOW_DAYS}-दिन की अवधि के अंदर है। Return के लिए product unopened, unused और original packaging में होना चाहिए। मैं यहाँ return request submit नहीं कर सकती।`, `${order!.id} ${RETURN_WINDOW_DAYS}-day window ke andar hai. Return ke liye product unopened, unused aur original packaging mein hona chahiye. Main yahan return request submit nahi kar sakti.`),
        intent,
        orderId: order!.id,
        resolution: "Resolved",
      };
    }
    const outsideWindow = result.reason?.includes("expired");
    return {
      text: outsideWindow
        ? say(`${order!.id} is outside our ${RETURN_WINDOW_DAYS}-day return window, so I can't confirm return eligibility.`, `${order!.id} हमारी ${RETURN_WINDOW_DAYS}-दिन की return अवधि से बाहर है, इसलिए return eligibility confirm नहीं कर सकती।`, `${order!.id} hamari ${RETURN_WINDOW_DAYS}-day return window se bahar hai, isliye return eligibility confirm nahi kar sakti.`)
        : result.reason === "Delivery date unknown"
          ? say(`I can't verify the delivery date for ${order!.id}, so I can't confirm return eligibility.`, `${order!.id} की delivery date verify नहीं हो पा रही, इसलिए return eligibility confirm नहीं कर सकती।`, `${order!.id} ki delivery date verify nahi ho rahi, isliye return eligibility confirm nahi kar sakti.`)
          : say(`${order!.id} isn't eligible for a return based on the available order details.`, `मौजूदा order details के आधार पर ${order!.id} return के लिए eligible नहीं है।`, `Available order details ke basis par ${order!.id} return ke liye eligible nahi hai.`),
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
        text: say(`${order!.id} meets the recorded damage policy checks. A replacement still needs confirmation by support; no request has been submitted here.`, `${order!.id} के दिए गए details damage policy से मेल खाते हैं। Replacement की पुष्टि support team करेगी; यहाँ कोई request submit नहीं हुई है।`, `${order!.id} ke recorded details damage policy se match karte hain. Replacement support team confirm karegi; yahan koi request submit nahi hui hai.`),
        intent,
        orderId: order!.id,
        resolution: "Resolved",
      };
    }
    return {
      text: say(result.reason === "Order not delivered yet" ? `${order!.id} hasn't been delivered yet, so I can't check a damage claim.` : `${order!.id} doesn't meet the recorded damage policy checks: report within 48 hours of delivery and provide photos.`, result.reason === "Order not delivered yet" ? `${order!.id} अभी deliver नहीं हुआ है, इसलिए damage claim check नहीं कर सकती।` : `${order!.id} के लिए damage report delivery के 48 घंटे के अंदर और photos के साथ होना चाहिए। उपलब्ध details से eligibility confirm नहीं हो रही।`, result.reason === "Order not delivered yet" ? `${order!.id} abhi deliver nahi hua, isliye damage claim check nahi kar sakti.` : `${order!.id} ke liye damage report delivery ke 48 hours ke andar aur photos ke saath honi chahiye. Available details se eligibility confirm nahi ho rahi.`),
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
          text: say(`Your order ${order.id} totals ${formatINR(order.amount)}. The policy doesn't define the shipping fee at exactly ₹499, so I can't confirm it.`, `${order.id} का total ${formatINR(order.amount)} है। ठीक ₹499 पर shipping fee की policy स्पष्ट नहीं है, इसलिए मैं fee confirm नहीं कर सकती।`, `${order.id} ka total ${formatINR(order.amount)} hai. Exactly ₹499 par shipping fee policy clear nahi hai, isliye main fee confirm nahi kar sakti.`),
          intent,
          orderId: order.id,
          resolution: "Escalated",
        };
      }
      const feeText = fee === 0 ? say("Your order qualifies for free delivery.", "आपके ऑर्डर पर free delivery है।", "Aapke order par free delivery hai.") : say(`Your shipping fee is ${formatINR(fee)}.`, `आपकी shipping fee ${formatINR(fee)} है।`, `Aapki shipping fee ${formatINR(fee)} hai.`);
      return {
        text: say(`${feeText} Standard delivery takes 3–5 business days.`, `${feeText} Standard delivery में 3–5 business days लगते हैं।`, `${feeText} Standard delivery mein 3–5 business days lagte hain.`),
        intent,
        orderId: order.id,
        resolution: "Resolved",
      };
    }

    // Extract subtotal amount from text (₹ or Rs)
    const subtotal = extractAmount(text) ?? null;
    if (subtotal === null) {
      // No specific amount — return the general shipping policy overview
      return {
        text: say("Orders above ₹499 qualify for free delivery. Orders below ₹499 have a ₹50 shipping fee. Standard delivery takes 3–5 business days.", "₹499 से ज़्यादा के ऑर्डर पर free delivery है। ₹499 से कम पर ₹50 shipping fee है। Standard delivery में 3–5 business days लगते हैं।", "₹499 se zyada ke orders par free delivery hai. ₹499 se kam par ₹50 shipping fee hai. Standard delivery mein 3–5 business days lagte hain."),
        intent,
        resolution: "Resolved",
      };
    }
    const fee = calculateShippingFee(subtotal);
    if (fee === null) {
      return {
        text: say(`The shipping fee for exactly ₹499 isn't defined in the policy. Please confirm whether your subtotal is above or below ₹499.`, `ठीक ₹499 के subtotal पर shipping fee policy में तय नहीं है। कृपया confirm करें कि subtotal ₹499 से ज़्यादा है या कम।`, `Exactly ₹499 subtotal par shipping fee policy mein defined nahi hai. Please confirm karein subtotal ₹499 se zyada hai ya kam.`),
        intent,
      };
    }
    if (fee === 0) {
      return {
      text: say("Your order qualifies for free delivery. Standard delivery takes 3–5 business days.", "आपके ऑर्डर पर free delivery है। Standard delivery में 3–5 business days लगते हैं।", "Aapke order par free delivery hai. Standard delivery mein 3–5 business days lagte hain."),
        intent,
        resolution: "Resolved",
      };
    }
    return {
      text: say(`Your shipping fee is ${formatINR(fee)}. Standard delivery takes 3–5 business days.`, `आपकी shipping fee ${formatINR(fee)} है। Standard delivery में 3–5 business days लगते हैं।`, `Aapki shipping fee ${formatINR(fee)} hai. Standard delivery mein 3–5 business days lagte hain.`),
      intent,
      resolution: "Resolved",
    };
  }

  if (intent === "cod") {
    const total = extractAmount(text) ?? null;
    if (total === null) {
      return { text: say("What is your order total? COD is available on orders up to ₹2,500.", "COD eligibility check करने के लिए कृपया order total बताएँ। COD ₹2,500 तक के ऑर्डर पर उपलब्ध है।", "COD eligibility check karne ke liye order total batayein. COD ₹2,500 tak ke orders par available hai."), intent };
    }
    const eligible = checkCODEligibility(total);
    if (eligible) {
      return {
        text: say(`${formatINR(total)} orders are eligible for Cash on Delivery. You can pay by cash or UPI at the doorstep.`, `${formatINR(total)} तक के ऑर्डर पर Cash on Delivery उपलब्ध है। आप doorstep पर cash या UPI से pay कर सकते हैं।`, `${formatINR(total)} ke orders Cash on Delivery ke liye eligible hain. Doorstep par cash ya UPI se pay kar sakte hain.`),
        intent,
        resolution: "Resolved",
      };
    }
    return {
      text: say(`${formatINR(total)} is above the ₹2,500 COD limit. Please choose another payment method.`, `${formatINR(total)} COD की ₹2,500 सीमा से ज़्यादा है। कृपया दूसरा payment method चुनें।`, `${formatINR(total)} COD ki ₹2,500 limit se zyada hai. Please koi aur payment method chunein.`),
      intent,
      resolution: "Unresolved",
    };
  }

  // Default order status handling
  const extra =
    order!.status === "Out for Delivery"
      ? say(`with ${order!.courier}, tracking ${order!.trackingId}. Expected by 6 PM today.`, `${order!.courier} के साथ है, tracking ID ${order!.trackingId}। आज 6 PM तक पहुँचने की उम्मीद है।`, `${order!.courier} ke saath hai, tracking ID ${order!.trackingId}. Aaj 6 PM tak expected hai.`)
      : order!.status === "Delivered"
        ? say(`It was delivered by ${order!.courier} ${order!.deliveredDaysAgo} days ago.`, `यह ${order!.courier} से ${order!.deliveredDaysAgo} दिन पहले deliver हुआ था।`, `Ye ${order!.courier} se ${order!.deliveredDaysAgo} din pehle deliver hua tha.`)
        : say("It's being packed and should ship within 24 hours.", "आपका ऑर्डर pack हो रहा है और 24 घंटे के अंदर ship होने की उम्मीद है।", "Aapka order pack ho raha hai aur 24 hours ke andar ship hone ki umeed hai.");
  return {
    text: say(`${order!.id}, your ${order!.product}, is ${order!.status.toLowerCase()} ${extra}`, `${order!.id}: आपका ${order!.product} ${order!.status.toLowerCase()} है। ${extra}`, `${order!.id}: aapka ${order!.product} ${order!.status.toLowerCase()} hai. ${extra}`),
    intent: "order_status",
    orderId: order!.id,
    resolution: "Resolved",
  };
}
