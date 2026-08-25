import { useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PartnerRow } from '@/components/partner/PartnerRow';
import { PartnerListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { usePartnersFeed } from '@/hooks/usePartnersFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

type Tab = 'all' | 'online' | 'featured' | 'verified';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online now' },
  { id: 'featured', label: 'Featured' },
  { id: 'verified', label: 'Verified' },
];

/**
 * Discover reuses the same paginated feed as Home and filters the loaded pages
 * client-side, so switching a tab costs zero extra Firestore reads.
 */
export default function DiscoverPage() {
  const { partners, status, error, hasMore, loadingMore, loadMore, reload } = usePartnersFeed();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(loadMore, {
    enabled: hasMore && status === 'ready',
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return partners.filter((partner) => {
      if (tab === 'online' && !partner.online) return false;
      if (tab === 'featured' && !partner.featured) return false;
      if (tab === 'verified' && !partner.verified) return false;
      if (!needle) return true;
      return (
        partner.name.toLowerCase().includes(needle) ||
        partner.interests.some((interest) => interest.toLowerCase().includes(needle))
      );
    });
  }, [partners, tab, query]);

  return (
    <>
      <AppHeader title="Discover" />

      <main className="px-4 pt-2">
        <label className="relative block">
          <span className="sr-only">Search by name or interest</span>
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or interest"
            className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-[15px] outline-none transition focus:border-brand"
          />
        </label>

        <div className="hide-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === item.id
                  ? 'bg-brand text-brand-ink'
                  : 'bg-elevated text-muted ring-1 ring-line',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {status === 'loading' && <PartnerListSkeleton count={3} />}

          {status === 'error' && (
            <EmptyState
              icon="wifi-off"
              title="Could not load profiles"
              description={error ?? undefined}
              actionLabel="Try again"
              onAction={reload}
            />
          )}

          {status === 'ready' && filtered.length === 0 && (
            <EmptyState
              icon="search"
              title="Nothing matches that"
              description={
                query
                  ? 'Try a different name or interest.'
                  : 'No profiles in this category right now.'
              }
              actionLabel={query ? 'Clear search' : undefined}
              onAction={query ? () => setQuery('') : undefined}
            />
          )}

          {status === 'ready' && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((partner, index) => (
                <PartnerRow key={partner.id} partner={partner} priority={index < 6} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

          {loadingMore && (
            <div className="flex justify-center py-6 text-muted">
              <Spinner size={22} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
