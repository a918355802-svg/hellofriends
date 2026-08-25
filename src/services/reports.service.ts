import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDb } from '@/config/firebase';
import type { ReportRecord } from '@/types';

/**
 * Safety features. Blocks are stored per user so they stay private; reports go
 * to a collection only admins can read.
 */

export const REPORT_REASONS = [
  'Fake or misleading profile',
  'Inappropriate photos',
  'Harassment or abuse',
  'Spam or scam',
  'Appears to be under 18',
  'Something else',
] as const;

export async function reportPartner(params: {
  reporterUid: string;
  profileId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  await addDoc(collection(getDb(), 'reports'), {
    reporterUid: params.reporterUid,
    profileId: params.profileId,
    reason: params.reason,
    details: params.details?.slice(0, 1000) ?? '',
    createdAt: serverTimestamp(),
    resolved: false,
  });
}

function blockRef(uid: string, profileId: string) {
  return doc(getDb(), 'users', uid, 'blocks', profileId);
}

export async function blockPartner(uid: string, profileId: string): Promise<void> {
  await setDoc(blockRef(uid, profileId), { profileId, createdAt: serverTimestamp() });
}

export async function unblockPartner(uid: string, profileId: string): Promise<void> {
  await deleteDoc(blockRef(uid, profileId));
}

export async function isPartnerBlocked(uid: string, profileId: string): Promise<boolean> {
  const snapshot = await getDoc(blockRef(uid, profileId));
  return snapshot.exists();
}

/** All profile ids the user has blocked — used to filter the discovery feed. */
export async function fetchBlockedIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(
    query(collection(getDb(), 'users', uid, 'blocks'), orderBy('createdAt', 'desc'), fsLimit(500)),
  );
  return new Set(snapshot.docs.map((d) => d.id));
}

export async function fetchReports(count = 50): Promise<ReportRecord[]> {
  const snapshot = await getDocs(
    query(collection(getDb(), 'reports'), orderBy('createdAt', 'desc'), fsLimit(count)),
  );
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      reporterUid: data.reporterUid ?? '',
      profileId: data.profileId ?? '',
      reason: data.reason ?? '',
      details: data.details ?? '',
      createdAt: data.createdAt ?? null,
      resolved: data.resolved === true,
    };
  });
}
