import { useEffect, useRef, useCallback } from "react";

const POLLING_INTERVAL = 3000;
const BACKOFF_INTERVAL = 10000;
const MAX_ERRORS = 3;

interface UsePollingOptions {
  enabled?: boolean;
  interval?: number;
}

export function usePolling(
  fn: () => Promise<void>,
  deps: unknown[],
  opts: UsePollingOptions = {}
) {
  const { enabled = true, interval = POLLING_INTERVAL } = opts;
  const errorCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunning = useRef(false);

  const tick = useCallback(async () => {
    if (!enabled || isRunning.current) return;
    isRunning.current = true;
    try {
      await fn();
      errorCount.current = 0;
    } catch {
      errorCount.current++;
    } finally {
      isRunning.current = false;
      const nextInterval = errorCount.current >= MAX_ERRORS ? BACKOFF_INTERVAL : interval;
      timerRef.current = setTimeout(tick, nextInterval);
    }
  }, [enabled, interval, ...deps]); // eslint-disable-line

  useEffect(() => {
    if (!enabled) return;

    // Pause saat tab tidak aktif
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
      } else {
        timerRef.current = setTimeout(tick, 0);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    timerRef.current = setTimeout(tick, 0);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tick, enabled]);
}
