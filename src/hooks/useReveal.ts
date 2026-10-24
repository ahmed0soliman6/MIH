import { useEffect, useRef } from 'react';

/**
 * useReveal
 * Observes the element and adds the 'is-in' CSS class when it scrolls into view,
 * then unobserves it. Respects prefers-reduced-motion by adding 'is-in' immediately.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return ref;
}
