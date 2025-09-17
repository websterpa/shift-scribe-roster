import { useCallback, useRef } from "react";

export function useDebouncedCallback<T extends any[]>(
  fn: (...args: T) => void | Promise<void>,
  delayMs = 600
) {
  const timer = useRef<number | undefined>(undefined);
  const saved = useRef(fn);
  saved.current = fn;

  return useCallback((...args: T) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saved.current(...args);
    }, delayMs);
  }, [delayMs]);
}