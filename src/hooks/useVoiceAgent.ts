import { useCallback, useEffect, useRef, useState } from "react";
import { respond, type Intent, type Resolution } from "@/lib/orders";
import type { CallRecord, Message } from "@/lib/calls";

export type AgentStatus = "idle" | "listening" | "processing" | "speaking" | "error";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;
const GREETING = "Hi, I'm Aria. How can I help you with your Aura Skincare order today?";

export function useVoiceAgent(onCallEnd: (r: CallRecord) => void) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [active, setActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState({ recognition: true, synthesis: true });
  const recRef = useRef<SR>(null);
  const activeRef = useRef(false);
  const startingRef = useRef(false);
  const speakingRef = useRef(false);
  const processingRef = useRef(false);
  const startedRef = useRef(false);
  const finalTextRef = useRef("");
  const emptyCountRef = useRef(0);
  const endSpeechTimerRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const msgsRef = useRef<Message[]>([]);
  const ctxRef = useRef<{ orderId?: string | undefined; intent?: Intent | undefined; pendingOrderIntent?: Intent | undefined; resolution?: Resolution | undefined }>({});
  const handleRef = useRef<(text: string, voice: boolean) => void>(() => undefined);

  useEffect(() => {
    const w = window as SR;
    setSupported({ recognition: !!(w.SpeechRecognition || w.webkitSpeechRecognition), synthesis: "speechSynthesis" in window });
  }, []);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  const push = useCallback((speaker: Message["speaker"], text: string) => {
    const m = { id: crypto.randomUUID(), speaker, text, at: Date.now() };
    msgsRef.current = [...msgsRef.current, m];
    setMessages(msgsRef.current);
  }, []);

  const listen = useCallback(() => {
    if (!activeRef.current || !recRef.current || speakingRef.current || processingRef.current || startedRef.current) return;
    finalTextRef.current = "";
    setRecognizedText("");
    if (endSpeechTimerRef.current) clearTimeout(endSpeechTimerRef.current);
    endSpeechTimerRef.current = null;
    try {
      startedRef.current = true;
      recRef.current.start();
    } catch (e) {
      startedRef.current = false;
      console.warn("[voice] recognition start failed", e instanceof Error ? e.name : "unknown");
      setStatus("error");
      setError("Could not start speech recognition. Check microphone access or use text input.");
    }
  }, []);

  const speak = useCallback((text: string) => {
    push("aria", text);
    if (!activeRef.current || !("speechSynthesis" in window)) { if (activeRef.current) listen(); return; }
    speakingRef.current = true;
    setStatus("speaking");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 1.05;
    const finish = () => {
      if (!speakingRef.current) return;
      speakingRef.current = false;
      if (activeRef.current) listen();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [listen, push]);

  const handleUtterance = useCallback((text: string, voice = false) => {
    const clean = text.trim();
    if (!clean || processingRef.current) return;
    processingRef.current = true;
    if (activeRef.current && recRef.current && startedRef.current) {
      try { recRef.current.abort(); } catch { /* recognition already ended */ }
    }
    push("customer", clean);
    setRecognizedText(clean);
    setStatus("processing");
    // Let the transcript and end-of-speech event settle before dispatching one request.
    window.setTimeout(() => {
      if (!activeRef.current && voice) { processingRef.current = false; return; }
      const previous = ctxRef.current;
      const reply = respond(clean, previous.orderId, previous.pendingOrderIntent);
      ctxRef.current = {
        orderId: reply.orderId ?? previous.orderId,
        intent: reply.intent && reply.intent !== "general" && reply.intent !== "greeting" ? reply.intent : previous.intent ?? reply.intent,
        pendingOrderIntent:
          /order id|order number|share your order/i.test(reply.text) || (reply.resolution === "Unresolved" && !!reply.orderId)
            ? reply.intent && reply.intent !== "greeting" && reply.intent !== "general"
              ? reply.intent
              : previous.pendingOrderIntent ?? "order_status"
            : undefined,
        resolution: reply.resolution ?? previous.resolution,
      };
      processingRef.current = false;
      if (voice || activeRef.current) speak(reply.text);
      else { push("aria", reply.text); setStatus("idle"); }
    }, 150);
  }, [push, speak]);
  handleRef.current = handleUtterance;

  const end = useCallback(() => {
    if (!activeRef.current && !startingRef.current) return;
    activeRef.current = false;
    startingRef.current = false;
    processingRef.current = false;
    speakingRef.current = false;
    setActive(false);
    setStatus("idle");
    setRecognizedText("");
    try { recRef.current?.abort(); } catch { /* noop */ }
    recRef.current = null;
    window.speechSynthesis?.cancel();
    const dur = Math.floor((Date.now() - startRef.current) / 1000);
    const c = ctxRef.current;
    const lastAria = [...msgsRef.current].reverse().find((m) => m.speaker === "aria");
    onCallEnd({ id: `c-${Date.now().toString(36)}`, startedAt: startRef.current, durationSec: dur, intent: c.intent ?? "unknown", orderId: c.orderId, resolution: c.resolution ?? "Unresolved", summary: lastAria?.text ?? "Call ended before the customer's request was identified.", transcript: msgsRef.current });
  }, [onCallEnd]);

  const start = useCallback((orderHint?: string) => {
    if (activeRef.current || startingRef.current) return;
    setError(null);
    const w = window as SR;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) { setStatus("error"); setError("Speech recognition isn't supported in this browser. You can type a message instead."); return; }
    const secureLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (!window.isSecureContext && !secureLocalhost) {
      setError("Microphone access requires a secure page. Open this app over HTTPS or localhost, or type a message instead.");
      setStatus("error");
      return;
    }
    startingRef.current = true;
    setStatus("idle");
    const rec = new Rec();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      startedRef.current = true;
      setStatus("listening");
      console.debug("[voice] recognition started");
    };
    rec.onspeechstart = () => {
      if (endSpeechTimerRef.current) clearTimeout(endSpeechTimerRef.current);
      endSpeechTimerRef.current = null;
      console.debug("[voice] customer speech started");
    };
    rec.onspeechend = () => {
      console.debug("[voice] customer speech ended; waiting for final recognition result");
      if (endSpeechTimerRef.current) clearTimeout(endSpeechTimerRef.current);
      endSpeechTimerRef.current = window.setTimeout(() => {
        endSpeechTimerRef.current = null;
        if (activeRef.current && startedRef.current && !speakingRef.current && !processingRef.current) {
          try { rec.stop(); } catch (e) { console.warn("[voice] recognition stop failed", e instanceof Error ? e.name : "unknown"); }
        }
      }, 2500);
    };
    rec.onresult = (ev: SR) => {
      if (!activeRef.current || speakingRef.current || processingRef.current) return;
      let final = "";
      let interim = "";
      for (let i = ev.resultIndex ?? 0; i < ev.results.length; i++) {
        const result = ev.results[i];
        const transcript = result?.[0]?.transcript;
        if (typeof transcript !== "string") continue;
        if (result.isFinal) final += `${transcript} `;
        else interim += transcript;
      }
      if (final.trim()) {
        finalTextRef.current = `${finalTextRef.current} ${final}`.trim();
        console.debug("[voice] final speech result received");
        // Some implementations omit speechend; a final result plus quiet is our fallback.
        if (endSpeechTimerRef.current) clearTimeout(endSpeechTimerRef.current);
        endSpeechTimerRef.current = window.setTimeout(() => {
          endSpeechTimerRef.current = null;
          if (activeRef.current && startedRef.current && !speakingRef.current && !processingRef.current) {
            try { rec.stop(); } catch (e) { console.warn("[voice] recognition stop failed", e instanceof Error ? e.name : "unknown"); }
          }
        }, 2500);
      }
      setRecognizedText([finalTextRef.current, interim].filter(Boolean).join(" "));
      if (interim.trim()) console.debug("[voice] interim speech result received");
    };
    rec.onerror = (ev: SR) => {
      console.warn("[voice] recognition error", ev.error ?? "unknown");
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setError("Microphone permission was denied. You can type a message instead.");
        setStatus("error");
        activeRef.current = false;
        startingRef.current = false;
        setActive(false);
      } else if (ev.error === "audio-capture") {
        setError("Microphone unavailable. Check the device or switch to text input.");
        setStatus("error");
        activeRef.current = false;
        setActive(false);
      }
      // no-speech and network interruptions are handled by onend with a generous retry.
    };
    rec.onend = () => {
      startedRef.current = false;
      if (endSpeechTimerRef.current) clearTimeout(endSpeechTimerRef.current);
      endSpeechTimerRef.current = null;
      console.debug("[voice] recognition session ended");
      if (!activeRef.current) return;
      if (speakingRef.current || processingRef.current) return;
      const transcript = finalTextRef.current.trim();
      if (transcript) {
        emptyCountRef.current = 0;
        finalTextRef.current = "";
        handleRef.current(transcript, true);
        return;
      }
      emptyCountRef.current += 1;
      console.debug("[voice] recognition ended without a final transcript", { consecutiveEmptySessions: emptyCountRef.current });
      if (emptyCountRef.current >= 3) {
        setError("Voice input is having trouble. You can continue by typing a message.");
        setStatus("error");
        emptyCountRef.current = 0;
      } else setStatus("listening");
      window.setTimeout(() => { if (activeRef.current && !speakingRef.current && !processingRef.current) listen(); }, 900);
    };
    recRef.current = rec;
    msgsRef.current = [];
    setMessages([]);
    finalTextRef.current = "";
    setRecognizedText("");
    ctxRef.current = { orderId: orderHint };
    startRef.current = Date.now();
    setElapsed(0);
    activeRef.current = true;
    startingRef.current = false;
    setActive(true);
    // Let Aria greet first, then open recognition so the microphone does not capture her voice.
    speak(GREETING);
  }, [listen, speak]);

  useEffect(() => () => {
    activeRef.current = false;
    if (endSpeechTimerRef.current) clearTimeout(endSpeechTimerRef.current);
    endSpeechTimerRef.current = null;
    try { if (recRef.current) { recRef.current.onresult = null; recRef.current.onerror = null; recRef.current.onend = null; recRef.current.onspeechstart = null; recRef.current.onspeechend = null; recRef.current.abort(); } } catch { /* noop */ }
    recRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  const clearMessages = useCallback(() => { msgsRef.current = []; setMessages([]); }, []);
  return { status, active, messages, error, recognizedText, elapsed, supported, start, end, sendText: (text: string) => handleUtterance(text, false), clearMessages, clearError: () => setError(null) };
}
