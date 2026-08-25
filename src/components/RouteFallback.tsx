import { PartnerListSkeleton } from '@/components/ui/Skeleton';
import { Skeleton } from '@/components/ui/Skeleton';

/** Shown while a lazy route chunk downloads — never a blank screen. */
export function RouteFallback() {
  return (
    <div className="app-shell px-4" aria-busy="true" aria-label="Loading">
      <div className="flex h-14 items-center gap-2" style={{ marginTop: 'var(--safe-top)' }}>
        <Skeleton className="h-9 w-9 rounded-2xl" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="mb-4 h-28 w-full rounded-3xl" />
      <PartnerListSkeleton count={2} />
    </div>
  );
}
