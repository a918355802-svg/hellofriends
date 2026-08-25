import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { isFirebaseConfigured } from '@/config/firebase';
import { adminSignIn, observeAuth, signOutCurrentUser } from '@/services/auth.service';
import { isAdminConfigured, resolveAdminAccess } from '@/services/admin.service';
import { friendlyError } from '@/lib/errors';

/**
 * Admin auth context.
 *
 * Exactly one email address is the admin. The check here is convenience only —
 * the real boundary is the same email comparison in `firestore.rules` and
 * `api/_lib/http.ts`. A visitor who forces their way to `/admin` sees an empty,
 * read-denied shell.
 */

interface AdminAuthValue {
  user: User | null;
  isAdmin: boolean;
  status: 'loading' | 'ready';
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready'>(
    isFirebaseConfigured ? 'loading' : 'ready',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;

    const unsubscribe = observeAuth(async (nextUser) => {
      if (cancelled) return;
      setUser(nextUser);

      if (!nextUser || nextUser.isAnonymous) {
        setIsAdmin(false);
        setStatus('ready');
        return;
      }

      try {
        const allowed = await resolveAdminAccess(nextUser);
        if (!cancelled) setIsAdmin(allowed);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setStatus('ready');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setStatus('loading');
    try {
      const signedIn = await adminSignIn(email, password);
      const allowed = await resolveAdminAccess(signedIn);
      setIsAdmin(allowed);
      if (!allowed) {
        // Signed in as a real user, but not the admin — do not leave that
        // session hanging around in the browser.
        await signOutCurrentUser();
        throw new Error(
          isAdminConfigured
            ? 'This account does not have admin access.'
            : 'Admin access is not configured yet. Set VITE_ADMIN_EMAIL and redeploy.',
        );
      }
    } catch (cause) {
      const message = friendlyError(cause, 'Could not sign in.');
      setError(message);
      throw new Error(message);
    } finally {
      setStatus('ready');
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrentUser();
    setIsAdmin(false);
    setUser(null);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ user, isAdmin, status, error, signIn, signOut }),
    [user, isAdmin, status, error, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return context;
}
