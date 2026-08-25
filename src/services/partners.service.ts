import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '@/config/firebase';
import { FEED } from '@/config/brand';
import type { Partner, PartnerFilters, PartnerInput } from '@/types';

const PARTNERS = 'partners';

function mapPartner(snapshot: DocumentSnapshot | QueryDocumentSnapshot): Partner {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: data.name ?? 'Unknown',
    nameLower: data.nameLower ?? String(data.name ?? '').toLowerCase(),
    age: typeof data.age === 'number' ? data.age : 0,
    gender: data.gender ?? 'female',
    bio: data.bio ?? '',
    interests: Array.isArray(data.interests) ? data.interests : [],
    photoUrl: data.photoUrl ?? '',
    online: data.online === true,
    verified: data.verified === true,
    featured: data.featured === true,
    priority: typeof data.priority === 'number' ? data.priority : 0,
    active: data.active !== false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export interface PartnersPage {
  partners: Partner[];
  cursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Public discovery feed, paginated.
 *
 * Ordering: featured first, then admin-set priority, then newest. This needs the
 * composite index declared in `firestore.indexes.json`.
 *
 * We request `pageSize + 1` documents so "is there another page?" is answered
 * without a second round trip.
 */
export async function fetchPartnersPage(
  cursor: QueryDocumentSnapshot | null = null,
  pageSize = FEED.pageSize,
): Promise<PartnersPage> {
  const base: QueryConstraint[] = [
    where('active', '==', true),
    orderBy('featured', 'desc'),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'desc'),
  ];
  if (cursor) base.push(startAfter(cursor));
  base.push(fsLimit(pageSize + 1));

  const snapshot = await getDocs(query(collection(getDb(), PARTNERS), ...base));
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  return {
    partners: pageDocs.map(mapPartner),
    cursor: pageDocs.length ? pageDocs[pageDocs.length - 1]! : null,
    hasMore,
  };
}

export async function fetchPartnerById(id: string): Promise<Partner | null> {
  const snapshot = await getDoc(doc(getDb(), PARTNERS, id));
  return snapshot.exists() ? mapPartner(snapshot) : null;
}

/** Realtime subscription for a single profile — used on the detail screen. */
export function subscribeToPartner(
  id: string,
  onChange: (partner: Partner | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(getDb(), PARTNERS, id),
    (snapshot) => onChange(snapshot.exists() ? mapPartner(snapshot) : null),
    (error) => onError?.(error),
  );
}

/**
 * One realtime listener covering the partners currently on screen, so an admin
 * flipping someone Online/Offline shows up without a refresh.
 *
 * Scoped by document id rather than "most recently updated", because partner
 * documents now carry their photo inline: an `updatedAt desc` window would
 * stream whole profiles the visitor is not even looking at. Watching the ids
 * already on screen keeps the worst case to documents the feed has fetched
 * anyway, instead of an arbitrary extra set.
 *
 * Firestore allows at most 30 values in an `in` filter, which is also a
 * sensible ceiling for how much to keep live.
 */
export function subscribeToPartnerStatuses(
  ids: string[],
  onChange: (partners: Partner[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const watched = ids.slice(0, FEED.realtimeWatchLimit);
  if (watched.length === 0) return () => undefined;

  const q = query(collection(getDb(), PARTNERS), where(documentId(), 'in', watched));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapPartner)),
    (error) => onError?.(error),
  );
}

/* ------------------------------------------------------------------ admin */

/**
 * Live admin listing with search + filters.
 *
 * Name search uses a lowercase prefix range query (Firestore has no substring
 * search). Boolean filters that would need extra composite indexes are applied
 * in memory over the window, which keeps index maintenance manageable.
 *
 * A listener, so toggling someone Online or saving an edit in another tab is
 * reflected here without a reload \u2014 and a growing `limit` window rather than a
 * cursor, since cursor pages break once rows can appear above them.
 */
export function subscribeToAdminPartners(
  filters: PartnerFilters,
  windowSize: number,
  onChange: (partners: Partner[], hasMore: boolean) => void,
  onError?: (error: unknown) => void,
): () => void {
  const constraints: QueryConstraint[] = [];
  const search = filters.search.trim().toLowerCase();

  if (search) {
    // Prefix match: the range [search, search+\uf8ff] covers every name that
    // starts with the query, since \uf8ff sorts above ordinary characters.
    const PREFIX_MAX = '\uf8ff';
    constraints.push(where('nameLower', '>=', search));
    constraints.push(where('nameLower', '<=', search + PREFIX_MAX));
    constraints.push(orderBy('nameLower', 'asc'));
  } else if (filters.sort === 'priority') {
    constraints.push(orderBy('priority', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));
  } else if (filters.sort === 'name') {
    constraints.push(orderBy('nameLower', 'asc'));
  } else {
    constraints.push(orderBy('createdAt', 'desc'));
  }

  constraints.push(fsLimit(windowSize + 1));

  return onSnapshot(
    query(collection(getDb(), PARTNERS), ...constraints),
    (snapshot) => {
      const docs = snapshot.docs;
      const hasMore = docs.length > windowSize;
      let partners = (hasMore ? docs.slice(0, windowSize) : docs).map(mapPartner);

      if (filters.status !== 'all') {
        partners = partners.filter((p) => p.online === (filters.status === 'online'));
      }
      if (filters.activeState !== 'all') {
        partners = partners.filter((p) => p.active === (filters.activeState === 'active'));
      }
      if (filters.featured !== 'all') {
        partners = partners.filter((p) => p.featured === (filters.featured === 'featured'));
      }

      onChange(partners, hasMore);
    },
    (error) => onError?.(error),
  );
}

export async function createPartner(input: PartnerInput): Promise<string> {
  const ref = await addDoc(collection(getDb(), PARTNERS), {
    ...input,
    nameLower: input.name.trim().toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePartner(id: string, input: Partial<PartnerInput>): Promise<void> {
  const patch: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() };
  if (typeof input.name === 'string') patch.nameLower = input.name.trim().toLowerCase();
  await updateDoc(doc(getDb(), PARTNERS, id), patch);
}

export async function deletePartner(id: string): Promise<void> {
  // Firestore does NOT cascade into subcollections, so the gallery document
  // would survive its parent and sit there invisibly forever. Delete it first;
  // if that fails, the profile stays too, which is the recoverable order.
  await deleteDoc(doc(getDb(), PARTNERS, id, 'media', 'gallery')).catch(() => undefined);
  await deleteDoc(doc(getDb(), PARTNERS, id));
}

export async function setPartnerOnline(id: string, online: boolean): Promise<void> {
  await updatePartner(id, { online });
}

export async function setPartnerActive(id: string, active: boolean): Promise<void> {
  await updatePartner(id, { active });
}

export async function setPartnerFeatured(id: string, featured: boolean): Promise<void> {
  await updatePartner(id, { featured });
}

export async function countPartners(filter?: { online?: boolean; active?: boolean }): Promise<number> {
  const constraints: QueryConstraint[] = [];
  if (filter?.online !== undefined) constraints.push(where('online', '==', filter.online));
  if (filter?.active !== undefined) constraints.push(where('active', '==', filter.active));
  const snapshot = await getCountFromServer(query(collection(getDb(), PARTNERS), ...constraints));
  return snapshot.data().count;
}
