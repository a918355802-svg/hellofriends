import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/**
 * Bottom sheet on mobile, centred dialog from `sm` up.
 * Handles scroll lock, Escape, backdrop dismissal and focus containment.
 */
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Blocks backdrop/Escape dismissal — used while a payment is in flight. */
  dismissible?: boolean;
  showClose?: boolean;
  labelledBy?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
  showClose = true,
  labelledBy,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, a[href], input')?.focus();
    }, 60);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose, dismissible]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        className={cn(
          'relative w-full max-w-[480px] animate-sheet-up bg-surface shadow-sheet',
          'rounded-t-4xl sm:animate-pop-in sm:rounded-4xl',
          'max-h-[92dvh] overflow-y-auto hide-scrollbar',
        )}
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/95 px-5 pb-2 pt-3 backdrop-blur">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden" />
          {title ? (
            <h2 className="pt-3 text-base font-bold sm:pt-0">{title}</h2>
          ) : (
            <span />
          )}
          {showClose && dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 mt-2 rounded-full p-2 text-muted transition hover:bg-line/60 sm:mt-0"
            >
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
        <div className="px-5 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
