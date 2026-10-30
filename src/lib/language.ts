export type CustomerLanguage = "en" | "hi" | "hinglish";

const DEVANAGARI = /[\u0900-\u097f]/;
const HINGLISH_MARKERS = /\b(?:mera|mere|meri|hamara|humara|mujhe|mujh|aap|kahan|kahaan|kab|kitna|kitne|kitni|hai|hain|ho|hoga|hogi|kya|kyun|kaise|aaya|aayi|aaye|wala|wali|ko|ka|ki|ke|nahi|nahin|chahiye|karna|karo|kare|kripya|shukriya|dhanyavaad|sasta|mehenga|milega|milega|batao|bataiye)\b/i;

/** Detect response language from this customer turn; no remote translation service is used. */
export function detectCustomerLanguage(text: string): CustomerLanguage {
  if (DEVANAGARI.test(text)) return "hi";
  if (HINGLISH_MARKERS.test(text)) return "hinglish";
  return "en";
}

export function isOrderIdOnly(text: string): boolean {
  const value = text.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  return /^(?:(?:ord|order|ऑर्डर)(?:\s*(?:number|no\.?|id))?\s*[-:# ]*)?(?:\d{3,}|(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|ek|shunya|do|teen|char|chaar|paanch|panch|chhe|cheh|saat|sat|aath|aat|nau|शून्य|जीरो|एक|दो|तीन|चार|पाँच|पांच|छह|छे|सात|आठ|नौ)\s*){3,})$/i.test(value);
}

export function languageForMessage(text: string, pendingLanguage?: CustomerLanguage): CustomerLanguage {
  return isOrderIdOnly(text) && pendingLanguage ? pendingLanguage : detectCustomerLanguage(text);
}

export function selectSpeechVoice<T extends { lang: string }>(voices: T[], language: CustomerLanguage): T | undefined {
  if (language === "hi" || language === "hinglish") return voices.find((voice) => /^hi(-|_)/i.test(voice.lang));
  return voices.find((voice) => /^en-IN$/i.test(voice.lang)) ?? voices.find((voice) => /^en(-|_)/i.test(voice.lang));
}

/** Normalize Devanagari digits so order IDs remain searchable without changing other text. */
export function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)));
}
