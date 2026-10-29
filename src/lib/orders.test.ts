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

  it("asks the customer to verify an unknown order ID", () => {
    const reply = respond("Can you track order ORD-999?");

    expect(reply.text).toContain("couldn't locate an order with ID ORD-999");
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
      expect(reply.text).toContain("can't guarantee a return or refund");
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
    expect(reply.text).toContain("can't guarantee a return or refund");
    expect(reply.resolution).toBe("Escalated");
  });

  it("politely declines unrelated requests", () => {
    const reply = respond("Can you book me a flight to Goa?");

    expect(reply.text).toContain("I can only help with Aura Skincare");
  });

  it("understands a spoken greeting", () => {
    const reply = respond("Hi");
    expect(reply.intent).toBe("greeting");
    expect(reply.text).toContain("share your order ID");
  });

  it("responds naturally to thanks instead of asking the customer to repeat", () => {
    const reply = respond("Thank you");
    expect(reply.text).toContain("You're welcome");
    expect(reply.text).not.toContain("repeat");
    expect(respond("thankyou").text).toContain("You're welcome");
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
    expect(reply.text).toContain("boundary");
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
    expect(reply.text).toContain("boundary");
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
