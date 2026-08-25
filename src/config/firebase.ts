import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured, missingFirebaseKeys } from './env';

/**
 * Firebase is initialised lazily and only once. Every consumer goes through the
 * getters below so a missing configuration produces one clear error instead of
 * a cascade of undefined-reference crashes.
 */

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      `Firebase is not configured. Missing environment variables: ${missingFirebaseKeys.join(', ')}`,
    );
    this.name = 'FirebaseNotConfiguredError';
  }
}

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new FirebaseNotConfiguredError();
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    // Offline persistence keeps the feed readable on flaky mobile networks and
    // cuts repeat Firestore reads on revisits.
    //
    // Multi-tab, not single-tab: the single-tab manager takes an exclusive lock
    // on the persistence layer, so a second tab (or a leftover PWA window)
    // fails to acquire it and silently drops back to an in-memory cache —
    // losing offline support exactly when the user has the app open twice.
    dbInstance = initializeFirestore(getApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  }
  return dbInstance;
}

export { isFirebaseConfigured, missingFirebaseKeys };
