import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/config/firebase';

/**
 * Auth abstraction. Guests get a persisted Firebase anonymous account with no
 * form to fill in; the admin signs in with email + password and must match the
 * single configured ADMIN_EMAIL.
 */

export function observeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Firebase persists the anonymous session in IndexedDB/localStorage, so a
 * returning visitor keeps the same UID. We only mint a new one when none exists.
 */
export async function ensureGuestSession(): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function adminSignIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return credential.user;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}
