/**
 * Public (client-side) environment configuration.
 *
 * SECURITY: Everything in here ships to the browser. Only `VITE_`-prefixed,
 * genuinely public values belong here. Payment gateway secrets, webhook
 * secrets and Firebase service-account credentials live exclusively in
 * server-side env vars consumed by `api/**` — see `.env.example`.
 */

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

const raw = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// `storageBucket` is intentionally absent: partner photos live in Firestore,
// not Firebase Storage (which requires the paid Blaze plan), so a missing
// bucket must not block the whole app from starting.
const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId',
] as const;

export const missingFirebaseKeys = REQUIRED_KEYS.filter((key) => !raw[key]).map(
  (key) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`,
);

/** True when the Firebase web config is complete enough to initialise. */
export const isFirebaseConfigured = missingFirebaseKeys.length === 0;

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: raw.apiKey ?? '',
  authDomain: raw.authDomain ?? '',
  projectId: raw.projectId ?? '',
  storageBucket: raw.storageBucket ?? '',
  messagingSenderId: raw.messagingSenderId ?? '',
  appId: raw.appId ?? '',
  measurementId: raw.measurementId,
};

export const IS_DEV = import.meta.env.DEV;
