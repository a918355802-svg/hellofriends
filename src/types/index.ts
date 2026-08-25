import type { Timestamp } from 'firebase/firestore';

export type Gender = 'female' | 'male' | 'other';

export type InteractionType = 'call' | 'chat' | 'video';

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'cancelled';

/** Only one provider today: a direct UPI intent to the owner's VPA. */
export type PaymentProvider = 'upi_intent';

/** A partner profile as stored in Firestore under `partners/{id}`. */
export interface Partner {
  id: string;
  name: string;
  /** Lowercased name, stored so admin search can use a range query. */
  nameLower: string;
  age: number;
  gender: Gender;
  bio: string;
  interests: string[];
  /**
   * Main photo. Either an inline `data:` URL (compressed and stored in this
   * document) or an external https link. Extra photos live in
   * `partners/{id}/media/gallery` so their bytes stay out of the feed.
   */
  photoUrl: string;
  online: boolean;
  verified: boolean;
  featured: boolean;
  /** Higher sorts first inside the featured/non-featured groups. */
  priority: number;
  active: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Shape accepted by create/update — server-managed fields are excluded. */
export type PartnerInput = Omit<
  Partner,
  'id' | 'nameLower' | 'createdAt' | 'updatedAt'
>;

/** A guest (anonymous) user document under `users/{uid}`. */
export interface AppUser {
  uid: string;
  isAnonymous: boolean;
  createdAt: Timestamp | null;
  lastSeenAt: Timestamp | null;
  sessionCount: number;
  paymentAttempts: number;
  successfulPayments: number;
  /** Coarse, non-identifying client hints kept for support/debugging only. */
  platform: string | null;
  language: string | null;
}

/** A payment record under `payments/{paymentId}`. Written server-side only. */
export interface PaymentRecord {
  id: string;
  userId: string;
  profileId: string;
  profileName: string;
  interactionType: InteractionType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  /** UPI transaction / UTR number, filled in by an admin when confirming. */
  transactionId: string | null;
  /** Unique human-readable reference sent as the UPI `tr` field. */
  reference: string;
  failureReason: string | null;
  /** UID of the admin who confirmed or rejected this payment, if any. */
  reviewedBy: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  verifiedAt: Timestamp | null;
}

export interface ReportRecord {
  id: string;
  reporterUid: string;
  profileId: string;
  reason: string;
  details: string;
  createdAt: Timestamp | null;
  resolved: boolean;
}

/**
 * Everything needed to send someone to their UPI app.
 * `paymentId` is empty when the Firestore write failed — the link still works.
 */
export interface PaymentDraft {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  /** Ready-to-open `upi://pay?...` URI. */
  upiUri: string;
  payeeVpa: string;
  payeeName: string;
}

/**
 * Dashboard counts. `null` means "this one count could not be read" — the tile
 * shows a dash instead of a misleading zero, and the rest of the dashboard
 * still renders.
 */
export interface AdminCounts {
  totalPartners: number | null;
  onlinePartners: number | null;
  offlinePartners: number | null;
  totalUsers: number | null;
}

export interface PartnerFilters {
  search: string;
  status: 'all' | 'online' | 'offline';
  activeState: 'all' | 'active' | 'inactive';
  featured: 'all' | 'featured' | 'not-featured';
  sort: 'newest' | 'priority' | 'name';
}
