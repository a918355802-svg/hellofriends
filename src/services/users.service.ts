import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  collection,
  query,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  getCountFromServer,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '@/config/firebase';
import type { AppUser } from '@/types';

const USERS = 'users';

/**
 * Creates the guest document on first visit and refreshes `lastSeenAt` on every
 * later visit. Deliberately stores no personal data — just the anonymous UID and
 * coarse client hints useful for support.
 */
export async function touchGuestUser(uid: string): Promise<void> {
  const ref = doc(getDb(), USERS, uid);
  const existing = await getDoc(ref);

  const platform =
    typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent.slice(0, 64) : null;
  const language = typeof navigator !== 'undefined' ? navigator.language : null;

  if (!existing.exists()) {
    await setDoc(ref, {
      uid,
      isAnonymous: true,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      sessionCount: 1,
      paymentAttempts: 0,
      successfulPayments: 0,
      platform,
      language,
    });
    return;
  }

  await setDoc(
    ref,
    { lastSeenAt: serverTimestamp(), sessionCount: increment(1), platform, language },
    { merge: true },
  );
}

function mapUser(snapshot: DocumentSnapshot): AppUser {
  const data = snapshot.data() ?? {};
  return {
    uid: snapshot.id,
    isAnonymous: data.isAnonymous ?? true,
    createdAt: data.createdAt ?? null,
    lastSeenAt: data.lastSeenAt ?? null,
    sessionCount: data.sessionCount ?? 0,
    paymentAttempts: data.paymentAttempts ?? 0,
    successfulPayments: data.successfulPayments ?? 0,
    platform: data.platform ?? null,
    language: data.language ?? null,
  };
}

/**
 * Admin-only live user listing, newest first.
 *
 * A growing `limit` window instead of a cursor, for the same reason as the
 * payments list: a cursor page silently goes wrong once rows can be inserted
 * above it, and guests arrive while the page is open.
 */
export function subscribeToUsers(
  windowSize: number,
  onChange: (users: AppUser[], hasMore: boolean) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(collection(getDb(), USERS), orderBy('createdAt', 'desc'), fsLimit(windowSize + 1)),
    (snapshot) => {
      const docs = snapshot.docs;
      const hasMore = docs.length > windowSize;
      onChange((hasMore ? docs.slice(0, windowSize) : docs).map(mapUser), hasMore);
    },
    (error) => onError?.(error),
  );
}

export async function countUsers(): Promise<number> {
  const snapshot = await getCountFromServer(collection(getDb(), USERS));
  return snapshot.data().count;
}
