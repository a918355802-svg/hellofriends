import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { BRAND } from '@/config/brand';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/partners', label: 'Partners', icon: 'users' },
  { to: '/admin/payments', label: 'Payments', icon: 'card' },
  { to: '/admin/users', label: 'Users', icon: 'user' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];

/** Desktop-first SaaS chrome: fixed sidebar on large screens, drawer on mobile. */
export function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white">
          <Icon name="heart" size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-white">{BRAND.name}</p>
          <p className="text-[11px] text-slate-400">Admin dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 hover:text-white',
              )
            }
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <p className="truncate px-3 pb-2 text-xs text-slate-400" title={user?.email ?? ''}>
          {user?.email ?? 'Signed in'}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-slate-800/60 hover:text-white"
        >
          <Icon name="logout" size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-60">{sidebar}</div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 animate-fade-in">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Icon name="menu" size={20} />
          </button>
          <span className="font-bold text-slate-900">{BRAND.name} Admin</span>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
