import { memo } from 'react';
import { Link } from 'react-router-dom';
import { LazyImage } from '@/components/ui/LazyImage';
import { StatusDot } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { InteractionButtons } from './InteractionButtons';
import { cn } from '@/lib/cn';
import type { Partner } from '@/types';

/**
 * Discovery card.
 *
 * Header (photo + identity) sits on one line, then the bio runs the full width
 * of the card, then the three actions span the bottom. Giving the bio its own
 * full-width band is the whole point: squeezed beside the buttons it truncated
 * after three words.
 *
 * Every tappable region is its own element — the buttons are siblings of the
 * link, never nested inside it, so a tap is never ambiguous.
 */
export const PartnerRow = memo(function PartnerRow({
  partner,
  priority = false,
}: {
  partner: Partner;
  priority?: boolean;
}) {
  return (
    <article
      className={cn(
        'card p-3.5 transition',
        partner.featured && 'ring-1 ring-brand/25',
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          to={`/profile/${partner.id}`}
          className="relative shrink-0 rounded-2xl transition active:scale-95"
          aria-label={`View ${partner.name}'s photo`}
          tabIndex={-1}
        >
          <LazyImage
            src={partner.photoUrl}
            alt={partner.name}
            fallbackName={partner.name}
            priority={priority}
            className="h-16 w-16 rounded-2xl ring-1 ring-line"
          />
          <StatusDot
            online={partner.online}
            className="absolute -bottom-1 -right-1 h-4 w-4 ring-[3px]"
          />
        </Link>

        <Link
          to={`/profile/${partner.id}`}
          className="min-w-0 flex-1 transition active:opacity-70"
          aria-label={`View ${partner.name}'s profile`}
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-base font-bold leading-tight">
              {partner.name}
              {partner.age > 0 && `, ${partner.age}`}
            </span>
            {partner.verified && (
              <Icon
                name="check-circle"
                size={15}
                className="shrink-0 text-accent"
                aria-label="Verified"
              />
            )}
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
            <span className={partner.online ? 'text-online' : 'text-muted'}>
              {partner.online ? 'Online now' : 'Offline'}
            </span>
            {partner.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                <Icon name="star" size={10} />
                Featured
              </span>
            )}
          </span>
        </Link>

        <Link
          to={`/profile/${partner.id}`}
          className="shrink-0 rounded-full p-1.5 text-muted transition active:scale-90"
          aria-label={`Open ${partner.name}'s profile`}
        >
          <Icon name="chevron-right" size={18} />
        </Link>
      </div>

      {partner.bio && (
        <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
          {partner.bio}
        </p>
      )}

      {partner.interests.length > 0 && (
        <p className="mt-2 truncate text-[11.5px] font-medium text-muted/80">
          {partner.interests.slice(0, 4).join(' · ')}
        </p>
      )}

      <div className="mt-3.5">
        <InteractionButtons partner={partner} />
      </div>
    </article>
  );
});
