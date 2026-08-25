import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { fetchAdminCounts } from '@/services/admin.service';
import { subscribeToPayments, subscribeToTodayPayments } from '@/services/payments.service';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { adminError } from '@/lib/errors';
import { PaymentStatusPill } from '../components/PaymentStatusPill';
import { TableSkeleton } from '../components/AdminLoading';
import type { AdminCounts, PaymentRecord } from '@/types';

const EMPTY_COUNTS: AdminCounts = {
  totalPartners: null,
  onlinePartners: null,
  offlinePartners: null,
  totalUsers: null,
};

/** A count that could not be read shows a dash, never a made-up zero. */
function countLabel(value: number | null): string {
  return value === null ? '—' : formatNumber(value);
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<AdminCounts>(EMPTY_COUNTS);
  const [today, setToday] = useState<{ count: number; revenue: number } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Aggregate counts have no realtime form, so they are fetched — on mount, and
   * again whenever the tab regains focus. That covers the case that actually
   * happens: the owner adds a partner in another tab and comes back here.
   */
  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchAdminCounts()
        .then(({ counts: next, failures }) => {
          if (cancelled) return;
          setCounts(next);
          setError(failures.length ? adminError(failures[0], 'Some counts could not be read.') : null);
        })
        .catch((cause) => {
          if (!cancelled) setError(adminError(cause, 'Could not load dashboard data.'));
        })
        .finally(() => {
          if (!cancelled) setCountsLoading(false);
        });
    };

    load();
    window.addEventListener('focus', load);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', load);
    };
  }, []);

  // Payments are live: a request opened on a visitor's phone lands here on its
  // own, with no reload.
  useEffect(() => {
    const stopToday = subscribeToTodayPayments(setToday, (cause) =>
      setError(adminError(cause, "Could not read today's payments.")),
    );
    const stopRecent = subscribeToPayments({ status: 'all', from: null, to: null }, 8, (rows) =>
      setPayments(rows),
    );
    return () => {
      stopToday();
      stopRecent();
    };
  }, []);

  const cards: { label: string; value: string; loading: boolean; icon: IconName; tone: string }[] = [
    {
      label: 'Total partners',
      value: countLabel(counts.totalPartners),
      loading: countsLoading,
      icon: 'users',
      tone: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Online now',
      value: countLabel(counts.onlinePartners),
      loading: countsLoading,
      icon: 'check-circle',
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Offline',
      value: countLabel(counts.offlinePartners),
      loading: countsLoading,
      icon: 'ban',
      tone: 'bg-slate-100 text-slate-500',
    },
    {
      label: 'Total users',
      value: countLabel(counts.totalUsers),
      loading: countsLoading,
      icon: 'user',
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Payments today',
      value: formatNumber(today?.count ?? 0),
      loading: today === null,
      icon: 'card',
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Revenue today',
      value: formatCurrency(today?.revenue ?? 0),
      loading: today === null,
      icon: 'sparkle',
      tone: 'bg-rose-50 text-rose-600',
    },
  ];

  const totalPartners = counts.totalPartners ?? 0;
  const onlinePartners = counts.onlinePartners ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of profiles, users and payments. Payments update live.
          </p>
        </div>
        <Link
          to="/admin/partners/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Icon name="plus" size={16} />
          Add partner
        </Link>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <span
              className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}
            >
              <Icon name={card.icon} size={17} />
            </span>
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            {card.loading ? (
              <div className="mt-1.5 h-7 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-xl font-bold text-slate-900">{card.value}</p>
            )}
          </div>
        ))}
      </section>

      {/* Online / offline share — a plain bar reads faster than a chart here. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Partner availability</h2>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-emerald-500 transition-all"
            style={{
              width: `${totalPartners ? (onlinePartners / totalPartners) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="mt-2.5 flex gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Online {countLabel(counts.onlinePartners)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            Offline {countLabel(counts.offlinePartners)}
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Recent payments</h2>
          <Link to="/admin/payments" className="text-sm font-semibold text-slate-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>

            {payments === null ? (
              <TableSkeleton rows={5} cols={6} />
            ) : (
              <tbody>
                {payments.length === 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {payment.userId.slice(0, 10)}…
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {payment.profileName || '—'}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {payment.interactionType}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusPill status={payment.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
