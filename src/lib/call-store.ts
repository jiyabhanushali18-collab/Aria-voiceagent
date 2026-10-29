import { useSyncExternalStore } from "react";
import { SAMPLE_HISTORY, type CallRecord } from "./calls";

// In-memory call store (preview). Swap for API calls to your backend later.
let calls: CallRecord[] = SAMPLE_HISTORY;
const subs = new Set<() => void>();
export const addCall = (c: CallRecord) => { calls = [c, ...calls]; subs.forEach((f) => f()); };
export const useCalls = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => calls, () => calls);
