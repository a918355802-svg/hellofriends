import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useToast } from '@/hooks/useToast';
import { BRAND, LEGAL } from '@/config/brand';

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/legal/guidelines', label: 'Community guidelines', icon: 'shield' },
  { to: '/legal/safety', label: 'Safety tips', icon: 'lock' },
  { to: '/legal/terms', label: 'Terms of service', icon: 'grid' },
  { to: '/legal/privacy', label: 'Privacy policy', icon: 'eye' },
  { to: '/legal/refunds', label: 'Payments & refunds', icon: 'card' },
];

/** The guest's own account screen. No personal data is ever collected. */
export default function ProfilePage() {
  const { uid, status } = useGuestSession();
  const toast = useToast();

  const copyId = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      toast.success('Guest ID copied.');
    } catch {
      toast.error('Could not copy. Please select and copy manually.');
    }
  };

  return (
    <>
      <AppHeader title="Profile" />

      <main className="space-y-5 px-4 pt-2">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-brand-ink">
              <Icon name="user" size={26} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Guest</h2>
              <p className="text-sm text-muted">
                {status === 'loading' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner size={12} /> Starting session…
                  </span>
                ) : (
                  'You are browsing as a guest'
                )}
              </p>
            </div>
          </div>

          {uid && (
            <button
              type="button"
              onClick={copyId}
              className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl bg-elevated px-4 py-3 text-left ring-1 ring-line transition active:scale-[0.99]"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-muted">Your guest ID</span>
                <span className="block truncate font-mono text-xs">{uid}</span>
              </span>
              <Icon name="grid" size={16} className="shrink-0 text-muted" />
            </button>
          )}

          <p className="mt-3 text-xs text-muted">
            No signup needed. We only store this anonymous ID — never your name, phone number or
            contacts. Keep this ID handy if you ever contact support about a payment.
          </p>
        </section>

        <section className="card overflow-hidden">
          <h2 className="px-5 pb-2 pt-4 text-xs font-bold uppercase tracking-wide text-muted">
            Safety &amp; policies
          </h2>
          <ul>
            {LINKS.map((link) => (
              <li key={link.to} className="border-t border-line first:border-t-0">
                <Link
                  to={link.to}
                  className="flex items-center gap-3 px-5 py-3.5 transition active:bg-line/40"
                >
                  <Icon name={link.icon} size={18} className="text-muted" />
                  <span className="flex-1 text-[15px] font-medium">{link.label}</span>
                  <Icon name="chevron-right" size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 text-sm">
          <h2 className="text-sm font-bold">Need help?</h2>
          <p className="mt-1 text-muted">
            Email{' '}
            <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold text-brand">
              {BRAND.supportEmail}
            </a>{' '}
            with your guest ID and payment reference.
          </p>
        </section>

        <p className="pb-4 text-center text-[11px] text-muted">
          {BRAND.name} · {LEGAL.ageNotice}
        </p>
      </main>
    </>
  );
}
