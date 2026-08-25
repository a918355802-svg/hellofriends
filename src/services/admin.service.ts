import type { User } from 'firebase/auth';
import { ADMIN_EMAIL } from '@/config/brand';
import { countPartners } from './partners.service';
import { countUsers } from './users.service';
import type { AdminCounts } from '@/types';

/**
 * Admin authorisation — a single fixed email address.
 *
 * There is no allowlist collection and no role system: the account whose email
 * equals `ADMIN_EMAIL` is the admin, and no other account can ever become one.
 * An unset `ADMIN_EMAIL` locks the dashboard for everybody.
 *
 * This function only drives routing and messaging. The real boundary is the
 * same email comparison in `firestore.rules`, which a browser cannot influence.
 */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!ADMIN_EMAIL) return false;
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL;
}

/** True when the admin email has been configured at all. */
export const isAdminConfigured = ADMIN_EMAIL.length > 0;

export async function resolveAdminAccess(user: User): Promise<boolean> {
  // Guests sign in anonymously and have no email, so they can never match.
  if (user.isAnonymous) return false;
  return isAdminEmail(user.email);
}

/**
 * Partner and guest counts for the dashboard tiles.
 *
 * `allSettled`, not `all`. These are four independent aggregate queries, and
 * with `all` a single one failing — a missing index, a rule that has not been
 * deployed yet — rejects the lot and the dashboard renders empty, which says
 * nothing about which query actually broke. Each count now stands or falls on
 * its own, and the caller is told what went wrong.
 *
 * Payment tiles do not come through here: they have their own live listener.
 */
export async function fetchAdminCounts(): Promise<{ counts: AdminCounts; failures: unknown[] }> {
  const [totalPartners, onlinePartners, totalUsers] = await Promise.allSettled([
    countPartners(),
    countPartners({ online: true }),
    countUsers(),
  ]);

  const value = (result: PromiseSettledResult<number>): number | null =>
    result.status === 'fulfilled' ? result.value : null;

  const total = value(totalPartners);
  const online = value(onlinePartners);

  return {
    counts: {
      totalPartners: total,
      onlinePartners: online,
      offlinePartners: total !== null && online !== null ? Math.max(total - online, 0) : null,
      totalUsers: value(totalUsers),
    },
    failures: [totalPartners, onlinePartners, totalUsers]
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason),
  };
}
