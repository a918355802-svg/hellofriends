import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Above-the-fold images skip lazy loading so LCP is not delayed. */
  priority?: boolean;
  fallbackName?: string;
  sizes?: string;
}

/**
 * Image with a skeleton while it loads and a readable initials tile if it
 * fails.
 *
 * Partner photos are stored inline as `data:` URLs, which means the bytes have
 * already arrived with the Firestore document — there is no request to defer.
 * Lazy-loading those would only delay decode for no saving, so inline images
 * always load eagerly and paint immediately, with no fade or placeholder.
 * Remote URLs keep the lazy behaviour.
 */
export function LazyImage({
  src,
  alt,
  className,
  priority = false,
  fallbackName,
  sizes,
}: LazyImageProps) {
  const inline = src.startsWith('data:');
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>(
    src ? (inline ? 'loaded' : 'loading') : 'error',
  );

  // Reset when the source changes — otherwise one broken photo would leave the
  // component stuck on the fallback for every later photo, which is exactly
  // what happens when the profile gallery switches images in place.
  useEffect(() => {
    const isInline = src.startsWith('data:');
    setState(src ? (isInline ? 'loaded' : 'loading') : 'error');
  }, [src]);

  if (state === 'error') {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-brand/25 to-accent/25 text-brand',
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <span className="text-3xl font-bold tracking-wide">
          {initials(fallbackName ?? alt) || '?'}
        </span>
      </div>
    );
  }

  const eager = priority || inline;

  return (
    <div className={cn('relative overflow-hidden bg-line/50', className)}>
      {state === 'loading' && <div className="skeleton absolute inset-0 rounded-none" />}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        decoding={inline ? 'sync' : 'async'}
        // Spread as the lowercase DOM attribute: React 18 does not know the
        // camelCase `fetchPriority` prop and warns while dropping it, whereas an
        // all-lowercase unknown attribute is forwarded as-is.
        {...{ fetchpriority: eager ? 'high' : 'auto' }}
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
        className={cn(
          'h-full w-full object-cover',
          inline ? '' : 'transition-opacity duration-300',
          state === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
