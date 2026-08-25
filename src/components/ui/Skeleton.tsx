import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

/** Mirrors the discovery card's geometry so nothing shifts once data lands. */
function PartnerCardSkeleton() {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Skeleton className="h-11 rounded-2xl" />
        <Skeleton className="h-11 rounded-2xl" />
        <Skeleton className="h-11 rounded-2xl" />
      </div>
    </div>
  );
}

export function PartnerListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading profiles">
      {Array.from({ length: count }, (_, index) => (
        <PartnerCardSkeleton key={index} />
      ))}
    </div>
  );
}
