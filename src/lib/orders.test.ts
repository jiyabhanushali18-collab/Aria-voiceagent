import { describe, expect, it } from "vitest";
import { lookupOrder, respond } from "./orders";
import { calculateShippingFee } from "./policy";

describe("respond", () => {
  it("preserves order tracking for known orders", () => {
    const reply = respond("Where is my order ORD-101?");

    expect(reply.orderId).toBe("ORD-101");
    expect(reply.text).toContain("BlueDart");
    expect(reply.resolution).toBe("Resolved");
  });

  it("normalizes an unambiguous spoken order ID and answers the pending order status request", () => {
    const reply = respond("ORD one zero one", undefined, "order_status");
    expect(reply.orderId).toBe("ORD-101");
    expect(reply.text).toContain("BlueDart");
    expect(reply.resolution).toBe("Resolved");
  });

  it("uses order status as the intent after the opening order ID prompt", () => {
    const prompt = respond("hello");
    const reply = respond("ORD one zero one", undefined, prompt.intent === "greeting" ? "order_status" : prompt.intent);
    expect(reply.orderId).toBe("ORD-101");
    expect(reply.text).toContain("BlueDart");
  });

  it("keeps the requested intent when an order ID is spoken by itself", () => {
    const prompt = respond("Can I cancel my order?");
    const reply = respond("ORD one zero three", undefined, prompt.intent);
    expect(reply.orderId).toBe("ORD-103");
    expect(reply.text).toContain("can be cancelled");
  });

  it("understands English, Hindi, and Hinglish order tracking and spoken IDs", () => {
    const english = respond("Where is my order ORD-101?");
    const hindi = respond("मेरा ऑर्डर ORD-101 कहाँ है?");
    const hinglish = respond("Mera order ORD one zero one kahan hai?");
    const hindiSpokenId = respond("मेरा ऑर्डर ऑर्डर एक शून्य एक कहाँ है?");

    for (const [label, reply] of [["en", english], ["hi", hindi], ["hinglish", hinglish], ["spoken-hi", hindiSpokenId]] as const) {
      expect(reply.orderId, label).toBe("ORD-101");
      expect(reply.text, label).toContain("BlueDart");
    }
    expect(hindi.text).toMatch(/[\u0900-\u097f]/);
    expect(hinglish.text).toContain("aapka");
  });

  it("understands mixed-language cancellation and keeps the fixture policy", () => {
    const prompt = respond("Can I cancel mera order?");
    const reply = respond("ORD one zero one", undefined, prompt.intent, "hinglish");
    expect(prompt.text).toContain("order ID");
    expect(reply.orderId).toBe("ORD-101");
      expect(reply.text).toContain("cancel nahi ho sakta");
      expect(reply.text).toContain("mana kar sakte hain");
  });

  it("returns localized shipping policy and preserves the ₹499 boundary", () => {
    const en = respond("What are the shipping charges?");
    const hi = respond("शिपिंग शुल्क कितना है?");
    const mix = respond("Shipping charges kitne hain?");
    const boundary = respond("Shipping subtotal ₹499");
    expect(en.text).toContain("₹50");
    expect(hi.text).toMatch(/[\u0900-\u097f]/);
    expect(mix.text).toContain("₹50");
    expect(boundary.text).toContain("isn't defined");
  });

  it("understands Hinglish COD and damaged-product requests without inventing outcomes", () => {
    expect(respond("COD available hai kya?").text).toContain("order total");
    expect(respond("COD total ₹3000").text).toContain("₹2,500 COD limit");
    const damage = respond("Mera product damaged aaya hai");
    expect(damage.intent).toBe("damage");
    expect(damage.text).toContain("order ID");
  });

  it("answers return-policy questions with the condition and window", () => {
    const reply = respond("What is your return policy?");
    expect(reply.text).toContain("7 days");
    expect(reply.text).toContain("unopened, unused");
    expect(reply.text).not.toContain("raised a return request");
  });

  it("keeps cancellation and return eligibility based on order status and delivery age in Hindi", () => {
    const cancel = respond("क्या मैं ORD-101 कैंसल कर सकती हूँ?");
    const returned = respond("क्या मैं ORD-102 return कर सकती हूँ?");
    expect(cancel.orderId).toBe("ORD-101");
    expect(cancel.text).toContain("cancel नहीं हो सकता");
    expect(cancel.text).toContain("मना कर");
    expect(returned.orderId).toBe("ORD-102");
    expect(returned.text).toContain("7-दिन");
    expect(returned.text).toContain("बाहर है");
  });

  it("keeps damage replacement and COD policy checks in Hindi and Hinglish", () => {
    const damageHi = respond("मेरा product खराब आया है ORD-102");
    const damageMix = respond("Mera product damaged aaya hai ORD-102");
    const codHi = respond("कैश ऑन डिलीवरी ₹3000 में मिलेगी?");
    const codMix = respond("COD total ₹3000 hai kya?");
    const codBoundary = respond("COD total ₹2,500");
    const codOver = respond("COD total ₹2,501");
    expect(damageHi.text).toContain("48 घंटे");
    expect(damageMix.text).toContain("48 hours");
    expect(codHi.text).toContain("₹2,500 सीमा");
    expect(codMix.text).toContain("₹2,500 limit");
    expect(codBoundary.text).toContain("eligible");
    expect(codOver.text).toContain("above the ₹2,500 COD limit");
    expect(damageHi.text).not.toContain("process");
    expect(damageMix.text).not.toContain("process");
  });

  it("asks the customer to verify an unknown order ID", () => {
    const reply = respond("Can you track order ORD-999?");

    expect(reply.text).toContain("couldn't find order ORD-999");
    expect(reply.orderId).toBe("ORD-999");
    expect(reply.resolution).toBe("Unresolved");
  });

  it("does not promise a return or refund outside the return window", () => {
    const order = lookupOrder("ORD-102");
    if (!order) throw new Error("Expected fixture order ORD-102");
    const deliveredDaysAgo = order.deliveredDaysAgo;

    try {
      order.deliveredDaysAgo = 20;
      const reply = respond("I bought this 20 days ago and opened it. Can I return ORD-102?");

      expect(reply.text).toContain("outside our 7-day return window");
      expect(reply.text).toContain("can't confirm return eligibility");
      expect(reply.text).not.toContain("I've raised a return request");
      expect(reply.resolution).toBe("Escalated");
    } finally {
      if (deliveredDaysAgo === undefined) delete order.deliveredDaysAgo;
      else order.deliveredDaysAgo = deliveredDaysAgo;
    }
  });

  it("enforces the return window when the customer gives an age but no order ID", () => {
    const reply = respond("I bought this 20 days ago and have opened it. Can I return it?");

    expect(reply.text).toContain("outside our 7-day return window");
    expect(reply.text).toContain("can't confirm a return or refund");
    expect(reply.resolution).toBe("Escalated");
  });

  it("politely declines unrelated requests", () => {
    const reply = respond("Can you book me a flight to Goa?");

    expect(reply.text).toContain("I can only help with Aura Skincare");
  });

  it("understands a spoken greeting", () => {
    for (const phrase of ["Hi", "Hi, Aria", "Hello there", "Hey!"]) {
      const reply = respond(phrase);
      expect(reply.intent).toBe("greeting");
      expect(reply.text).toContain("How can I help");
    }
  });

  it("responds naturally to thanks instead of asking the customer to repeat", () => {
    for (const phrase of ["Thank you", "thankyou", "Thank you, Aria", "Thanks so much", "Thanks a lot"]) {
      const reply = respond(phrase);
      expect(reply.text, phrase).toContain("You're welcome");
      expect(reply.text).not.toContain("repeat");
    }
  });

  it("asks the customer to repeat unclear input", () => {
    const reply = respond("asdfgh");

    expect(reply.text).toContain("didn't quite catch that");
    expect(reply.text).toContain("repeat your question");
  });
});

