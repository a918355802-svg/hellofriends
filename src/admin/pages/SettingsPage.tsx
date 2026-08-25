import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fetchReports } from '@/services/reports.service';
import { formatDateTime } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { ADMIN_EMAIL, BRAND, PRICING, UPI } from '@/config/brand';
import { firebaseConfig } from '@/config/env';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { ReportRecord } from '@/types';

/**
 * Settings is intentionally read-only for configuration: brand, pricing and
 * payee details live in `src/config/brand.ts` and environment variables so they
 * are versioned and cannot be changed by a compromised admin session.
 */
export default function SettingsPage() {
  const { user } = useAdminAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReports(25)
      .then((next) => !cancelled && setReports(next))
      .catch((cause) => !cancelled && setError(friendlyError(cause, 'Could not load reports.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: { label: string; value: string; note?: string }[] = [
    {
      label: 'Admin email',
      value: ADMIN_EMAIL || 'Not configured',
      note: 'VITE_ADMIN_EMAIL · must match adminEmail() in firestore.rules',
    },
    { label: 'Brand name', value: BRAND.name, note: 'src/config/brand.ts' },
    { label: 'Support email', value: BRAND.supportEmail, note: 'src/config/brand.ts' },
    {
      label: 'Interaction price',
      value: `${PRICING.currencySymbol}${PRICING.amount}`,
      note: 'src/config/brand.ts · server copy in PAYMENT_AMOUNT',
    },
    {
      label: 'UPI payee VPA',
      value: UPI.payeeVpa,
      note: 'src/config/brand.ts · override with VITE_UPI_PAYEE_VPA',
    },
    {
      label: 'Payment confirmation',
      value: 'Manual — confirm each payment in Payments',
      note: 'No gateway: UPI gives websites no automatic callback',
    },
    { label: 'Firebase project', value: firebaseConfig.projectId, note: 'VITE_FIREBASE_PROJECT_ID' },
    { label: 'Storage bucket', value: firebaseConfig.storageBucket, note: 'VITE_FIREBASE_STORAGE_BUCKET' },
    { label: 'Signed in as', value: user?.email ?? '—' },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Configuration reference and safety reports.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-900">
          Configuration
        </h2>
        <dl className="divide-y divide-slate-200">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-2 px-5 py-3.5">
              <dt className="w-48 text-sm font-medium text-slate-600">{row.label}</dt>
              <dd className="min-w-0 flex-1">
                <p className="break-all text-sm font-semibold text-slate-900">{row.value}</p>
                {row.note && (
                  <p className="font-mono text-[11px] text-slate-400">{row.note}</p>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          Payment gateway secrets are server-side only and are never exposed to this dashboard.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-900">
          <Icon name="flag" size={16} className="text-red-500" />
          Profile reports
        </h2>

        {error && <p className="px-5 py-4 text-sm text-red-700">{error}</p>}

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No reports. Users can report any profile from the app.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {reports.map((report) => (
              <li key={report.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {report.reason}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    profile {report.profileId.slice(0, 10)}…
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {formatDateTime(report.createdAt)}
                  </span>
                </div>
                {report.details && (
                  <p className="mt-1.5 text-sm text-slate-600">{report.details}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
