import { describe, expect, it } from "vitest";
import { detectCustomerLanguage, isOrderIdOnly, languageForMessage, selectSpeechVoice } from "./language";

describe("customer language detection", () => {
  it("detects English, Hindi, and Hinglish from a customer turn", () => {
    expect(detectCustomerLanguage("Where is my order?")).toBe("en");
    expect(detectCustomerLanguage("मेरा ऑर्डर कहाँ है?")).toBe("hi");
    expect(detectCustomerLanguage("Mera order kahan hai?")).toBe("hinglish");
  });

  it("carries the pending language through an order-ID-only answer", () => {
    expect(isOrderIdOnly("ORD one zero one")).toBe(true);
    expect(languageForMessage("ORD one zero one", "hinglish")).toBe("hinglish");
    expect(languageForMessage("Where is my order?", "hi")).toBe("en");
  });

  it("selects a Hindi voice only when one exists and falls back to a text response otherwise", () => {
    const voices = [{ lang: "en-US" }, { lang: "en-IN" }, { lang: "hi-IN" }];
    expect(selectSpeechVoice(voices, "en")).toEqual({ lang: "en-IN" });
    expect(selectSpeechVoice(voices, "hi")).toEqual({ lang: "hi-IN" });
    expect(selectSpeechVoice(voices.slice(0, 2), "hinglish")).toBeUndefined();
  });
});