describe("shipping policy", () => {
  it("returns general shipping policy when no amount is given", () => {
    const reply = respond("What are the shipping charges?");

    expect(reply.intent).toBe("shipping");
    expect(reply.text).toContain("above ₹499");
    expect(reply.text).toContain("free delivery");
    expect(reply.text).toContain("below ₹499");
    expect(reply.text).toContain("₹50");
    expect(reply.text).toContain("3–5 business days");
    expect(reply.resolution).toBe("Resolved");
  });

  it("returns ₹50 shipping fee for ₹400 subtotal", () => {
    const reply = respond("What is shipping for ₹400?");

    expect(reply.intent).toBe("shipping");
    expect(reply.text).toContain("₹50");
    expect(reply.text).toContain("3–5 business days");
    expect(reply.resolution).toBe("Resolved");
  });

  it("returns free delivery for ₹700 subtotal", () => {
    const reply = respond("What is shipping for ₹700?");

    expect(reply.intent).toBe("shipping");
    expect(reply.text).toContain("free delivery");
    expect(reply.text).toContain("3–5 business days");
    expect(reply.resolution).toBe("Resolved");
  });

  it("requests clarification for exactly ₹499 subtotal", () => {
    const reply = respond("What is shipping for ₹499?");

    expect(reply.intent).toBe("shipping");
    expect(reply.text).toContain("499");
    expect(reply.text).toContain("isn't defined");
    expect(reply.resolution).toBeUndefined();
  });

  it("uses verified order subtotal when an order is referenced with shipping query", () => {
    // ORD-101 has amount 699 (above 499) => free delivery
    const reply = respond("What is the shipping for order ORD-101?");

    expect(reply.intent).toBe("shipping");
    expect(reply.orderId).toBe("ORD-101");
    expect(reply.text).toContain("free delivery");
    expect(reply.resolution).toBe("Resolved");
  });

  it("escalates when order subtotal is exactly ₹499", () => {
    // ORD-102 has amount 499
    const reply = respond("What is the shipping for order ORD-102?");

    expect(reply.intent).toBe("shipping");
    expect(reply.orderId).toBe("ORD-102");
    expect(reply.text).toContain("499");
    expect(reply.text).toContain("doesn't define the shipping fee");
    expect(reply.resolution).toBe("Escalated");
  });
});

describe("calculateShippingFee", () => {
  it("returns 0 for subtotals above ₹499", () => {
    expect(calculateShippingFee(500)).toBe(0);
    expect(calculateShippingFee(700)).toBe(0);
    expect(calculateShippingFee(1000)).toBe(0);
  });

  it("returns 50 for subtotals below ₹499", () => {
    expect(calculateShippingFee(400)).toBe(50);
    expect(calculateShippingFee(100)).toBe(50);
    expect(calculateShippingFee(498)).toBe(50);
  });

  it("returns null for exactly ₹499", () => {
    expect(calculateShippingFee(499)).toBeNull();
  });
});
