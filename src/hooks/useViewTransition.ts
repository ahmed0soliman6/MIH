import { useCallback } from 'react';
import { flushSync } from 'react-dom';

/**
 * useViewTransition
 * Calls document.startViewTransition if supported and user hasn't reduced motion,
 * otherwise executes the state update synchronously.
 */
export function useViewTransition() {
  const startTransition = useCallback((callback: () => void) => {
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = (typeof document !== 'undefined' ? document : null) as unknown as {
      startViewTransition?: (cb: () => void) => void;
    } | null;

    if (!isReduced && doc && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        flushSync(callback);
      });
    } else {
      callback();
    }
  }, []);

  return startTransition;
}
