import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { ADMIN_EMAIL, BRAND } from '@/config/brand';
import { isAdminConfigured } from '@/services/admin.service';
import { useAdminAuth } from '@/hooks/useAdminAuth';

/**
 * Admin sign-in.
 *
 * No password is ever stored in this codebase. The account is created in the
 * Firebase console (Authentication → Users), and exactly one email address —
 * ADMIN_EMAIL — is allowed through. See DEPLOYMENT.md.
 */
export default function AdminLoginPage() {
  const { signIn, isAdmin, status } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Admin sign in · ${BRAND.name}`;
  }, []);

  if (status === 'ready' && isAdmin) {
    return <Navigate to={location.state?.from ?? '/admin'} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(location.state?.from ?? '/admin', { replace: true });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white">
            <Icon name="lock" size={20} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Admin sign in</h1>
            <p className="text-xs text-slate-500">{BRAND.name} dashboard</p>
          </div>
        </div>

        {!isAdminConfigured && (
          <div className="mb-4 rounded-xl bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
            <strong className="block">Admin email not configured</strong>
            Set <code className="font-mono">VITE_ADMIN_EMAIL</code> to the address you created
            in Firebase Authentication, then redeploy. Until then nobody can sign in.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-[15px] text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="admin@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Password</span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 pr-11 text-[15px] text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-slate-700"
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
              </button>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting && <Spinner size={16} />}
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          {isAdminConfigured ? (
            <>
              Only <span className="font-mono">{ADMIN_EMAIL}</span> can sign in here. Guests
              browsing the app cannot reach this dashboard.
            </>
          ) : (
            'Guests browsing the app cannot reach this dashboard.'
          )}
        </p>
      </div>
    </div>
  );
}
