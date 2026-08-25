import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { isFirebaseConfigured, missingFirebaseKeys } from '@/config/firebase';
import { ensureGuestSession, observeAuth } from '@/services/auth.service';
import { touchGuestUser } from '@/services/users.service';
import { friendlyError } from '@/lib/errors';

/**
 * Guest session provider.
 *
 * There is no signup or login in the public app: on first paint we create a
 * Firebase anonymous account, mirror it into `users/{uid}`, and let the visitor
 * straight into the feed. Firebase persists the credential locally, so a
 * returning visitor keeps the same UID and the same history.
 */

interface GuestSessionValue {
  user: User | null;
  uid: string | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  retry: () => void;
  configured: boolean;
  missingKeys: string[];
}

const GuestSessionContext = createContext<GuestSessionValue | null>(null);

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<GuestSessionValue['status']>(
    isFirebaseConfigured ? 'loading' : 'error',
  );
  const [error, setError] = useState<string | null>(
    isFirebaseConfigured ? null : 'The app is not connected to Firebase yet.',
  );
  const [attempt, setAttempt] = useState(0);
  const touchedUid = useRef<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let cancelled = false;

    const unsubscribe = observeAuth((nextUser) => {
      if (cancelled) return;
      setUser(nextUser);
      if (nextUser) {
        setStatus('ready');
        setError(null);
      }
    });

    (async () => {
      try {
        const guest = await ensureGuestSession();
        if (cancelled) return;
        setUser(guest);
        setStatus('ready');

        // Writing the profile document must never block entry into the app.
        if (guest.isAnonymous && touchedUid.current !== guest.uid) {
          touchedUid.current = guest.uid;
          touchGuestUser(guest.uid).catch(() => undefined);
        }
      } catch (cause) {
        if (cancelled) return;
        setStatus('error');
        setError(friendlyError(cause, 'We could not start your session.'));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<GuestSessionValue>(
    () => ({
      user,
      uid: user?.uid ?? null,
      status,
      error,
      retry,
      configured: isFirebaseConfigured,
      missingKeys: missingFirebaseKeys,
    }),
    [user, status, error, retry],
  );

  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession(): GuestSessionValue {
  const context = useContext(GuestSessionContext);
  if (!context) throw new Error('useGuestSession must be used inside <GuestSessionProvider>');
  return context;
}
