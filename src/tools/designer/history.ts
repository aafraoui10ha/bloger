// Undo/redo for design documents. Consecutive changes that share a merge key
// (typing in one field, one drag, one slider) collapse into a single undo step.

export type History<T> = { past: T[]; present: T; future: T[]; mergeKey: string | null; mergedAt: number };

export const HISTORY_LIMIT = 100;
const MERGE_WINDOW_MS = 1200;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], mergeKey: null, mergedAt: 0 };
}

export function pushHistory<T>(h: History<T>, next: T, mergeKey: string | null = null, now = Date.now()): History<T> {
  if (Object.is(next, h.present)) return h;
  if (mergeKey && h.mergeKey === mergeKey && now - h.mergedAt < MERGE_WINDOW_MS) {
    return { ...h, present: next, future: [], mergedAt: now };
  }
  const past = [...h.past, h.present];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, present: next, future: [], mergeKey, mergedAt: now };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const prev = h.past[h.past.length - 1]!;
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], mergeKey: null, mergedAt: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next!, future: rest, mergeKey: null, mergedAt: 0 };
}

/** Replaces the present without an undo step (e.g. loading a project). */
export function resetHistory<T>(present: T): History<T> {
  return createHistory(present);
}
