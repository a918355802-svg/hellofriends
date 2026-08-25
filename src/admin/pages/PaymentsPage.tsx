import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { subscribeToPayments, markPaymentDecision } from '@/services/payments.service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { adminError } from '@/lib/errors';
import { useToast } from '@/hooks/useToast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { UPI } from '@/config/brand';
import { PaymentStatusPill } from '../components/PaymentStatusPill';
import { ReviewPaymentDialog } from '../components/ReviewPaymentDialog';
import { TableSkeleton } from '../components/AdminLoading';
import type { PaymentRecord, PaymentStatus } from '@/types';

const selectClass =
  'h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-900';

interface Filters {
  status: PaymentStatus | 'all';
  from: string;
  to: string;
}

// Opens on every payment, newest first. A request shows up here the moment a
// visitor taps Pay — starting on a narrower queue only makes a live list look
// broken, because the newest row is usually not in it yet.
const DEFAULT_FILTERS: Filters = { status: 'all', from: '', to: '' };

const PAGE_SIZE = 25;

export default function PaymentsPage() {
  const toast = useToast();
  const { user } = useAdminAuth();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [windowSize, setWindowSize] = useState(PAGE_SIZE);
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<PaymentRecord | null>(null);

  const query = useMemo(
    () => ({
      status: filters.status,
      from: filters.from ? new Date(`${filters.from}T00:00:00`) : null,
      to: filters.to ? new Date(`${filters.to}T23:59:59`) : null,
    }),
    [filters],
  );

  // Reset the window whenever the filters change, so a filtered view does not
  // inherit a window someone grew on a different one.
  useEffect(() => {
    setWindowSize(PAGE_SIZE);
    setPayments(null);
  }, [query]);

  /**
   * Live subscription rather than a fetch: new requests appear on their own,
   * and a verdict made here is reflected by the same listener, so the table is
   * never patched by hand.
   */
  useEffect(() => {
    setError(null);
    return subscribeToPayments(
      query,
      windowSize,
      (rows, more) => {
        setPayments(rows);
        setHasMore(more);
      },
      (cause) => {
        setPayments([]);
        setError(adminError(cause, 'Could not load payments.'));
      },
    );
  }, [query, windowSize]);

  const loading = payments === null;
  const rows = payments ?? [];

  const submitReview = async ({
    status,
    transactionId,
    note,
  }: {
    status: 'verified' | 'failed';
    transactionId: string;
    note: string;
  }) => {
    if (!reviewing || !user) return;
    try {
      await markPaymentDecision({
        paymentId: reviewing.id,
        status,
        adminUid: user.uid,
        transactionId,
        note,
      });

      // No local patching: the live listener re-renders the row, which keeps
      // the table honest about what was actually written.
      toast.success(
        status === 'verified'
          ? `${reviewing.reference} marked as received. The user sees it immediately.`
          : `${reviewing.reference} marked as not received.`,
      );
      setReviewing(null);
    } catch (cause) {
      toast.error(adminError(cause, 'Could not update this payment.'));
    }
  };

  const verifiedTotal = rows
    .filter((payment) => payment.status === 'verified')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500">
          Payments arrive directly in your UPI account{' '}
          <span className="font-mono text-slate-700">{UPI.payeeVpa}</span>. Match the reference,
          then confirm here.
        </p>
      </header>

      <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
        <p>
          <strong>How confirmation works.</strong> UPI does not tell a website whether a transfer
          succeeded, so nothing is marked Verified automatically. Open your bank or UPI app, find
          the ₹99 credit carrying the reference below, and press <em>Money received</em>. The user's
          screen updates the moment you do.
        </p>
      </div>

      <section className="flex flex-wrap items-end gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Status</span>
          <select
            className={selectClass}
            value={filters.status}
            onChange={(event) =>
              setFilters((f) => ({ ...f, status: event.target.value as Filters['status'] }))
            }
          >
            <option value="all">All</option>
            <option value="pending">Pending review</option>
            <option value="verified">Verified</option>
            <option value="initiated">Initiated</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-600">From</span>
          <input
            type="date"
            className={selectClass}
            value={filters.from}
            onChange={(event) => setFilters((f) => ({ ...f, from: event.target.value }))}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-600">To</span>
          <input
            type="date"
            className={selectClass}
            value={filters.to}
            onChange={(event) => setFilters((f) => ({ ...f, to: event.target.value }))}
          />
        </label>

        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Icon name="refresh" size={15} />
          Reset
        </button>

        <p className="ml-auto text-sm text-slate-600">
          Verified on this page:{' '}
          <span className="font-bold text-slate-900">{formatCurrency(verifiedTotal)}</span>
        </p>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            {loading ? (
              <TableSkeleton rows={8} cols={8} />
            ) : (
              <tbody>
                {rows.length === 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      {filters.status === 'pending'
                        ? 'Nothing waiting for review.'
                        : 'No payments match these filters.'}
                    </td>
                  </tr>
                )}

                {rows.map((payment) => (
                  <tr key={payment.id} className="border-t border-slate-200 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-slate-800">
                        {payment.reference}
                      </p>
                      {payment.transactionId && (
                        <p className="font-mono text-[11px] text-slate-400">
                          UTR {payment.transactionId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {payment.userId.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {payment.profileName || payment.profileId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {payment.interactionType}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusPill status={payment.status} />
                      {payment.failureReason && (
                        <p className="mt-1 max-w-[180px] truncate text-[11px] text-slate-400">
                          {payment.failureReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setReviewing(payment)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Icon name="check" size={13} />
                        {payment.status === 'verified' ? 'Change' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {hasMore && !loading && (
          <div className="flex justify-center border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={() => setWindowSize((size) => size + PAGE_SIZE)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Load more
            </button>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        This app never receives card numbers, UPI PINs or bank credentials — the payment happens
        entirely inside the user's own UPI app.
      </p>

      <ReviewPaymentDialog
        payment={reviewing}
        onClose={() => setReviewing(null)}
        onSubmit={submitReview}
      />
    </div>
  );
}
