import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { fetchPartnersPage, subscribeToPartnerStatuses } from '@/services/partners.service';
import { FEED } from '@/config/brand';
import { fetchBlockedIds } from '@/services/reports.service';
import { friendlyError } from '@/lib/errors';
import { useGuestSession } from './useGuestSession';
import type { Partner } from '@/types';

/**
 * The public discovery feed.
 *
 * - Loads one Firestore page at a time (never the whole collection).
 * - Keeps a single realtime listener on recently-updated partners so an admin
 *   toggling Online/Offline is reflected without a refresh.
 * - Filters out profiles the current guest has blocked.
 */
export function usePartnersFeed() {
  const { uid, status: sessionStatus } = useGuestSession();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [reloadToken, setReloadToken] = useState(0);

  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* First page ------------------------------------------------------------ */
  useEffect(() => {
    if (sessionStatus !== 'ready') return;

    let cancelled = false;
    setStatus('loading');
    setError(null);
    cursorRef.current = null;

    (async () => {
      try {
        const page = await fetchPartnersPage(null);
        if (cancelled) return;
        cursorRef.current = page.cursor;
        setPartners(page.partners);
        setHasMore(page.hasMore);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(friendlyError(cause, 'We could not load profiles right now.'));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, reloadToken]);

  /* Blocked profiles ------------------------------------------------------ */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetchBlockedIds(uid)
      .then((ids) => {
        if (!cancelled) setBlockedIds(ids);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [uid, reloadToken]);

  /* Realtime patching ----------------------------------------------------- */

  // A stable key over the watched ids: patching a partner replaces the object
  // but keeps its id, so this only changes when the visible set really changes
  // — which stops the listener from being torn down on every status update.
  const watchKey = useMemo(
    () =>
      partners
        .slice(0, FEED.realtimeWatchLimit)
        .map((partner) => partner.id)
        .join(','),
    [partners],
  );

  useEffect(() => {
    if (sessionStatus !== 'ready' || !watchKey) return;

    const unsubscribe = subscribeToPartnerStatuses(watchKey.split(','), (updated) => {
      if (!mountedRef.current || updated.length === 0) return;
      const byId = new Map(updated.map((partner) => [partner.id, partner]));

      setPartners((current) => {
        let changed = false;
        const next = current.map((partner) => {
          const fresh = byId.get(partner.id);
          if (!fresh) return partner;
          // Only swap when something the card actually renders has moved.
          if (
            fresh.online === partner.online &&
            fresh.active === partner.active &&
            fresh.verified === partner.verified &&
            fresh.featured === partner.featured &&
            fresh.name === partner.name &&
            fresh.photoUrl === partner.photoUrl &&
            fresh.bio === partner.bio
          ) {
            return partner;
          }
          changed = true;
          return fresh;
        });

        // A profile deactivated by an admin should disappear immediately.
        const filtered = next.filter((partner) => partner.active);
        if (filtered.length !== next.length) changed = true;

        return changed ? filtered : current;
      });
    });

    return unsubscribe;
  }, [sessionStatus, watchKey]);

  /* Pagination ------------------------------------------------------------ */
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || status !== 'ready') return;
    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const page = await fetchPartnersPage(cursorRef.current);
      if (!mountedRef.current) return;
      cursorRef.current = page.cursor;
      setPartners((current) => {
        const seen = new Set(current.map((partner) => partner.id));
        return [...current, ...page.partners.filter((partner) => !seen.has(partner.id))];
      });
      setHasMore(page.hasMore);
    } catch (cause) {
      if (mountedRef.current) setError(friendlyError(cause, 'Could not load more profiles.'));
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [hasMore, status]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const visiblePartners = useMemo(
    () => partners.filter((partner) => !blockedIds.has(partner.id)),
    [partners, blockedIds],
  );

  return {
    partners: visiblePartners,
    status,
    error,
    hasMore,
    loadingMore,
    loadMore,
    reload,
  };
}
