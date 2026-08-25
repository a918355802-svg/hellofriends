import { useEffect, useRef } from 'react';
import { FEED } from '@/config/brand';

/**
 * Fires `onLoadMore` when the sentinel element scrolls into view.
 * IntersectionObserver keeps this off the scroll thread, which matters on
 * low-end Android devices.
 */
export function useInfiniteScroll<T extends Element>(
  onLoadMore: () => void,
  options: { enabled: boolean; rootMargin?: string },
) {
  const sentinelRef = useRef<T | null>(null);
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  const { enabled, rootMargin = FEED.infiniteScrollRootMargin } = options;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callbackRef.current();
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
