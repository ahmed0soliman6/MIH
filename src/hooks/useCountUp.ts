import { useState, useEffect } from 'react';

interface CountUpOptions {
  duration?: number;
  start?: number;
}

/**
 * useCountUp
 * Smoothly animates a number from start to target using requestAnimationFrame.
 * If prefers-reduced-motion is enabled, immediately displays the target number.
 */
export function useCountUp(target: number, options: CountUpOptions = {}) {
  const { duration = 600, start = 0 } = options;
  const [count, setCount] = useState<number>(start);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }

    let startTime: number | null = null;
    let animFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (target - start) * ease);

      setCount(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [target, duration, start]);

  return count;
}
