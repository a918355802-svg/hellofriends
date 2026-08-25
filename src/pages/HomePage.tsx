import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { PartnerRow } from '@/components/partner/PartnerRow';
import { PartnerListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { usePartnersFeed } from '@/hooks/usePartnersFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { BRAND, LEGAL } from '@/config/brand';

export default function HomePage() {
  const { partners, status, error, hasMore, loadingMore, loadMore, reload } = usePartnersFeed();
  const sentinelRef = useInfiniteScroll<HTMLDivElement>(loadMore, {
    enabled: hasMore && status === 'ready',
  });

  return (
    <>
      <AppHeader
        brand
        actions={
          <Link
            to="/discover"
            aria-label="Search profiles"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-line/60"
          >
            <Icon name="search" size={20} />
          </Link>
        }
      />

      <main className="px-4 pt-2">
        <section className="mb-4 rounded-3xl bg-gradient-to-br from-brand to-accent p-5 text-brand-ink">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-85">
            Welcome to {BRAND.name}
          </p>
          <h2 className="mt-1 text-xl font-extrabold leading-snug">{BRAND.tagline}</h2>
          <p className="mt-1.5 text-sm opacity-90">{BRAND.shortDescription}</p>
        </section>

        {status === 'loading' && <PartnerListSkeleton count={3} />}

        {status === 'error' && (
          <EmptyState
            icon="wifi-off"
            title="We could not load profiles"
            description={error ?? 'Please check your connection and try again.'}
            actionLabel="Try again"
            onAction={reload}
          />
        )}

        {status === 'ready' && partners.length === 0 && (
          <EmptyState
            icon="users"
            title="No profiles yet"
            description="New people are added regularly. Please check back in a little while."
            actionLabel="Refresh"
            onAction={reload}
          />
        )}

        {status === 'ready' && partners.length > 0 && (
          <>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base font-bold">People you can meet</h2>
              <span className="text-xs text-muted">{partners.length} shown</span>
            </div>

            <div className="space-y-3">
              {partners.map((partner, index) => (
                <PartnerRow key={partner.id} partner={partner} priority={index < 6} />
              ))}
            </div>

            {/* Sentinel: crossing this triggers the next Firestore page. */}
            <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

            {loadingMore && (
              <div className="flex justify-center py-6 text-muted">
                <Spinner size={22} />
              </div>
            )}

            {!hasMore && (
              <p className="py-8 text-center text-xs text-muted">
                You have seen everyone for now.
              </p>
            )}

            {hasMore && !loadingMore && (
              <div className="flex justify-center py-6">
                <Button variant="secondary" size="sm" onClick={loadMore}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}

        <p className="pb-2 pt-4 text-center text-[11px] text-muted">{LEGAL.ageNotice}</p>
      </main>
    </>
  );
}
