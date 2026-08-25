import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { LazyImage } from '@/components/ui/LazyImage';
import { Chip, StatusPill, VerifiedBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InteractionButtons } from '@/components/partner/InteractionButtons';
import { ReportSheet } from '@/components/partner/ReportSheet';
import { subscribeToPartner } from '@/services/partners.service';
import { fetchPartnerGallery } from '@/services/photos.service';
import { blockPartner, isPartnerBlocked, unblockPartner } from '@/services/reports.service';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useToast } from '@/hooks/useToast';
import { friendlyError } from '@/lib/errors';
import { LEGAL } from '@/config/brand';
import type { Partner } from '@/types';

/**
 * Profile detail. Uses a realtime document listener so an admin flipping the
 * partner Online/Offline updates this screen without a refresh.
 */
export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { uid } = useGuestSession();
  const toast = useToast();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setStatus('loading');

    const unsubscribe = subscribeToPartner(
      id,
      (next) => {
        if (!next || !next.active) {
          setStatus('missing');
          return;
        }
        setPartner(next);
        setStatus('ready');
      },
      (cause) => {
        setError(friendlyError(cause, 'We could not open this profile.'));
        setStatus('error');
      },
    );

    return unsubscribe;
  }, [id]);

  // Extra photos live in their own document, so they cost one read and only on
  // this screen — the feed never carries their bytes.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchPartnerGallery(id)
      .then((photos) => !cancelled && setGallery(photos))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!uid || !id) return;
    isPartnerBlocked(uid, id)
      .then(setBlocked)
      .catch(() => undefined);
  }, [uid, id]);

  const toggleBlock = async () => {
    if (!uid || !id) return;
    try {
      if (blocked) {
        await unblockPartner(uid, id);
        setBlocked(false);
        toast.success('Profile unblocked.');
      } else {
        await blockPartner(uid, id);
        setBlocked(true);
        toast.success('Profile blocked. You will not see it in your feed.');
      }
    } catch (cause) {
      toast.error(friendlyError(cause, 'Could not update your block list.'));
    }
  };

  if (status === 'loading') {
    return (
      <>
        <AppHeader showBack title="Profile" />
        <main className="px-4">
          <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-13 w-full rounded-2xl" />
          </div>
        </main>
      </>
    );
  }

  if (status !== 'ready' || !partner) {
    return (
      <>
        <AppHeader showBack title="Profile" />
        <EmptyState
          icon={status === 'error' ? 'wifi-off' : 'user'}
          title={status === 'error' ? 'Could not open this profile' : 'Profile not available'}
          description={
            status === 'error'
              ? (error ?? undefined)
              : 'This profile may have been removed or hidden.'
          }
          actionLabel="Back to home"
          onAction={() => navigate('/')}
        />
      </>
    );
  }

  const photos = [partner.photoUrl, ...gallery.filter((url) => url && url !== partner.photoUrl)]
    .filter(Boolean);

  const current = photos[activePhoto] ?? photos[0];

  return (
    <>
      <AppHeader
        showBack
        overlay
        actions={
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            aria-label="Report this profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition active:scale-95"
          >
            <Icon name="flag" size={18} />
          </button>
        }
      />

      <main className="-mt-[calc(3.5rem+var(--safe-top))]">
        <div className="relative">
          <LazyImage
            src={current ?? ''}
            alt={partner.name}
            fallbackName={partner.name}
            priority
            className="aspect-[4/5] w-full"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />

          <div className="absolute inset-x-4 bottom-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold drop-shadow">
                {partner.name}
                {partner.age > 0 && `, ${partner.age}`}
              </h1>
              {partner.verified && <VerifiedBadge compact onPhoto />}
            </div>
            <p className="mt-1 text-sm font-medium opacity-90">
              {partner.online ? '🟢 Online now' : '⚫ Offline'}
            </p>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
            {photos.map((photo, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActivePhoto(index)}
                aria-label={`Photo ${index + 1} of ${photos.length}`}
                aria-current={index === activePhoto}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 transition ${
                  index === activePhoto ? 'ring-brand' : 'ring-transparent'
                }`}
              >
                <LazyImage src={photo} alt="" fallbackName={partner.name} className="h-full w-full" />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-5 px-4 pt-4">
          <div className="flex items-center gap-2">
            <StatusPill online={partner.online} />
            {partner.featured && <Chip className="text-brand">⭐ Featured</Chip>}
          </div>

          {partner.bio && (
            <section>
              <h2 className="mb-1.5 text-sm font-bold">About</h2>
              <p className="text-[15px] leading-relaxed text-muted">{partner.bio}</p>
            </section>
          )}

          {partner.interests.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {partner.interests.map((interest) => (
                  <Chip key={interest}>{interest}</Chip>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-bold">Start a conversation</h2>
            <InteractionButtons partner={partner} size="lg" />
            <p className="mt-2 text-center text-[11px] text-muted">
              A response is not guaranteed. {LEGAL.ageNotice}
            </p>
          </section>

          <section className="flex gap-2 border-t border-line pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReportOpen(true)}
              leadingIcon={<Icon name="flag" size={15} />}
            >
              Report
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleBlock}
              leadingIcon={<Icon name="ban" size={15} />}
            >
              {blocked ? 'Unblock' : 'Block'}
            </Button>
          </section>
        </div>
      </main>

      <ReportSheet
        open={reportOpen}
        partnerId={partner.id}
        partnerName={partner.name}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
