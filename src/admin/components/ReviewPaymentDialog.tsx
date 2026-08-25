import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { inputClass } from './AdminField';
import type { PaymentRecord } from '@/types';

/**
 * Manual settlement dialog.
 *
 * With a direct UPI intent there is no gateway to query, so the owner confirms
 * a payment here after seeing it arrive in their bank or UPI app. The reference
 * shown below is the `tr` field sent with the UPI request — the same string
 * that identifies the transfer on the receiving side.
 */
export function ReviewPaymentDialog({
  payment,
  onClose,
  onSubmit,
}: {
  payment: PaymentRecord | null;
  onClose: () => void;
  onSubmit: (params: {
    status: 'verified' | 'failed';
    transactionId: string;
    note: string;
  }) => Promise<void>;
}) {
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState<'verified' | 'failed' | null>(null);

  useEffect(() => {
    setTransactionId(payment?.transactionId ?? '');
    setNote('');
  }, [payment]);

  useEffect(() => {
    if (!payment) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [payment, onClose, submitting]);

  if (!payment || typeof document === 'undefined') return null;

  const run = async (status: 'verified' | 'failed') => {
    setSubmitting(status);
    try {
      await onSubmit({ status, transactionId, note });
    } finally {
      setSubmitting(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/50"
        onClick={submitting ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review payment"
        className="relative w-full max-w-md animate-pop-in rounded-3xl bg-white p-6 shadow-pop"
      >
        <h2 className="text-lg font-bold text-slate-900">Confirm this payment</h2>
        <p className="mt-1 text-sm text-slate-500">
          Check your bank or UPI app for a credit matching this reference, then record the outcome.
        </p>

        <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <Row label="Reference" value={payment.reference} mono />
          <Row label="Amount" value={formatCurrency(payment.amount)} />
          <Row label="Partner" value={payment.profileName || payment.profileId} />
          <Row label="Interaction" value={payment.interactionType} />
          <Row label="Guest" value={payment.userId} mono />
          <Row label="Started" value={formatDateTime(payment.createdAt)} />
        </dl>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            UPI transaction / UTR number
          </span>
          <input
            className={inputClass}
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
            placeholder="e.g. 418912345678"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Optional, but worth recording — it is what your bank will ask for in a dispute.
          </span>
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Note (shown to the user if you reject)
          </span>
          <input
            className={inputClass}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. No matching credit found"
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => run('verified')}
            disabled={submitting !== null}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting === 'verified' && <Spinner size={15} />}
            Money received
          </button>
          <button
            type="button"
            onClick={() => run('failed')}
            disabled={submitting !== null}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {submitting === 'failed' && <Spinner size={15} />}
            Not received
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting !== null}
          className="mt-2.5 h-10 w-full rounded-xl text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right font-semibold text-slate-900 ${
          mono ? 'font-mono text-xs' : 'capitalize'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
