import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export function StatusDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface',
        online ? 'bg-online' : 'bg-muted/60',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        online ? 'bg-online/12 text-online' : 'bg-muted/12 text-muted',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', online ? 'bg-online' : 'bg-muted/70')} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

/**
 * `onPhoto` switches to a solid treatment — the tinted variant is unreadable
 * over a photograph, where these badges are most often shown.
 */
export function VerifiedBadge({
  compact = false,
  onPhoto = false,
}: {
  compact?: boolean;
  onPhoto?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        onPhoto ? 'bg-accent text-white shadow-sm' : 'bg-accent/12 text-accent',
      )}
      title="Verified profile"
    >
      <Icon name="check-circle" size={12} />
      {!compact && 'Verified'}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-elevated px-3 py-1 text-xs font-medium text-muted ring-1 ring-line',
        className,
      )}
    >
      {children}
    </span>
  );
}
