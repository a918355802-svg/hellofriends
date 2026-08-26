import {
  collection,
  doc,
  getDoc,
  increment,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '@/config/firebase';
import type {
  InteractionType,
  Partner,
  PaymentDraft,
  PaymentRecord,
  PaymentStatus,
} from '@/types';
import { PRICING, UPI } from '@/config/brand';
import { buildUpiUri, makeReference } from '@/lib/upi';

/**
 * Payments — browser and Firestore only, no backend.
 *
 * Money moves by UPI directly from the payer's app to the owner's bank, so
 * there is nothing for a server to sit in the middle of. What is written here
 * is a *claim*: "I intended to pay ₹99, reference HF…". It is never proof.
 *
 * The proof is the owner seeing the credit in their own bank and pressing
 * "Money received" in the dashboard. Firestore rules enforce that split — a
 * payer may open a request and say they left for their UPI app, and nothing
 * else; only the admin email can record a verdict.
 */

const PAYMENTS = 'payments';

/**
 * Prepares a payment: builds the UPI link and records the intent.
 *
 * Synchronous by design. `addDoc` does not settle until the write reaches the
 * server, so awaiting it would stall the whole payment on a weak connection —
 * which is precisely when someone is most likely to be paying from a phone.
 * Instead the document id is generated locally (Firestore ids are client-side),
 * the link is returned immediately, and the write goes out in the background to
 * sync whenever it can.
 *
 * The returned `saved` promise reports whether the record was actually stored,
 * so the sheet can be honest about it. It is never awaited before redirecting.
 */
export function createPaymentDraft(params: {
  uid: string;
  partner: Partner;
  interactionType: InteractionType;
}): { draft: PaymentDraft; saved: Promise<void> } {
  const reference = makeReference();
  const payeeName = UPI.payeeName || 'Navneet Yadav';
  const ref = doc(collection(getDb(), PAYMENTS));

  const note = `${params.partner.name} ${params.interactionType}`;
  const draft: PaymentDraft = {
    paymentId: ref.id,
    reference,
    amount: PRICING.amount,
    currency: PRICING.currency,
    payeeVpa: UPI.payeeVpa,
    payeeName,
    note,
    upiUri: buildUpiUri({
      payeeVpa: UPI.payeeVpa,
      payeeName,
      amount: PRICING.amount,
    }),
  };

  const saved = setDoc(ref, {
    userId: params.uid,
    profileId: params.partner.id,
    profileName: params.partner.name,
    interactionType: params.interactionType,
    amount: PRICING.amount,
    currency: PRICING.currency,
    status: 'initiated',
    provider: 'upi_intent',
    transactionId: null,
    reference,
    failureReason: null,
    reviewedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    verifiedAt: null,
  }).catch((error) => {
    // A payment the owner can see in their bank is worth more than a tidy
    // dashboard, so this is reported, not thrown.
    console.error('[hellofriends] could not record the payment request', error);
    throw error;
  });

  // Best-effort counter for the admin's user list.
  setDoc(doc(getDb(), 'users', params.uid), { paymentAttempts: increment(1) }, { merge: true })
    .catch(() => undefined);

  return { draft, saved };
}

/** Marks the record `pending` once the payer actually leaves for a UPI app. */
export async function markPaymentAttempted(paymentId: string): Promise<void> {
  if (!paymentId) return;
  try {
    await updateDoc(doc(getDb(), PAYMENTS, paymentId), {
      status: 'pending',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[hellofriends] could not mark the payment pending', error);
  }
}

/** Housekeeping when the payer backs out before leaving for their UPI app. */
export async function cancelPayment(paymentId: string): Promise<void> {
  if (!paymentId) return;
  try {
    await updateDoc(doc(getDb(), PAYMENTS, paymentId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Best-effort only; a stale record is harmless.
  }
}

/** Current status straight from Firestore. */
export async function fetchPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
  if (!paymentId) return null;
  const snapshot = await getDoc(doc(getDb(), PAYMENTS, paymentId));
  return (snapshot.data()?.status as PaymentStatus | undefined) ?? null;
}

/**
 * Realtime status listener for the payer's own record, so the screen flips to
 * "Payment Successful" the instant the owner confirms it.
 */
export function subscribeToPaymentStatus(
  paymentId: string,
  onChange: (status: PaymentStatus) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(getDb(), PAYMENTS, paymentId),
    (snapshot) => {
      const status = snapshot.data()?.status as PaymentStatus | undefined;
      if (status) onChange(status);
    },
    (error) => onError?.(error),
  );
}

/* ------------------------------------------------------------------ admin */

function mapPayment(snapshot: DocumentSnapshot | QueryDocumentSnapshot): PaymentRecord {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    userId: data.userId ?? '',
    profileId: data.profileId ?? '',
    profileName: data.profileName ?? '',
    interactionType: data.interactionType ?? 'chat',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    currency: data.currency ?? 'INR',
    status: data.status ?? 'initiated',
    provider: data.provider ?? 'upi_intent',
    transactionId: data.transactionId ?? null,
    reference: data.reference ?? '',
    failureReason: data.failureReason ?? null,
    reviewedBy: data.reviewedBy ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    verifiedAt: data.verifiedAt ?? null,
  };
}

export interface PaymentFilters {
  status: PaymentStatus | 'all';
  from: Date | null;
  to: Date | null;
}

/**
 * Live payments list for the dashboard.
 *
 * A listener rather than a fetch, so a request opened on someone's phone shows
 * up here on its own — the owner should never have to reload to find out that
 * money is on its way.
 *
 * Paging is a growing window (`limit`) instead of a cursor: cursors and
 * realtime do not mix, because a row inserted at the top shifts every later
 * page. Raising the limit re-runs one query and keeps the whole list live.
 */
export function subscribeToPayments(
  filters: PaymentFilters,
  windowSize: number,
  onChange: (payments: PaymentRecord[], hasMore: boolean) => void,
  onError?: (error: unknown) => void,
): () => void {
  const constraints: QueryConstraint[] = [];
  if (filters.status !== 'all') constraints.push(where('status', '==', filters.status));
  if (filters.from) constraints.push(where('createdAt', '>=', filters.from));
  if (filters.to) constraints.push(where('createdAt', '<=', filters.to));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(fsLimit(windowSize + 1));

  return onSnapshot(
    query(collection(getDb(), PAYMENTS), ...constraints),
    (snapshot) => {
      const docs = snapshot.docs;
      const hasMore = docs.length > windowSize;
      onChange((hasMore ? docs.slice(0, windowSize) : docs).map(mapPayment), hasMore);
    },
    (error) => onError?.(error),
  );
}

/**
 * Live view of everything paid for today, for the dashboard tiles.
 *
 * Deliberately one unfiltered date query rather than a `status == 'verified'`
 * one: a status filter would need a composite index, and an index that has not
 * been deployed yet fails the query outright — which is how the whole dashboard
 * ends up blank. Counting and summing the day's documents in memory needs only
 * the automatic single-field index, so this works on a fresh project.
 */
export function subscribeToTodayPayments(
  onChange: (summary: { count: number; revenue: number }) => void,
  onError?: (error: unknown) => void,
): () => void {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return onSnapshot(
    query(
      collection(getDb(), PAYMENTS),
      where('createdAt', '>=', startOfDay),
      orderBy('createdAt', 'desc'),
      fsLimit(500),
    ),
    (snapshot) => {
      let revenue = 0;
      for (const item of snapshot.docs) {
        const data = item.data();
        if (data.status === 'verified') revenue += typeof data.amount === 'number' ? data.amount : 0;
      }
      onChange({ count: snapshot.size, revenue });
    },
    (error) => onError?.(error),
  );
}

/**
 * Admin settlement.
 *
 * Writes straight to Firestore. The rules allow a verdict only from the single
 * configured admin email, so this cannot be forged by a visitor even though it
 * runs in a browser.
 */
export async function markPaymentDecision(params: {
  paymentId: string;
  status: 'verified' | 'failed' | 'pending';
  adminUid: string;
  transactionId?: string;
  note?: string;
}): Promise<void> {
  const { paymentId, status, adminUid, transactionId, note } = params;
  const ref = doc(getDb(), PAYMENTS, paymentId);
  const before = await getDoc(ref);
  const wasVerified = before.data()?.status === 'verified';
  const userId = before.data()?.userId as string | undefined;

  await updateDoc(ref, {
    status,
    transactionId: transactionId?.trim() || before.data()?.transactionId || null,
    failureReason: status === 'failed' ? note?.trim() || 'Payment not received.' : null,
    reviewedBy: adminUid,
    updatedAt: serverTimestamp(),
    verifiedAt: status === 'verified' ? serverTimestamp() : null,
  });

  // Keep the payer's counter honest when a decision is made or reversed.
  const delta = (status === 'verified' ? 1 : 0) - (wasVerified ? 1 : 0);
  if (delta !== 0 && userId) {
    setDoc(doc(getDb(), 'users', userId), { successfulPayments: increment(delta) }, { merge: true })
      .catch(() => undefined);
  }
}

