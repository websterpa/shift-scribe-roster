type Handler = (...args: any[]) => void;

const listeners = new Map<string, Set<Handler>>();

export function on(event: string, h: Handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(h);
  return () => off(event, h);
}

export function off(event: string, h: Handler) {
  listeners.get(event)?.delete(h);
}

export function emit(event: string, ...args: any[]) {
  const set = listeners.get(event);
  if (!set) return;
  for (const h of Array.from(set)) {
    try { h(...args); } catch {}
  }
}